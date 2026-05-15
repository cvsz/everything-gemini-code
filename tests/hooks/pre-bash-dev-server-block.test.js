/**
 * Tests for scripts/hooks/pre-bash-dev-server-block.js
 *
 * Invokes the hook script directly via stdin (Gemini CLI BeforeTool runs
 * hooks as standalone Node processes). Same harness shape as
 * tests/hooks/block-no-verify.test.js.
 */

'use strict';

const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');

const HOOK = path.join(__dirname, '..', '..', 'scripts', 'hooks', 'pre-bash-dev-server-block.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function runHook(input) {
  const rawInput = typeof input === 'string' ? input : JSON.stringify(input);
  const result = spawnSync('node', [HOOK], {
    input: rawInput,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  return {
    code: Number.isInteger(result.status) ? result.status : 1,
    stdout: result.stdout || '',
    stderr: result.stderr || ''
  };
}

function runCommand(command) {
  return runHook({ tool_input: { command } });
}

let passed = 0;
let failed = 0;

console.log('\npre-bash-dev-server-block hook tests');
console.log('─'.repeat(50));

const isWindows = process.platform === 'win32';

// --- Core blocking (non-Windows) ---

if (!isWindows) {
  if (test('blocks npm run dev (exit 2 with BLOCKED message)', () => {
    const r = runCommand('npm run dev');
    assert.strictEqual(r.code, 2, `expected exit 2, got ${r.code}: ${r.stderr}`);
    assert.ok(r.stderr.includes('BLOCKED'), `stderr should contain BLOCKED: ${r.stderr}`);
  })) passed++; else failed++;

  // Variants the previous inline matcher missed
  if (test('blocks pnpm run dev', () => {
    assert.strictEqual(runCommand('pnpm run dev').code, 2);
  })) passed++; else failed++;

  if (test('blocks pnpm dev', () => {
    assert.strictEqual(runCommand('pnpm dev').code, 2);
  })) passed++; else failed++;

  if (test('blocks yarn dev', () => {
    assert.strictEqual(runCommand('yarn dev').code, 2);
  })) passed++; else failed++;

  if (test('blocks yarn run dev (yarn 1.x convention) — was missed by inline matcher', () => {
    assert.strictEqual(runCommand('yarn run dev').code, 2);
  })) passed++; else failed++;

  if (test('blocks bun run dev', () => {
    assert.strictEqual(runCommand('bun run dev').code, 2);
  })) passed++; else failed++;

  if (test('blocks bun dev (bare form) — was missed by inline matcher', () => {
    assert.strictEqual(runCommand('bun dev').code, 2);
  })) passed++; else failed++;
}

// --- Subshell + brace-group bypass coverage ---

if (!isWindows) {
  if (test('blocks $(npm run dev) — $() command substitution', () => {
    assert.strictEqual(runCommand('$(npm run dev)').code, 2);
  })) passed++; else failed++;

  if (test('blocks `npm run dev` — backtick substitution', () => {
    assert.strictEqual(runCommand('`npm run dev`').code, 2);
  })) passed++; else failed++;

  if (test('blocks echo $(npm run dev) — substitution nested in argument', () => {
    assert.strictEqual(runCommand('echo $(npm run dev)').code, 2);
  })) passed++; else failed++;

  if (test('blocks (npm run dev) — plain subshell group', () => {
    assert.strictEqual(runCommand('(npm run dev)').code, 2);
  })) passed++; else failed++;

  if (test('blocks { npm run dev; } — brace group', () => {
    assert.strictEqual(runCommand('{ npm run dev; }').code, 2);
  })) passed++; else failed++;
}

// --- Allow cases — must NOT regress ---

if (test('allows tmux-wrapped npm run dev', () => {
  assert.strictEqual(runCommand('tmux new-session -d -s dev "npm run dev"').code, 0);
})) passed++; else failed++;

if (test('allows npm install', () => {
  assert.strictEqual(runCommand('npm install').code, 0);
})) passed++; else failed++;

if (test('allows npm test', () => {
  assert.strictEqual(runCommand('npm test').code, 0);
})) passed++; else failed++;

if (test('allows npm run build', () => {
  assert.strictEqual(runCommand('npm run build').code, 0);
})) passed++; else failed++;

// EGC-specific: the previous inline matcher false-positive'd on these.
// Locking in the script-based fix.

if (test('allows git commit -m "...npm run dev..." — literal in commit message', () => {
  assert.strictEqual(runCommand('git commit -m "add npm run dev script"').code, 0);
})) passed++; else failed++;

if (test('allows echo "...npm run dev..." — literal in echo arg', () => {
  assert.strictEqual(runCommand('echo "to start the dev server: npm run dev"').code, 0);
})) passed++; else failed++;

if (test('allows grep "npm run dev" — literal in grep pattern', () => {
  assert.strictEqual(runCommand('cat README.md | grep "npm run dev"').code, 0);
})) passed++; else failed++;

if (test('allows single-quoted "(npm run dev)" — literal, not a subshell', () => {
  assert.strictEqual(runCommand("git commit -m '(npm run dev) fix'").code, 0);
})) passed++; else failed++;

if (test('allows double-quoted "(npm run dev)" — literal in double quotes', () => {
  assert.strictEqual(runCommand('echo "(npm run dev)"').code, 0);
})) passed++; else failed++;

// --- Edge cases ---

if (test('empty input passes through (exit 0)', () => {
  const result = spawnSync('node', [HOOK], {
    input: '',
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  assert.strictEqual(result.status || 0, 0);
})) passed++; else failed++;

if (test('stdout contains original input on pass-through', () => {
  const input = { tool_input: { command: 'npm install' } };
  const inputStr = JSON.stringify(input);
  const r = runHook(input);
  assert.strictEqual(r.code, 0);
  assert.strictEqual(r.stdout.trim(), inputStr, 'stdout should preserve input');
})) passed++; else failed++;

console.log('─'.repeat(50));
console.log(`Passed: ${passed}  Failed: ${failed}`);

process.exit(failed > 0 ? 1 : 0);
