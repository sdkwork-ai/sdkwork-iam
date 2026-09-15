// WORKSPACE-PATH:allow-fixture - this file is a test fixture that simulates a foreign
// checkout root, so the sdkwork-<name> segment below is the value under assertion rather
// than a binding to a real sibling checkout. PORTABILITY_SPEC.md section 5.2 governs it.
import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { listAppbaseGovernanceNodeTestFiles } from '../../../scripts/appbase-governance-node-test-catalog.mjs';

const appbaseRoot = path.resolve(import.meta.dirname, '../../..');

async function loadModule() {
  return import(
    pathToFileURL(
      path.join(appbaseRoot, 'scripts', 'run-appbase-governance-node-tests.mjs'),
    ).href,
  );
}

test('appbase governance node runner executes the governed test plan with node test isolation disabled', async () => {
  const module = await loadModule();

  assert.equal(typeof module.createAppbaseGovernanceNodeTestPlan, 'function');

  assert.deepEqual(
    module.createAppbaseGovernanceNodeTestPlan({
      cwd: 'D:/workspace/sdkwork-appbase',
      env: {},
      nodeExecutable: 'node-custom',
    }),
    {
      command: 'node-custom',
      args: [
        '--test',
        '--experimental-test-isolation=none',
        ...listAppbaseGovernanceNodeTestFiles(),
      ],
      cwd: 'D:/workspace/sdkwork-appbase',
      env: {},
      shell: false,
      windowsHide: process.platform === 'win32',
    },
  );
});
