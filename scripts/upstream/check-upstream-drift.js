#!/usr/bin/env node

/**
 * Upstream drift detector — Phase 2 (rolling tracking issue).
 *
 * Reads `upstream/.upstream-sync.json`, asks the GitHub API how many
 * commits the upstream repo is ahead of the recorded baseline, and
 * maintains a single rolling tracking issue labelled `🔄 Upstream Sync`
 * that reflects the current drift state.
 *
 * Action matrix:
 *   delta=0, no issue   → noop
 *   delta=0, open issue → close (sync happened upstream-side)
 *   delta>0, no issue   → create
 *   delta>0, open issue → update title/body to reflect current count
 *
 * Designed to run in `.github/workflows/upstream-drift.yml`:
 *   - Uses `gh api` and `gh issue ...` via execFileSync (argv array —
 *     no shell parsing).
 *   - Exits 0 on success and on tolerated upstream errors (the repo
 *     itself was renamed/archived/deleted) so weekly cron does not
 *     produce red runs nobody triages.
 *   - Exits non-zero on programmer/config errors: a malformed state
 *     file, or a baseline SHA that doesn't exist in an otherwise
 *     reachable upstream repo (almost always a typo).
 *
 * The workflow also runs an `if: failure()` step that maintains a
 * separate `⚠ Upstream Sync Failure` issue so the action's own health
 * is visible the same way drift is.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const lib = require('../lib/upstream-drift');

const REPO_ROOT = path.join(__dirname, '..', '..');
const STATE_PATH = path.join(REPO_ROOT, 'upstream', '.upstream-sync.json');
const UPSTREAM_SYNC_LABEL = '🔄 Upstream Sync';

function log(message) {
  console.log(`[upstream-drift] ${message}`);
}

function warn(message) {
  console.error(`[upstream-drift] ${message}`);
}

function readState() {
  let raw;
  try {
    raw = fs.readFileSync(STATE_PATH, 'utf8');
  } catch (err) {
    throw new Error(`Could not read state file at ${STATE_PATH}: ${err.message}`, { cause: err });
  }
  return lib.parseUpstreamState(raw);
}

/**
 * Invoke `gh api` for the given endpoint and return the parsed JSON.
 * 404s are surfaced as a typed error (`err.is404 === true`).
 *
 * @param {string} endpoint - path like "repos/owner/repo/compare/A...B"
 * @returns {object}
 */
function ghApi(endpoint) {
  let stdout;
  try {
    stdout = execFileSync('gh', ['api', endpoint], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // Compare responses can exceed Node's default 1 MB buffer when
      // the delta is large; SIGTERMs the child on overflow.
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    const stderr = (err.stderr || '').toString();
    const is404 = stderr.includes('HTTP 404') || stderr.includes('Not Found');
    const apiError = new Error(`gh api failed for "${endpoint}": ${stderr || err.message}`, { cause: err });
    apiError.stderr = stderr;
    apiError.is404 = is404;
    throw apiError;
  }
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`gh api returned non-JSON for "${endpoint}": ${err.message}`, { cause: err });
  }
}

function isUpstreamReachable(repo) {
  try {
    ghApi(`repos/${repo}`);
    return true;
  } catch (err) {
    if (err.is404) {
      warn(`Upstream repo "${repo}" returned 404. Treating as tolerated upstream-unreachable (rename, archive, or deletion).`);
      return false;
    }
    throw err;
  }
}

/**
 * Resolve the upstream HEAD SHA from a compare response. The compare
 * API returns the *new* commits in `commits[]`; the last one is HEAD.
 * If there is no delta, fall back to the recorded baseline.
 *
 * @param {object} compare
 * @param {string} fallbackSha
 * @returns {string}
 */
function getHeadSha(compare, fallbackSha) {
  if (compare && Array.isArray(compare.commits) && compare.commits.length > 0) {
    return compare.commits[compare.commits.length - 1].sha;
  }
  return fallbackSha;
}

function summarize(state, compare) {
  const status = compare.status;
  const ahead = compare.ahead_by;
  const behind = compare.behind_by;
  const headSha = getHeadSha(compare, state.lastSyncedSha);

  log(`Status: ${status} (ahead_by=${ahead}, behind_by=${behind})`);
  log(`Baseline: ${lib.shortSha(state.lastSyncedSha)} (recorded ${state.lastSyncedAt})`);
  log(`Upstream HEAD: ${lib.shortSha(headSha)}`);
  log(`Compare: ${lib.compareUrl(state.upstream, state.lastSyncedSha, headSha)}`);
}

function listUpstreamSyncIssues() {
  const stdout = execFileSync(
    'gh',
    ['issue', 'list', '--label', UPSTREAM_SYNC_LABEL, '--state', 'open', '--json', 'number,title,createdAt'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout);
}

function createTrackingIssue(title, body) {
  log(`Creating tracking issue: "${title}"`);
  execFileSync(
    'gh',
    ['issue', 'create', '--label', UPSTREAM_SYNC_LABEL, '--title', title, '--body', body],
    { stdio: 'inherit' },
  );
}

function updateTrackingIssue(number, title, body) {
  log(`Updating tracking issue #${number}: "${title}"`);
  execFileSync(
    'gh',
    ['issue', 'edit', String(number), '--title', title, '--body', body],
    { stdio: 'inherit' },
  );
}

function closeTrackingIssue(number, upstreamRepo) {
  const comment = `Closed automatically: \`upstream/.upstream-sync.json\` is now in sync with \`${upstreamRepo}\` HEAD.`;
  log(`Closing tracking issue #${number}`);
  execFileSync(
    'gh',
    ['issue', 'close', String(number), '--comment', comment],
    { stdio: 'inherit' },
  );
}

function buildIssueContent(state, compare) {
  const headSha = getHeadSha(compare, state.lastSyncedSha);
  const commits = lib.extractCommitsForBody(compare);
  const title = lib.formatIssueTitle({
    count: compare.ahead_by,
    lastSyncedShaShort: lib.shortSha(state.lastSyncedSha),
  });
  const body = lib.formatIssueBody({
    commits,
    lastSyncedSha: state.lastSyncedSha,
    upstreamHeadSha: headSha,
    upstreamRepo: state.upstream,
  });
  return { title, body };
}

function main() {
  let state;
  try {
    state = readState();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  log(`Upstream: ${state.upstream}`);

  if (!isUpstreamReachable(state.upstream)) {
    process.exit(0);
  }

  const endpoint = `repos/${state.upstream}/compare/${state.lastSyncedSha}...HEAD`;
  let compare;
  try {
    compare = ghApi(endpoint);
  } catch (err) {
    if (err.is404) {
      console.error(
        `Baseline SHA "${state.lastSyncedSha}" is not reachable in ${state.upstream}. ` +
          `Check upstream/.upstream-sync.json — the SHA may be malformed or refer to a commit ` +
          `that was force-removed from the upstream history.`,
      );
      process.exit(1);
    }
    console.error(err.message);
    process.exit(1);
  }

  summarize(state, compare);

  const openIssues = listUpstreamSyncIssues();
  const activeIssue = lib.pickActiveIssue(openIssues);
  if (openIssues.length > 1) {
    warn(`Found ${openIssues.length} open "${UPSTREAM_SYNC_LABEL}" issues — operating on #${activeIssue.number} (most recent).`);
  }

  const action = lib.decideAction({ deltaCount: compare.ahead_by, openIssue: activeIssue });
  log(`Action: ${action}`);

  switch (action) {
    case 'noop':
      log('In sync, no tracking issue to manage.');
      break;
    case 'close':
      closeTrackingIssue(activeIssue.number, state.upstream);
      break;
    case 'create': {
      const { title, body } = buildIssueContent(state, compare);
      createTrackingIssue(title, body);
      break;
    }
    case 'update': {
      const { title, body } = buildIssueContent(state, compare);
      updateTrackingIssue(activeIssue.number, title, body);
      break;
    }
    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  UPSTREAM_SYNC_LABEL,
  readState,
  ghApi,
  isUpstreamReachable,
  summarize,
  buildIssueContent,
  listUpstreamSyncIssues,
  createTrackingIssue,
  updateTrackingIssue,
  closeTrackingIssue,
};
