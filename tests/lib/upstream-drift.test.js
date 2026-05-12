/**
 * Tests for scripts/lib/upstream-drift.js
 *
 * Run with: node tests/lib/upstream-drift.test.js
 */

const assert = require('assert');
const lib = require('../../scripts/lib/upstream-drift');

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

const VALID_STATE = JSON.stringify({
  upstream: 'affaan-m/everything-claude-code',
  lastSyncedSha: '9db98673d054f5ed0991ba9d67ff4c883c81a42f',
  lastSyncedAt: '2026-02-09',
  notes: 'optional',
});

console.log('\n=== Testing upstream-drift.js ===\n');

// parseUpstreamState

test('parseUpstreamState accepts a well-formed state file', () => {
  const state = lib.parseUpstreamState(VALID_STATE);
  assert.strictEqual(state.upstream, 'affaan-m/everything-claude-code');
  assert.strictEqual(state.lastSyncedSha, '9db98673d054f5ed0991ba9d67ff4c883c81a42f');
  assert.strictEqual(state.lastSyncedAt, '2026-02-09');
  assert.strictEqual(state.notes, 'optional');
});

test('parseUpstreamState accepts state without notes', () => {
  const json = JSON.stringify({
    upstream: 'a/b',
    lastSyncedSha: '0'.repeat(40),
    lastSyncedAt: '2026-01-01',
  });
  const state = lib.parseUpstreamState(json);
  assert.strictEqual(state.notes, undefined);
});

test('parseUpstreamState throws on malformed JSON', () => {
  assert.throws(() => lib.parseUpstreamState('{not json'), /not valid JSON/);
});

test('parseUpstreamState throws on non-object root', () => {
  assert.throws(() => lib.parseUpstreamState('[]'), /must be a JSON object/);
  assert.throws(() => lib.parseUpstreamState('null'), /must be a JSON object/);
  assert.throws(() => lib.parseUpstreamState('"a string"'), /must be a JSON object/);
});

test('parseUpstreamState rejects bad upstream values', () => {
  const bad = JSON.stringify({
    upstream: 'no-slash',
    lastSyncedSha: '0'.repeat(40),
    lastSyncedAt: '2026-01-01',
  });
  assert.throws(() => lib.parseUpstreamState(bad), /owner\/repo/);
});

test('parseUpstreamState rejects short or non-hex SHAs', () => {
  const short = JSON.stringify({
    upstream: 'a/b',
    lastSyncedSha: 'abc',
    lastSyncedAt: '2026-01-01',
  });
  assert.throws(() => lib.parseUpstreamState(short), /40-char hex/);

  const nonHex = JSON.stringify({
    upstream: 'a/b',
    lastSyncedSha: 'z'.repeat(40),
    lastSyncedAt: '2026-01-01',
  });
  assert.throws(() => lib.parseUpstreamState(nonHex), /40-char hex/);
});

test('parseUpstreamState rejects empty lastSyncedAt', () => {
  const bad = JSON.stringify({
    upstream: 'a/b',
    lastSyncedSha: '0'.repeat(40),
    lastSyncedAt: '',
  });
  assert.throws(() => lib.parseUpstreamState(bad), /non-empty string/);
});

test('parseUpstreamState rejects non-string notes', () => {
  const bad = JSON.stringify({
    upstream: 'a/b',
    lastSyncedSha: '0'.repeat(40),
    lastSyncedAt: '2026-01-01',
    notes: 42,
  });
  assert.throws(() => lib.parseUpstreamState(bad), /notes.*must be a string/);
});

// shortSha

test('shortSha returns the first 7 chars', () => {
  assert.strictEqual(lib.shortSha('9db98673d054f5ed0991ba9d67ff4c883c81a42f'), '9db9867');
});

test('shortSha returns "" for non-string input', () => {
  assert.strictEqual(lib.shortSha(undefined), '');
  assert.strictEqual(lib.shortSha(null), '');
  assert.strictEqual(lib.shortSha(123), '');
});

// formatIssueTitle

test('formatIssueTitle pluralizes correctly for 0/1/many', () => {
  assert.strictEqual(
    lib.formatIssueTitle({ count: 0, lastSyncedShaShort: '9db9867' }),
    'Upstream sync: 0 new commits in ECC since 9db9867',
  );
  assert.strictEqual(
    lib.formatIssueTitle({ count: 1, lastSyncedShaShort: '9db9867' }),
    'Upstream sync: 1 new commit in ECC since 9db9867',
  );
  assert.strictEqual(
    lib.formatIssueTitle({ count: 5, lastSyncedShaShort: '9db9867' }),
    'Upstream sync: 5 new commits in ECC since 9db9867',
  );
});

test('formatIssueTitle rejects negative or non-integer counts', () => {
  assert.throws(() => lib.formatIssueTitle({ count: -1, lastSyncedShaShort: 'x' }), /non-negative integer/);
  assert.throws(() => lib.formatIssueTitle({ count: 1.5, lastSyncedShaShort: 'x' }), /non-negative integer/);
});

test('formatIssueTitle rejects empty shortSha', () => {
  assert.throws(() => lib.formatIssueTitle({ count: 1, lastSyncedShaShort: '' }), /non-empty/);
});

// formatIssueBody

test('formatIssueBody includes baseline, head, compare URL', () => {
  const body = lib.formatIssueBody({
    commits: [{ sha: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111', author: 'octocat', message: 'fix: something\n\nbody' }],
    lastSyncedSha: '9db98673d054f5ed0991ba9d67ff4c883c81a42f',
    upstreamHeadSha: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
    upstreamRepo: 'affaan-m/everything-claude-code',
  });
  assert.ok(body.includes('9db9867'), 'should contain baseline short sha');
  assert.ok(body.includes('bbbb222'), 'should contain head short sha');
  assert.ok(body.includes('https://github.com/affaan-m/everything-claude-code/compare/9db98673d054f5ed0991ba9d67ff4c883c81a42f...bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222'));
  assert.ok(body.includes('@octocat'));
  assert.ok(body.includes('fix: something'));
  assert.ok(!body.includes('body'), 'should not include commit message body, only first line');
});

test('formatIssueBody handles empty commit list', () => {
  const body = lib.formatIssueBody({
    commits: [],
    lastSyncedSha: '0'.repeat(40),
    upstreamHeadSha: '1'.repeat(40),
    upstreamRepo: 'a/b',
  });
  assert.ok(body.includes('_No commits to show._'));
});

test('formatIssueBody truncates beyond COMMIT_BODY_LIMIT', () => {
  const many = [];
  for (let i = 0; i < lib.COMMIT_BODY_LIMIT + 25; i += 1) {
    many.push({
      sha: i.toString(16).padStart(40, '0'),
      author: 'a',
      message: `msg ${i}`,
    });
  }
  const body = lib.formatIssueBody({
    commits: many,
    lastSyncedSha: '0'.repeat(40),
    upstreamHeadSha: '1'.repeat(40),
    upstreamRepo: 'a/b',
  });
  assert.ok(body.includes('… and 25 more'));
  assert.ok(body.includes(`(${lib.COMMIT_BODY_LIMIT + 25} total`));
  assert.ok(!body.includes(`msg ${lib.COMMIT_BODY_LIMIT + 24}`), 'last commit should not be rendered');
});

test('formatIssueBody rejects non-array commits', () => {
  assert.throws(
    () => lib.formatIssueBody({ commits: null, lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'a/b' }),
    /must be an array/,
  );
});

test('formatIssueBody rejects malformed upstreamRepo', () => {
  assert.throws(
    () => lib.formatIssueBody({ commits: [], lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'no-slash' }),
    /owner\/repo/,
  );
});

// compareUrl

test('compareUrl builds the expected GitHub URL', () => {
  assert.strictEqual(
    lib.compareUrl('a/b', 'base', 'head'),
    'https://github.com/a/b/compare/base...head',
  );
});

test('compareUrl rejects malformed repo', () => {
  assert.throws(() => lib.compareUrl('no-slash', 'b', 'h'), /owner\/repo/);
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed === 0 ? 0 : 1);
