// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(rootDir, '..');
const repoRoot = path.resolve(appRoot, '..', '..');

function read(relativePath) {
  return fs.readFileSync(path.join(appRoot, relativePath), 'utf8');
}

test('root layout carries the standard Mini Program directories', () => {
  for (const entry of [
    'AGENTS.md',
    'README.md',
    '.sdkwork/README.md',
    'sdkwork.app.config.json',
    'specs/component.spec.json',
    'etc/README.md',
    'etc/sdkwork.deployment.config.json',
    'config/mini-program',
    'config',
    'packages/sdkwork-iam-mp-core',
    'packages/sdkwork-iam-mp-console-core',
    'packages/sdkwork-iam-mp-admin-core',
    'docs/README.md',
    'sdks/README.md',
    'scripts/README.md',
    'src',
    'packages',
    'tests',
    'package.json',
  ]) {
    assert.ok(fs.existsSync(path.join(appRoot, entry)), 'missing ' + entry);
  }
});

const TIER_REGISTRIES = [
  { tier: 'app', dir: 'sdkwork-iam-mp-core', constant: 'IAMMP_ROUTE_CONTRIBUTIONS', count: 12 },
  { tier: 'console', dir: 'sdkwork-iam-mp-console-core', constant: 'IAMMPCONSOLE_ROUTE_CONTRIBUTIONS', count: 4 },
  { tier: 'admin', dir: 'sdkwork-iam-mp-admin-core', constant: 'IAMMPADMIN_ROUTE_CONTRIBUTIONS', count: 10 },
];

test('every tier core package exposes the six composition subpaths and its own registry', () => {
  for (const { tier, dir, constant } of TIER_REGISTRIES) {
    const coreDir = path.join(appRoot, 'packages', dir);
    const manifest = JSON.parse(fs.readFileSync(path.join(coreDir, 'package.json'), 'utf8'));
    for (const subpath of ['.', './sdk', './modules', './host', './session', './composition']) {
      assert.ok(subpath in manifest.exports, tier + ' core is missing exports[' + subpath + ']');
    }
    assert.ok(fs.existsSync(path.join(coreDir, 'src', 'composition')), tier + ' core is missing src/composition');
    const registryPath = path.join(coreDir, 'src', 'modules', 'index.ts');
    assert.ok(fs.existsSync(registryPath), tier + ' core is missing its route registry');
    const registry = fs.readFileSync(registryPath, 'utf8');
    assert.match(registry, new RegExp(constant), tier + ' registry symbol ' + constant + ' missing');
    // A tier registry must not leak another tier's routes, or one route id would
    // be owned by two registries.
    for (const other of TIER_REGISTRIES) {
      if (other.tier === tier) continue;
      assert.ok(
        !registry.includes("surface: '" + other.tier + "'"),
        tier + ' registry must not declare ' + other.tier + ' routes',
      );
    }
  }
});

/** Every route id declared by the tier registries, in registry order. */
function allRouteIds() {
  const ids = [];
  for (const { dir } of TIER_REGISTRIES) {
    const registry = read('packages/' + dir + '/src/modules/index.ts');
    for (const match of registry.matchAll(/'((?:app|console|admin)\.iam\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*)'/gu)) {
      ids.push(match[1]);
    }
  }
  return ids;
}

test('tier registries partition the route table without overlap', () => {
  const total = TIER_REGISTRIES.reduce((sum, registry) => sum + registry.count, 0);
  assert.equal(total, 26, 'tier route counts must sum to the whole route table');
});

test('every authored package name carries the architecture segment', () => {
  const packagesDir = path.join(appRoot, 'packages');
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    assert.ok(
      entry.name.startsWith('sdkwork-iam-mp-'),
      entry.name + ' does not start with sdkwork-iam-mp-',
    );
    assert.ok(
      fs.existsSync(path.join(packagesDir, entry.name, 'specs', 'component.spec.json')),
      entry.name + ' is missing specs/component.spec.json',
    );
  }
});

test('the tier registries together declare 26 contributions with canonical ids', () => {
  const ids = allRouteIds();
  for (const id of ids) {
    const tier = id.slice(0, id.indexOf('.'));
    assert.ok(
      TIER_REGISTRIES.some((registry) => registry.tier === tier),
      id + ' is declared under a known tier',
    );
  }
  assert.equal(ids.length, 26, 'unexpected route count: ' + ids.join(', '));
  assert.equal(new Set(ids).size, ids.length, 'duplicate route ids across tiers');
});

test('capability packages declare their route ids in the component spec', () => {
  const packagesDir = path.join(appRoot, 'packages');
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!/(?:^|-)(?:console-|admin-)?[a-z-]+$/u.test(entry.name)) continue;
    const specPath = path.join(packagesDir, entry.name, 'specs', 'component.spec.json');
    if (!fs.existsSync(specPath)) continue;
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const isCore = /-(?:console-core|admin-core|core)$/u.test(entry.name);
    if (isCore) continue;
    const capability = spec.component.capability;
    assert.ok(capability, entry.name + ' must declare a capability');
    const declared = spec.contracts.routeIds ?? [];
    // Scope the expectation to the package's own surface tier. A capability such
    // as account-binding exists on several tiers, so filtering by capability
    // alone would expect the admin routes from the app package too.
    const routeSurface = spec.component.surface === 'backend-admin' ? 'admin' : spec.component.surface;
    const expected = allRouteIds().filter(
      (id) => id.startsWith(routeSurface + '.') && id.includes('.iam.' + capability + '.'),
    );
    assert.deepEqual([...declared].sort(), [...expected].sort(), entry.name + ' routeIds mismatch');
  }
});

test('admin packages are backend-admin and declare backend SDK dependencies', () => {
  const packagesDir = path.join(appRoot, 'packages');
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/admin-/u.test(entry.name)) continue;
    const spec = JSON.parse(
      fs.readFileSync(path.join(packagesDir, entry.name, 'specs', 'component.spec.json'), 'utf8'),
    );
    assert.equal(spec.component.surface, 'backend-admin', entry.name + ' must declare backend-admin');
    const deps = spec.contracts.sdkDependencies ?? [];
    assert.ok(
      deps.every((dep) => (dep.surface ?? 'app-api') === 'backend-api'),
      entry.name + ' must only declare backend-api SDK dependencies',
    );
  }
});

test('app and console packages never declare backend-api SDK dependencies', () => {
  const packagesDir = path.join(appRoot, 'packages');
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || /admin-/u.test(entry.name)) continue;
    const specPath = path.join(packagesDir, entry.name, 'specs', 'component.spec.json');
    if (!fs.existsSync(specPath)) continue;
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    for (const dep of spec.contracts.sdkDependencies ?? []) {
      assert.notEqual((dep.surface ?? 'app-api'), 'backend-api', entry.name + ' must not declare backend-api SDKs');
    }
  }
});

test('public runtime config is secret-free and complete for every profile', () => {
  const envDir = path.join(appRoot, 'config/mini-program');
  const files = fs.readdirSync(envDir).filter((name) => name.endsWith('.json'));
  assert.equal(
    files.length,
    10,
    'expected 10 runtime documents under config/mini-program, found ' + files.join(', '),
  );
  for (const file of files) {
    const document = JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'));
    const profileId = file.replace('runtime-env.', '').replace('.json', '');
    assert.equal(document.SDKWORK_PROFILE_ID, profileId, file + ' profileId mismatch');
    assert.equal(
      document.SDKWORK_ENVIRONMENT,
      profileId.split('.')[1],
      file + ' environment mismatch',
    );
    assert.equal(
      document.SDKWORK_DEPLOYMENT_PROFILE,
      profileId.split('.')[0],
      file + ' deploymentProfile mismatch',
    );
    assert.equal(
      document.SDKWORK_RUNTIME_TARGET,
      'mini-program',
      file + ' runtimeTarget mismatch',
    );
    assert.equal(
      document.SDKWORK_APP_API_BASE_URL,
      document.SDKWORK_DEPLOYMENT_PROFILE === 'standalone' ? '/' : document.SDKWORK_API_BASE_URL,
      file + ' standalone must resolve the same-origin root',
    )
    for (const key of Object.keys(document)) {
      assert.ok(
        !/(?:secret|password|privateKey|signingKey|refreshToken|accessToken)/iu.test(key),
        file + ' leaks a secret-shaped key ' + key,
      );
    }
  }
});



test('app manifest never claims a root this workspace does not build', () => {
  const manifest = JSON.parse(read('sdkwork.app.config.json'));
  assert.equal(manifest.kind, 'sdkwork.app');
  assert.equal(manifest.app.appType, 'APP_UNIAPP');
  assert.equal(manifest.app.versionSource, 'package.json');
  assert.deepEqual(manifest.runtime.supportedDeploymentProfiles.slice().sort(), ['cloud', 'standalone']);
  assert.equal(manifest.metadata.deploymentConfig, 'etc/sdkwork.deployment.config.json');
});

test('the root is registered in the repository workspace and docs index', () => {
  const workspace = fs.readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  assert.ok(
    workspace.includes('apps/sdkwork-iam-mini-program'),
    'pnpm-workspace.yaml does not register apps/sdkwork-iam-mini-program',
  );
  const index = fs.readFileSync(path.join(repoRoot, 'apps', 'README.md'), 'utf8');
  assert.ok(index.includes('sdkwork-iam-mini-program'), 'apps/README.md does not index sdkwork-iam-mini-program');
});
