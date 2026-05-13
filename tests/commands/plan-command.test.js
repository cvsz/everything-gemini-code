/**
 * Tests for commands/egc-plan.toml prompt contract.
 *
 * Adapted from ECC's tests/commands/plan-command.test.js (commit 17aafc4).
 * Verifies that /egc-plan runs inline by default and does not require
 * the planner agent to be installed.
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const planCommandPath = path.join(repoRoot, 'commands', 'egc-plan.toml');

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

function readPlanCommand() {
  return fs.readFileSync(planCommandPath, 'utf8');
}

console.log('\n=== Testing /egc-plan command prompt ===\n');

test('/egc-plan runs inline by default without requiring planner agent', () => {
  const source = readPlanCommand();

  assert.ok(
    source.includes('Do not delegate to the `@planner` subagent'),
    'Expected /egc-plan to avoid default subagent delegation',
  );
  assert.ok(
    source.includes('If the `@planner` subagent is unavailable'),
    'Expected /egc-plan to define a planner-unavailable fallback',
  );
  assert.ok(
    !source.includes('This command invokes the **planner** agent'),
    'Expected /egc-plan not to claim unconditional planner invocation',
  );
  assert.ok(
    !source.includes('The planner agent will:'),
    'Expected /egc-plan to describe inline behavior, not mandatory agent behavior',
  );
  assert.ok(
    !source.includes('Agent (planner):'),
    'Expected /egc-plan examples not to imply the planner agent is required',
  );
});

test('/egc-plan still documents the optional planner agent for manual use', () => {
  const source = readPlanCommand();

  assert.ok(
    source.includes('Optional Planner Agent'),
    'Expected /egc-plan to mention the optional planner agent section',
  );
  assert.ok(
    source.includes('agents/planner.md'),
    'Expected /egc-plan to reference the planner agent source file',
  );
});

test('/egc-plan preserves the WAIT-for-CONFIRM contract', () => {
  const source = readPlanCommand();

  assert.ok(
    /\*\*CRITICAL\*\*:.*\*\*NOT\*\* write any code until you explicitly confirm/.test(source),
    'Expected /egc-plan to retain the explicit-confirm guard',
  );
  assert.ok(
    source.includes('WAITING FOR CONFIRMATION'),
    'Expected /egc-plan to retain the WAITING FOR CONFIRMATION marker',
  );
});

console.log('\n=== Test Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}\n`);

process.exit(failed === 0 ? 0 : 1);
