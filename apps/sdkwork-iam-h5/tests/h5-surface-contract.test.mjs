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

test('root layout carries the standard H5 directories', () => {
  for (const entry of [
    'AGENTS.md',
    'README.md',
    '.sdkwork/README.md',
    'sdkwork.app.config.json',
    'specs/component.spec.json',
    'etc/README.md',
    'etc/sdkwork.deployment.config.json',
    'config/browser',
    'config',
    'packages/sdkwork-iam-h5-core',
    'packages/sdkwork-iam-h5-console-core',
    'packages/sdkwork-iam-h5-admin-core',
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
  { tier: 'app', dir: 'sdkwork-iam-h5-core', constant: 'IAMH5_ROUTE_CONTRIBUTIONS', count: 12 },
  { tier: 'console', dir: 'sdkwork-iam-h5-console-core', constant: 'IAMH5CONSOLE_ROUTE_CONTRIBUTIONS', count: 4 },
  { tier: 'admin', dir: 'sdkwork-iam-h5-admin-core', constant: 'IAMH5ADMIN_ROUTE_CONTRIBUTIONS', count: 10 },
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
      entry.name.startsWith('sdkwork-iam-h5-'),
      entry.name + ' does not start with sdkwork-iam-h5-',
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
  const envDir = path.join(appRoot, 'config/browser');
  const files = fs.readdirSync(envDir).filter((name) => name.endsWith('.json'));
  assert.equal(
    files.length,
    10,
    'expected 10 runtime documents under config/browser, found ' + files.join(', '),
  );
  for (const file of files) {
    const document = JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'));
    const profileId = file.replace('runtime-env.', '').replace('.json', '');
    assert.equal(document.profileId, profileId, file + ' profileId mismatch');
    assert.equal(
      document.environment,
      profileId.split('.')[1],
      file + ' environment mismatch',
    );
    assert.equal(
      document.deploymentProfile,
      profileId.split('.')[0],
      file + ' deploymentProfile mismatch',
    );
    assert.equal(document.runtimeTarget, 'browser', file + ' runtimeTarget mismatch');
    const standalone = profileId.startsWith('standalone.');
    assert.equal(
      document.browserOriginMode,
      standalone ? 'same-origin' : 'cross-origin',
      file + ' browserOriginMode must follow the deployment profile',
    );
    // iamIssuer is an identity, not a route: exactly one iss value, so one origin.
    assert.ok(
      !document.iamIssuer.includes(';') && !document.iamIssuer.includes(','),
      file + ' iamIssuer must be a single origin',
    );
    assert.ok(document.appKey, file + ' must declare appKey');
    for (const key of [
      'appApiBaseUrl',
      'backendApiBaseUrl',
      'driveAppApiBaseUrl',
      'appbaseAppApiBaseUrl',
      'deployAppApiBaseUrl',
      'openApiBaseUrl',
      'sdkBaseUrl',
    ]) {
      assert.ok(key in document, file + ' is missing the SDK base URL field ' + key);
      if (standalone) {
        assert.equal(
          document[key],
          '/',
          file + '.' + key + ' must use the canonical same-origin root',
        );
        continue;
      }
      // ENVIRONMENT_SPEC §5.1.0.1: a cloud runtime source materializes the
      // complete registered origin family, never a single api-* origin.
      assert.ok(
        document[key].includes(';'),
        file + '.' + key + ' must carry the registered API edge family, not one origin',
      );
      assert.deepEqual(
        document[key].split(';'),
        document.cloudApiBaseUrls,
        file + '.' + key + ' must equal the declared cloudApiBaseUrls family',
      );
    }
    if (!standalone) {
      assert.ok(
        Array.isArray(document.cloudApiBaseUrls) && document.cloudApiBaseUrls.length > 0,
        file + ' must declare the cloudApiBaseUrls family',
      );
    }
    for (const key of Object.keys(document)) {
      assert.ok(
        !/(?:secret|password|privateKey|signingKey|refreshToken|accessToken)/iu.test(key),
        file + ' leaks a secret-shaped key ' + key,
      );
    }
  }
});

test('dotenv surfaces fold to one deploy-safe edge and keep the app ingress distinct', () => {
  const runtimeDir = path.join(appRoot, 'config/browser');
  const files = fs.readdirSync(runtimeDir).filter((name) => name.endsWith('.json'));
  const deployment = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'etc', 'sdkwork.deployment.config.json'), 'utf8'),
  );
  for (const file of files) {
    const profileId = file.replace('runtime-env.', '').replace('.json', '');
    const [deploymentProfile, environment] = profileId.split('.');
    const document = JSON.parse(fs.readFileSync(path.join(runtimeDir, file), 'utf8'));
    const dotenvPath = path.join(appRoot, '.env.' + profileId);
    assert.ok(fs.existsSync(dotenvPath), 'missing dotenv surface for ' + profileId);
    const entries = {};
    for (const line of fs.readFileSync(dotenvPath, 'utf8').split(/\r?\n/u)) {
      const separator = line.indexOf('=');
      if (separator > 0 && !line.startsWith('#')) {
        entries[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      }
    }

    // A dotenv value is consumed as a *URL*, so it carries the primary member of
    // the registered edge family rather than the ';'-joined family: a
    // URL-consuming dev surface cannot parse a multi-origin list
    // (ENVIRONMENT_SPEC.md section 5.1.0.1).
    const apiKeys = [
      'VITE_SDKWORK_IAM_API_BASE_URL',
      'VITE_SDKWORK_IAM_APP_API_BASE_URL',
      // The platform gateway is a public SDK API base and MUST be present: a
      // dropped gateway key is a silently missing origin, not a harmless
      // omission.
      'VITE_SDKWORK_IAM_PLATFORM_API_GATEWAY_HTTP_URL',
    ];
    for (const key of apiKeys) {
      const value = entries[key];
      assert.ok(value !== undefined, dotenvPath + ' must declare ' + key);
      assert.ok(
        !value.includes(';') && !value.includes(','),
        dotenvPath + ' ' + key + ' must carry exactly one origin, not the API edge family',
      );
      if (deploymentProfile === 'standalone') {
        // ENVIRONMENT_SPEC.md section 5.1.0.1: a standalone browser surface uses
        // the canonical root-relative path and resolves it against its own
        // origin, so the domain identity comes from the serving edge.
        assert.equal(value, '/', dotenvPath + ' ' + key + ' must be the root-relative path');
        continue;
      }
      const primary = document.appApiBaseUrl.split(';')[0];
      const expected = environment === 'development'
        // The development edge is plain HTTP; the canonical materializer
        // scheme-matches it rather than shipping a TLS origin the dev stack
        // does not serve.
        ? primary.replace(/^https:/u, 'http:')
        : primary;
      assert.equal(value, expected, dotenvPath + ' ' + key + ' must equal the primary edge');
    }
    if (deploymentProfile === 'cloud') {
      assert.equal(entries.VITE_SDKWORK_IAM_ISSUER, document.iamIssuer, dotenvPath + ' issuer must match the runtime document');
    }

    // The application-public key is the *application ingress*, not the API edge.
    // Binding it to the API host is the defect this assertion exists to catch:
    // OAuth redirects and share links built from it would land on the gateway.
    const ingress = entries.VITE_SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL;
    assert.ok(ingress !== undefined, dotenvPath + ' must declare the application public ingress');
    const ingressUrl = new URL(ingress);
    if (deploymentProfile === 'cloud') {
      // The deployment index is the authority for a cloud profile's public
      // ingress: 'cloud.development never inherits ... loopback API endpoints'
      // (ENVIRONMENT_SPEC.md section 5.1.0.1), so the app host is a registered
      // domain and never the gateway host.
      const declaredIngress = deployment.environments[environment].applicationOrigin;
      assert.equal(
        ingressUrl.hostname,
        new URL(declaredIngress).hostname,
        dotenvPath + ' application public key must address the application ingress, not the API edge',
      );
      if (environment === 'development') {
        // A dev ingress *port* is a dev-process binding fact; the promoted
        // artifact carries the host and takes the port from the serving edge.
        assert.equal(
          ingressUrl.port,
          '',
          dotenvPath + ' must not leak the dev ingress port into the dotenv surface',
        );
      }
    } else {
      // A standalone profile's ingress is the gateway the surface publishes
      // (ip+port in development, the application domain behind an edge
      // otherwise) — never a registered api-* cloud edge host.
      assert.ok(
        !/^api-/.test(ingressUrl.hostname),
        dotenvPath + ' standalone ingress must not point at the cloud API edge',
      );
    }
  }
});


test('app manifest never claims a root this workspace does not build', () => {
  const manifest = JSON.parse(read('sdkwork.app.config.json'));
  assert.equal(manifest.kind, 'sdkwork.app');
  assert.equal(manifest.app.appType, 'APP_REACT');
  assert.equal(manifest.app.versionSource, 'package.json');
  assert.deepEqual(manifest.runtime.supportedDeploymentProfiles.slice().sort(), ['cloud', 'standalone']);
  assert.equal(manifest.metadata.deploymentConfig, 'etc/sdkwork.deployment.config.json');
});

test('the root is registered in the repository workspace and docs index', () => {
  const workspace = fs.readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  assert.ok(
    workspace.includes('apps/sdkwork-iam-h5'),
    'pnpm-workspace.yaml does not register apps/sdkwork-iam-h5',
  );
  const index = fs.readFileSync(path.join(repoRoot, 'apps', 'README.md'), 'utf8');
  assert.ok(index.includes('sdkwork-iam-h5'), 'apps/README.md does not index sdkwork-iam-h5');
});
