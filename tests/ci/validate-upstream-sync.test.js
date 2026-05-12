#!/usr/bin/env node
/**
 * Tests for scripts/ci/validate-upstream-sync.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCRIPT_PATH = path.join(__dirname, '..', '..', 'scripts', 'ci', 'validate-upstream-sync.js');
const { extractReadmeSha } = require('../../scripts/ci/validate-upstream-sync');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    failed += 1;
  }
}

const VALID_SHA = '9db98673d054f5ed0991ba9d67ff4c883c81a42f';
const OTHER_SHA = 'a8836d7bbd8b4b4745bb00608203887a8267d630';

const README_TEMPLATE = (sha) => `# Upstream Sync Policy

Some intro prose here.

## Upstream baseline

- **Upstream repository**: [\`affaan-m/everything-claude-code\`](https://github.com/affaan-m/everything-claude-code)
- **Last-synced upstream commit**: [\`${sha}\`](https://github.com/affaan-m/everything-claude-code/commit/${sha})
- **Last-synced date**: 2026-02-09

Trailing prose.
`;

const JSON_TEMPLATE = (sha) => JSON.stringify({
  upstream: 'affaan-m/everything-claude-code',
  lastSyncedSha: sha,
  lastSyncedAt: '2026-02-09',
}, null, 2);

function runValidator({ json, readme }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'egc-validate-upstream-sync-'));
  const jsonPath = path.join(tempDir, '.upstream-sync.json');
  const readmePath = path.join(tempDir, 'README.md');
  fs.writeFileSync(jsonPath, json);
  fs.writeFileSync(readmePath, readme);

  try {
    return spawnSync('node', [SCRIPT_PATH], {
      encoding: 'utf8',
      env: {
        ...process.env,
        EGC_UPSTREAM_JSON_PATH: jsonPath,
        EGC_UPSTREAM_README_PATH: readmePath,
      },
    });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

console.log('\n=== Testing validate-upstream-sync ===\n');

// extractReadmeSha (pure)

test('extractReadmeSha finds the SHA on the Last-synced line', () => {
  const sha = extractReadmeSha(README_TEMPLATE(VALID_SHA));
  assert.strictEqual(sha, VALID_SHA);
});

test('extractReadmeSha tolerates link wrapper', () => {
  const src = `## Upstream baseline\n- **Last-synced upstream commit**:\n  [\`${VALID_SHA}\`](https://x/y/commit/${VALID_SHA})\n`;
  assert.strictEqual(extractReadmeSha(src), VALID_SHA);
});

test('extractReadmeSha returns null when the phrase is missing', () => {
  assert.strictEqual(extractReadmeSha('# README\nno baseline here'), null);
});

test('extractReadmeSha returns null when phrase is present but no SHA nearby', () => {
  const src = 'Last-synced upstream commit\n\n(no sha for a few lines)\n\n\n\nthen-a-bare-sha 9db98673d054f5ed0991ba9d67ff4c883c81a42f';
  assert.strictEqual(extractReadmeSha(src), null);
});

// Integration: spawn the script with env-overridden paths

test('exits 0 when SHAs match', () => {
  const result = runValidator({
    json: JSON_TEMPLATE(VALID_SHA),
    readme: README_TEMPLATE(VALID_SHA),
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /OK/);
});

test('exits 1 when SHAs disagree', () => {
  const result = runValidator({
    json: JSON_TEMPLATE(VALID_SHA),
    readme: README_TEMPLATE(OTHER_SHA),
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /mismatch/i);
  assert.match(result.stderr, new RegExp(VALID_SHA));
  assert.match(result.stderr, new RegExp(OTHER_SHA));
});

test('exits 1 when README has no baseline line', () => {
  const result = runValidator({
    json: JSON_TEMPLATE(VALID_SHA),
    readme: '# No baseline here\n',
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /could not find/i);
});

test('exits 1 when JSON is malformed', () => {
  const result = runValidator({
    json: '{not json',
    readme: README_TEMPLATE(VALID_SHA),
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /not valid JSON/);
});

test('exits 1 when JSON lastSyncedSha is malformed', () => {
  const result = runValidator({
    json: JSON.stringify({
      upstream: 'a/b',
      lastSyncedSha: 'too-short',
      lastSyncedAt: '2026-01-01',
    }),
    readme: README_TEMPLATE(VALID_SHA),
  });
  assert.strictEqual(result.status, 1);
  assert.match(result.stderr, /40-char hex/);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed === 0 ? 0 : 1);
