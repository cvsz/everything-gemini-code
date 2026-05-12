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
    totalCount: 1,
  });
  assert.ok(body.includes('9db9867'), 'should contain baseline short sha');
  assert.ok(body.includes('bbbb222'), 'should contain head short sha');
  assert.ok(body.includes('https://github.com/affaan-m/everything-claude-code/compare/9db98673d054f5ed0991ba9d67ff4c883c81a42f...bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222'));
  assert.ok(body.includes('@octocat'));
  assert.ok(body.includes('fix: something'));
  assert.ok(!body.includes('body'), 'should not include commit message body, only first line');
});

test('formatIssueBody handles empty commit list (totalCount=0)', () => {
  const body = lib.formatIssueBody({
    commits: [],
    lastSyncedSha: '0'.repeat(40),
    upstreamHeadSha: '1'.repeat(40),
    upstreamRepo: 'a/b',
    totalCount: 0,
  });
  assert.ok(body.includes('_No commits to show._'));
  assert.ok(body.includes('**0**'));
});

test('formatIssueBody truncates display beyond COMMIT_BODY_LIMIT (totalCount === commits.length)', () => {
  const many = [];
  const N = lib.COMMIT_BODY_LIMIT + 25;
  for (let i = 0; i < N; i += 1) {
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
    totalCount: N,
  });
  assert.ok(body.includes('… and 25 more'));
  assert.ok(body.includes(`showing first ${lib.COMMIT_BODY_LIMIT} of ${N}`));
  assert.ok(!body.includes(`msg ${N - 1}`), 'last commit should not be rendered');
});

test('formatIssueBody uses totalCount when API caps commits (totalCount > commits.length)', () => {
  // Real-world case: ahead_by=1521 but compare endpoint capped commits[] at 250.
  // Intro and summary must report 1521, not 250.
  const commits = [];
  for (let i = 0; i < 250; i += 1) {
    commits.push({
      sha: i.toString(16).padStart(40, '0'),
      author: 'a',
      message: `msg ${i}`,
    });
  }
  const body = lib.formatIssueBody({
    commits,
    lastSyncedSha: '0'.repeat(40),
    upstreamHeadSha: '1'.repeat(40),
    upstreamRepo: 'a/b',
    totalCount: 1521,
  });
  assert.ok(body.includes('**1521** commit(s) ahead'), 'intro should use totalCount, not commits.length');
  assert.ok(body.includes(`showing first ${lib.COMMIT_BODY_LIMIT} of 1521`), 'summary should reference totalCount');
  assert.ok(body.includes(`… and ${1521 - lib.COMMIT_BODY_LIMIT} more`), 'truncation must reflect totalCount');
  assert.ok(!body.includes('250'), 'API window size 250 should never appear in the body');
});

test('formatIssueBody omits the truncation line when total fits in display', () => {
  const commits = [
    { sha: 'a'.repeat(40), author: 'x', message: 'm1' },
    { sha: 'b'.repeat(40), author: 'y', message: 'm2' },
  ];
  const body = lib.formatIssueBody({
    commits,
    lastSyncedSha: '0'.repeat(40),
    upstreamHeadSha: '1'.repeat(40),
    upstreamRepo: 'a/b',
    totalCount: 2,
  });
  assert.ok(body.includes('Commits (2)'), 'summary should be the simple form when nothing is omitted');
  assert.ok(!body.includes('more.'), 'no truncation note when omitted === 0');
});

test('formatIssueBody rejects non-array commits', () => {
  assert.throws(
    () => lib.formatIssueBody({ commits: null, lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'a/b', totalCount: 0 }),
    /must be an array/,
  );
});

test('formatIssueBody rejects malformed upstreamRepo', () => {
  assert.throws(
    () => lib.formatIssueBody({ commits: [], lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'no-slash', totalCount: 0 }),
    /owner\/repo/,
  );
});

test('formatIssueBody rejects non-integer or negative totalCount', () => {
  assert.throws(
    () => lib.formatIssueBody({ commits: [], lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'a/b', totalCount: -1 }),
    /non-negative integer/,
  );
  assert.throws(
    () => lib.formatIssueBody({ commits: [], lastSyncedSha: '0', upstreamHeadSha: '1', upstreamRepo: 'a/b', totalCount: 1.5 }),
    /non-negative integer/,
  );
});

// extractCommitsForBody

test('extractCommitsForBody flattens the compare API shape', () => {
  const compare = {
    commits: [
      {
        sha: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
        author: { login: 'octocat' },
        commit: { author: { name: 'Real Name' }, message: 'fix: thing\n\nbody' },
      },
      {
        sha: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
        author: null,
        commit: { author: { name: 'Raw Name' }, message: 'feat: thing 2' },
      },
      {
        sha: 'cccc3333cccc3333cccc3333cccc3333cccc3333',
        author: null,
        commit: { message: 'orphaned author' },
      },
    ],
  };
  const out = lib.extractCommitsForBody(compare);
  assert.strictEqual(out.length, 3);
  assert.strictEqual(out[0].author, 'octocat');
  // Commits without a GitHub login (only a raw git author name) must
  // leave author empty — otherwise the body would render misleading
  // pseudo-mentions like "(@Jane Doe)".
  assert.strictEqual(out[1].author, '');
  assert.strictEqual(out[2].author, '');
  assert.strictEqual(out[0].message, 'fix: thing\n\nbody');
});

test('extractCommitsForBody returns [] for missing or malformed input', () => {
  assert.deepStrictEqual(lib.extractCommitsForBody(null), []);
  assert.deepStrictEqual(lib.extractCommitsForBody({}), []);
  assert.deepStrictEqual(lib.extractCommitsForBody({ commits: 'not array' }), []);
});

// pickActiveIssue

test('pickActiveIssue returns null when no issues are open', () => {
  assert.strictEqual(lib.pickActiveIssue([]), null);
  assert.strictEqual(lib.pickActiveIssue(null), null);
  assert.strictEqual(lib.pickActiveIssue(undefined), null);
});

test('pickActiveIssue returns the single open issue', () => {
  const only = { number: 42, title: 't', createdAt: '2026-05-01T00:00:00Z' };
  assert.strictEqual(lib.pickActiveIssue([only]), only);
});

test('pickActiveIssue picks the most recently created when multiple are open', () => {
  const older = { number: 1, title: 'older', createdAt: '2026-04-01T00:00:00Z' };
  const newer = { number: 2, title: 'newer', createdAt: '2026-05-01T00:00:00Z' };
  assert.strictEqual(lib.pickActiveIssue([older, newer]).number, 2);
  assert.strictEqual(lib.pickActiveIssue([newer, older]).number, 2);
});

// decideAction

test('decideAction: delta=0 + no issue → noop', () => {
  assert.strictEqual(lib.decideAction({ deltaCount: 0, openIssue: null }), 'noop');
});

test('decideAction: delta=0 + open issue → close', () => {
  assert.strictEqual(lib.decideAction({ deltaCount: 0, openIssue: { number: 1 } }), 'close');
});

test('decideAction: delta>0 + no issue → create', () => {
  assert.strictEqual(lib.decideAction({ deltaCount: 3, openIssue: null }), 'create');
});

test('decideAction: delta>0 + open issue → update', () => {
  assert.strictEqual(lib.decideAction({ deltaCount: 3, openIssue: { number: 1 } }), 'update');
});

test('decideAction rejects non-integer or negative deltaCount', () => {
  assert.throws(() => lib.decideAction({ deltaCount: -1, openIssue: null }), /non-negative integer/);
  assert.throws(() => lib.decideAction({ deltaCount: 1.5, openIssue: null }), /non-negative integer/);
  assert.throws(() => lib.decideAction({ deltaCount: '3', openIssue: null }), /non-negative integer/);
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
