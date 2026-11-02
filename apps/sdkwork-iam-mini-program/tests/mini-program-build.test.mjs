/**
 * Build-contract test for the IAM mini program.
 *
 * The defect this suite exists to prevent: `src/app.json` declared 26 pages while
 * the package contained none, so the project could not open in DevTools and the
 * breakage was invisible from the repository. The invariant is now enforced in both
 * directions:
 *
 * - every page the **manifest** names must exist on disk as js/json/wxml;
 * - every page the **projection** emits must be named by the manifest.
 *
 * It reads the committed bundle (`src/runtime/iam-app.js`) rather than importing
 * the TypeScript, so the assertion is about the bytes that ship.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(appRoot, 'src', 'runtime', 'iam-app.js');

/** Loads the committed CommonJS bundle without going through `require`. */
function loadBundle() {
  assert.ok(fs.existsSync(bundlePath), 'src/runtime/iam-app.js is missing: run scripts/build-runtime.mjs');
  const source = fs.readFileSync(bundlePath, 'utf8');
  const loaded = { exports: {} };
  const factory = new Function('module', 'exports', 'require', source);
  factory(loaded, loaded.exports, (specifier) => {
    throw new Error(`bundle must be self-contained but required ${specifier}`);
  });
  return loaded.exports;
}

function readAppJson() {
  const raw = fs.readFileSync(path.join(appRoot, 'src', 'app.json'), 'utf8').replace(/^\uFEFF/u, '');
  return JSON.parse(raw);
}

/** Every physical page path the manifest declares, main package first. */
function declaredPhysicalPages(appJson) {
  return [
    ...appJson.pages,
    ...(appJson.subPackages ?? []).flatMap((subpackage) =>
      subpackage.pages.map((page) => `${subpackage.root}/${page}`),
    ),
  ];
}

/**
 * Page files that must exist for a page to be loadable.
 *
 * A page path `pages/login/index` is the *file stem*: the platform reads
 * `src/pages/login/index.js`, `.json` and `.wxml` beside each other.
 */
const REQUIRED_EXTENSIONS = ['.js', '.json', '.wxml'];

test('every page named by app.json exists on disk', () => {
  const missing = [];
  for (const page of declaredPhysicalPages(readAppJson())) {
    for (const extension of REQUIRED_EXTENSIONS) {
      const absolute = path.join(appRoot, 'src', `${page}${extension}`);
      if (!fs.existsSync(absolute)) missing.push(path.relative(appRoot, absolute));
    }
  }
  assert.deepEqual(missing, [], `app.json names pages without files: ${missing.join(', ')}`);
});

test('the manifest matches the projection exactly', () => {
  const bundle = loadBundle();
  const appJson = readAppJson();
  const composition = bundle.composeIamMpAppJson();

  assert.deepEqual(appJson.pages, composition.pages, 'main-package pages drifted from the projection');
  assert.deepEqual(
    appJson.subPackages,
    composition.subPackages.map((subpackage) => ({ pages: subpackage.pages, root: subpackage.root })),
    'subPackages drifted from the projection',
  );
});

test('every implemented route id is a real route of the registry', () => {
  const bundle = loadBundle();
  const registry = new Set(bundle.IAMMP_ROUTE_CONTRIBUTIONS.map((route) => route.id));
  const unknown = bundle.IAM_MP_IMPLEMENTED_ROUTE_IDS.filter((id) => !registry.has(id));
  assert.deepEqual(unknown, [], `implemented route ids not in the registry: ${unknown.join(', ')}`);

  // The projection is the intersection, so it can never be larger than the list.
  const projected = bundle.composeIamMpAppJson().pages.length;
  assert.ok(projected <= bundle.IAM_MP_IMPLEMENTED_ROUTE_IDS.length);
});

test('the runtime exposes the ports the pages call', () => {
  const bundle = loadBundle();
  for (const name of ['bootstrapIamMpApp', 'getIamMpRuntime', 'IAM_MP_PAGE_PATHS', 'resolveIamMpMessage']) {
    assert.ok(bundle[name] !== undefined, `runtime bundle must export ${name}`);
  }
  assert.equal(bundle.resolveIamMpMessage('zh-CN', 'login.title'), '登录');
  assert.equal(bundle.resolveIamMpMessage('en-US', 'login.title'), 'Sign in');
  // An unknown key must come back as the key rather than as `undefined`, which is
  // what a page renders as the literal text "undefined".
  assert.equal(bundle.resolveIamMpMessage('en-US', 'no.such.key'), 'no.such.key');
});

test('the runtime-env artifact matches the committed profile', () => {
  const envPath = path.join(appRoot, 'src', 'runtime', 'runtime-env.js');
  assert.ok(fs.existsSync(envPath), 'src/runtime/runtime-env.js is missing: run scripts/build-runtime.mjs');
  const source = fs.readFileSync(envPath, 'utf8');
  const loaded = { exports: {} };
  new Function('module', 'exports', source)(loaded, loaded.exports);
  const profileId = loaded.exports.SDKWORK_PROFILE_ID;
  assert.ok(typeof profileId === 'string' && profileId.includes('.'), 'runtime env has no profile id');

  const profilePath = path.join(appRoot, 'config', 'mini-program', `runtime-env.${profileId}.json`);
  assert.ok(fs.existsSync(profilePath), `no committed profile for ${profileId}`);
  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8').replace(/^\uFEFF/u, ''));
  for (const key of ['SDKWORK_APP_API_BASE_URL', 'SDKWORK_PROFILE_ID', 'SDKWORK_RUNTIME_TARGET']) {
    assert.equal(loaded.exports[key], profile[key], `runtime-env.js drifted from ${profileId} for ${key}`);
  }
});
