import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { verifyIamUniappxRoot } from '../scripts/verify-uniappx-root.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('root satisfies the uniappx mode contract', () => {
  const result = verifyIamUniappxRoot(ROOT);
  assert.deepEqual(result.issues, []);
  assert.equal(result.mode, 'vapor');
  assert.deepEqual(result.targets, ['APP_ANDROID', 'APP_IOS', 'APP_HARMONY']);
});

test('manifest carries the mandatory uni-app-x node with vapor and style isolation 2.0', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  assert.equal(manifest['uni-app-x'].vapor, true);
  assert.equal(manifest['uni-app-x'].styleIsolationVersion, '2');
  assert.ok(Number(manifest['app-android'].minSdkVersion) >= 23);
  assert.ok(Number.parseFloat(manifest['app-ios'].minimumOSVersion) >= 15);
  assert.match(manifest['app-harmony'].compatibleSdkVersion, /\((\d+)\)/u);
});

test('mode spec classifies App targets as vapor', () => {
  const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', 'uniappx-mode.spec.json'), 'utf8'));
  assert.equal(spec.mode, 'vapor');
  for (const target of spec.targets) {
    assert.equal(spec.runtimeClassification[target], 'vapor');
  }
});
