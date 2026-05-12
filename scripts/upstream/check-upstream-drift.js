#!/usr/bin/env node

/**
 * Upstream drift detector — Phase 1 (log-only).
 *
 * Reads `upstream/.upstream-sync.json`, asks the GitHub API how many
 * commits the upstream repo is ahead of the recorded baseline, and logs
 * the result. Does NOT create or update GitHub issues yet — that lands
 * in Phase 2.
 *
 * Designed to run in `.github/workflows/upstream-drift.yml`:
 *   - Uses `gh api` via execFileSync (argv array — no shell parsing).
 *   - Exits 0 on success and on tolerated upstream errors (the repo
 *     itself was renamed/archived/deleted) so weekly cron does not
 *     produce red runs nobody triages.
 *   - Exits non-zero on programmer/config errors: a malformed state
 *     file, or a baseline SHA that doesn't exist in an otherwise
 *     reachable upstream repo (almost always a typo).
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const lib = require('../lib/upstream-drift');

const REPO_ROOT = path.join(__dirname, '..', '..');
const STATE_PATH = path.join(REPO_ROOT, 'upstream', '.upstream-sync.json');

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
 * Uses execFileSync with an argv array so the endpoint never reaches
 * a shell — defense-in-depth against future inputs that might bypass
 * the JSON-schema validation upstream.
 *
 * 404s are surfaced as a typed error (`err.is404 === true`) so callers
 * can distinguish tolerable cases (upstream repo gone) from hard
 * failures (invalid baseline SHA against a repo that does exist).
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
      // The compare endpoint can return well over 1 MB of JSON when
      // the delta includes hundreds of commits. Default maxBuffer is
      // 1 MB and the process is killed with SIGTERM on overflow.
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

/**
 * Pre-flight: check whether the upstream repo itself is reachable. A
 * 404 here genuinely means "rename / archive / deletion" — a tolerable
 * config drift the workflow should warn about, not fail on. A 404 on
 * the *compare* endpoint after this check passes is a hard error
 * (almost certainly a malformed `lastSyncedSha`).
 *
 * @param {string} repo - "owner/repo"
 * @returns {boolean} true if reachable; false if the repo returns 404
 */
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

function summarize(state, compare) {
  const status = compare.status;
  const ahead = compare.ahead_by;
  const behind = compare.behind_by;
  const headSha = compare.commits && compare.commits.length > 0
    ? compare.commits[compare.commits.length - 1].sha
    : state.lastSyncedSha;

  log(`Status: ${status} (ahead_by=${ahead}, behind_by=${behind})`);
  log(`Baseline: ${lib.shortSha(state.lastSyncedSha)} (recorded ${state.lastSyncedAt})`);
  log(`Upstream HEAD: ${lib.shortSha(headSha)}`);
  log(`Compare: ${lib.compareUrl(state.upstream, state.lastSyncedSha, headSha)}`);

  if (status === 'identical' || ahead === 0) {
    log('No drift — baseline matches upstream HEAD.');
    return;
  }

  if (status === 'ahead' || status === 'diverged') {
    log(`Drift detected: upstream is ${ahead} commit(s) ahead.`);
    return;
  }

  if (status === 'behind') {
    log('Baseline is ahead of upstream HEAD — likely a manual cherry-pick or upstream reset.');
    return;
  }

  log(`Unknown compare status "${status}" — surfacing as drift for review.`);
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

  // Pre-flight: if the repo itself is 404, treat it as tolerable
  // (rename/archive/deletion) and exit 0. Phase 2 will optionally post
  // a comment on the existing tracking issue in this branch.
  if (!isUpstreamReachable(state.upstream)) {
    process.exit(0);
  }

  // Repo exists. A 404 on the compare endpoint now means the recorded
  // baseline SHA is not reachable in the upstream repo — almost always
  // a typo in upstream/.upstream-sync.json. Fail loudly so the
  // operator notices.
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
}

if (require.main === module) {
  main();
}

module.exports = { readState, ghApi, isUpstreamReachable, summarize };
