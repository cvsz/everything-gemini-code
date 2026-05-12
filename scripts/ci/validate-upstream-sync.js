#!/usr/bin/env node

/**
 * Validate that the upstream baseline SHA referenced in
 * `upstream/README.md` agrees with `upstream/.upstream-sync.json`.
 *
 * Exists because the two files are intentionally kept by hand at sync
 * time — the prose form is human-readable, the JSON is machine-read
 * by the upstream-drift Action. If they fall out of sync, the Action
 * silently tracks a SHA that no longer matches the docs and reviewers
 * looking at `upstream/README.md` see a different baseline than the
 * tracker uses.
 *
 * Exits 0 when the SHAs match, 1 with a specific error when they do
 * not. Wired into `.github/workflows/reusable-validate.yml`.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
// Paths are env-overridable so tests can point them at fixtures without
// touching the real upstream/ folder.
const JSON_PATH = process.env.EGC_UPSTREAM_JSON_PATH
  || path.join(REPO_ROOT, 'upstream', '.upstream-sync.json');
const README_PATH = process.env.EGC_UPSTREAM_README_PATH
  || path.join(REPO_ROOT, 'upstream', 'README.md');

const SHA_RE = /\b[0-9a-f]{40}\b/g;
const LAST_SYNCED_PHRASE = 'Last-synced upstream commit';

function fail(message) {
  console.error(`[validate-upstream-sync] ${message}`);
  process.exit(1);
}

/**
 * Extract the SHA cited as the "Last-synced upstream commit" in
 * upstream/README.md. We do not parse the whole document — we look
 * for the labelled bullet near the top of the Upstream baseline
 * section and pull the first 40-char hex token on that line and the
 * lines that immediately follow (the SHA can appear inside a
 * markdown link, so we tolerate it being on the same or next line).
 *
 * @param {string} readmeSource
 * @returns {string|null}
 */
function extractReadmeSha(readmeSource) {
  const lines = readmeSource.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!lines[i].includes(LAST_SYNCED_PHRASE)) continue;
    const window = lines.slice(i, i + 3).join(' ');
    const match = window.match(SHA_RE);
    if (match && match.length > 0) {
      return match[0];
    }
    return null;
  }
  return null;
}

function main() {
  let stateRaw;
  try {
    stateRaw = fs.readFileSync(JSON_PATH, 'utf8');
  } catch (err) {
    fail(`Could not read ${JSON_PATH}: ${err.message}`);
  }

  let state;
  try {
    state = JSON.parse(stateRaw);
  } catch (err) {
    fail(`${JSON_PATH} is not valid JSON: ${err.message}`);
  }

  if (typeof state.lastSyncedSha !== 'string' || !/^[0-9a-f]{40}$/.test(state.lastSyncedSha)) {
    fail(`${JSON_PATH}: lastSyncedSha is not a 40-char hex string (got: ${JSON.stringify(state.lastSyncedSha)})`);
  }

  let readmeSource;
  try {
    readmeSource = fs.readFileSync(README_PATH, 'utf8');
  } catch (err) {
    fail(`Could not read ${README_PATH}: ${err.message}`);
  }

  const readmeSha = extractReadmeSha(readmeSource);
  if (!readmeSha) {
    fail(`${README_PATH}: could not find a SHA near "${LAST_SYNCED_PHRASE}". The README must cite the same commit as upstream/.upstream-sync.json.`);
  }

  if (readmeSha !== state.lastSyncedSha) {
    fail(
      `Baseline SHA mismatch between README and JSON.\n` +
        `  upstream/README.md           → ${readmeSha}\n` +
        `  upstream/.upstream-sync.json → ${state.lastSyncedSha}\n` +
        `\nWhen recording a sync, update both files (see upstream/README.md "Recording a sync").`,
    );
  }

  console.log(`[validate-upstream-sync] OK — both files reference ${state.lastSyncedSha.slice(0, 7)}`);
}

if (require.main === module) {
  main();
}

module.exports = { extractReadmeSha };
