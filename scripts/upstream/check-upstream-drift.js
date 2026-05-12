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
 *   - Uses `gh api` for upstream reads (public repo, no PAT needed).
 *   - Exits 0 on success and on tolerated upstream errors (rename,
 *     archive, deletion) so weekly cron does not produce red runs that
 *     nobody triages.
 *   - Exits non-zero only on programmer errors (malformed state file).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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
 * Invoke `gh api` and return the parsed JSON response, or null when the
 * upstream is unreachable (rename/archive/deletion). Other errors throw.
 *
 * @param {string} endpoint - path like "repos/owner/repo/compare/A...B"
 * @returns {object|null}
 */
function ghApi(endpoint) {
  let stdout;
  try {
    stdout = execSync(`gh api ${endpoint}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      // The compare endpoint can return well over 1 MB of JSON when
      // the delta includes hundreds of commits. Default maxBuffer is
      // 1 MB and the process is killed with SIGTERM on overflow.
      maxBuffer: 50 * 1024 * 1024,
    });
  } catch (err) {
    const stderr = (err.stderr || '').toString();
    if (stderr.includes('HTTP 404') || stderr.includes('Not Found')) {
      warn(`Upstream unreachable for endpoint "${endpoint}". Treating as tolerated failure.`);
      return null;
    }
    throw new Error(`gh api failed for "${endpoint}": ${stderr || err.message}`, { cause: err });
  }
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`gh api returned non-JSON for "${endpoint}": ${err.message}`, { cause: err });
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
  const endpoint = `repos/${state.upstream}/compare/${state.lastSyncedSha}...HEAD`;
  const compare = ghApi(endpoint);

  if (compare === null) {
    // Tolerated: rename/archive/deletion. Phase 2 will optionally
    // post a comment on the existing tracking issue if there is one.
    process.exit(0);
  }

  summarize(state, compare);
}

if (require.main === module) {
  main();
}

module.exports = { readState, ghApi, summarize };
