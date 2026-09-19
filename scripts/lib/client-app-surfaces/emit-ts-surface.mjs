/**
 * Assembles one TypeScript client root (H5 or mini program): root scaffolding
 * plus the full package family.
 *
 * Pre-existing packages (the hand-written H5 auth/user/account-binding/core
 * packages) are never overwritten: for those, the emitter only creates files
 * that do not exist yet, so authored screens, i18n and controllers survive.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  PROFILE_IDS,
  ROUTES,
  ROUTE_TIERS,
  packagesForSurface,
  routeId,
  routeSurfaceOf,
  routesOfPackage,
  routesOfTier,
} from './model.mjs';
import { GENERATED_BANNER, createSurfaceWriter, toPosix } from './emit-common.mjs';
import { applyViteSurfaceCloudValues } from '../../../../sdkwork-specs/tools/materialize-client-env.mjs';
import { cloudApiOriginsFor, readProfileEnvValues } from './cloud-api-base.mjs';
import {
  appManifest,
  coreCompositionSource,
  coreHostSource,
  coreModulesSource,
  coreSdkSource,
  coreSessionSource,
  deploymentIndex,
  identPrefix,
  kebabFromPascal,
  miniProgramPlacement,
  packageComponentSpec,
  pascal,
  pascalFromIdent,
  rootComponentSpec,
  runtimeEnvDocument,
  tierPrefix,
} from './emit-ts.mjs';

/** Packages that predate the generator and must keep their authored sources. */
export const PRE_EXISTING_PACKAGE_DIRS = new Set([
  'apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-core',
  'apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-auth',
  'apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-user',
  'apps/sdkwork-iam-h5/packages/sdkwork-iam-h5-account-binding',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_core',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_auth',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_user',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_account_binding',
]);

/**
 * Generator-owned files inside a package that predates the generator.
 *
 * The git-index rule below answers "who wrote this file" but cannot answer the
 * second half of the question: some committed files inside a pre-existing
 * package are still this generator's own output — the component spec, the route
 * registry, the SDK/host/session composition entries. Without this override a
 * committed copy of any of them would freeze, and a model change would silently
 * fail to reach the package.
 *
 * Two families are deliberately absent:
 * - `src/index.ts` and `src/composition/index.ts` are *extended* instead (see
 *   `writer.extendExports`), because replacing them deletes authored exports.
 * - `README.md` is authored prose (API surface, token scopes, login semantics)
 *   that no template can reproduce, so the generator only creates it for new
 *   packages.
 */
const GENERATOR_OWNED_RELATIVE = [
  /^tsconfig\.json$/u,
  /^specs\/component\.spec\.json$/u,
  /^src\/routes\/route-contribution\.ts$/u,
  /^src\/composition\/surface-composition\.ts$/u,
  /^src\/(?:modules|sdk|host|session)\/index\.ts$/u,
  /^src\/services\/[^/]+-service\.ts$/u,
  /^src\/i18n\/manifest\.ts$/u,
  /^src\/i18n\/[^/]+\/iam\/[^/]+\/[^/]+\.ts$/u,
];

const BANNER_COMMENT = GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '');

function docBanner(language = 'md') {
  if (language === 'md') return `${GENERATED_BANNER}\n`;
  return `${BANNER_COMMENT}\n`;
}

/**
 * One `Array.prototype.filter` predicate selecting a package's routes.
 *
 * `filter` takes a single predicate. An earlier version emitted one
 * `(route) => ...` per route separated by commas, so a five-route package was
 * read as a predicate plus four extra arguments
 * (`TS2554: Expected 1-2 arguments, but got 5`) and the result was `never`.
 */
function routePredicate(routes) {
  const ids = routes.map((route) => routeId(route));
  if (ids.length === 1) return `\n  (route) => route.id === '${ids[0]}',\n`;
  return `\n  (route) =>\n${ids.map((id) => `    route.id === '${id}'`).join(' ||\n')},\n`;
}

function surfaceTitle(surface) {
  if (surface.key === 'h5') return 'H5';
  if (surface.key === 'mp') return 'Mini Program';
  if (surface.key === 'harmony') return 'HarmonyOS Mobile';
  return 'Flutter Mobile';
}

/**
 * OAuth runtime discovery reaches a TypeScript client root through its `-core`
 * package re-exporting `@sdkwork/iam-contracts`. Flutter is a Dart root: it has
 * no npm scope and consumes the same discovery contract through its own Dart
 * contracts package, so the clause must not claim an npm re-export there.
 */
function oauthReexportClause(surface) {
  if (surface.languages.includes('typescript')) {
    return `, re-exported by \`${surface.coreName}\` from \`@sdkwork/iam-contracts\``;
  }
  return `, consumed by \`${surface.coreDir}\` through the IAM contracts boundary`;
}

function agentsMd(surface) {
  const title = surfaceTitle(surface);
  return `${docBanner()}# SDKWork IAM ${title}

\`apps/${surface.rootName}\` is the SDKWork IAM **${title}** client application root.

## Authority

- \`../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` — cross-client root,
  package taxonomy, route identity, dependency direction, config alignment.
- \`../../../sdkwork-specs/${surface.architectureSpec}\` — this architecture's root standard.
- \`../../../sdkwork-specs/${surface.uiSpec}\` — package UI rules.

## Cross-client references

- Cross-architecture IAM contracts/runtime: \`../../apps/sdkwork-iam-common/packages/\`.
- OAuth runtime discovery: \`../../../sdkwork-specs/IAM_OAUTH_SPEC.md\`${oauthReexportClause(surface)}.
- Owner: \`sdkwork-iam\` maintainers.

## Layout

- \`packages/${surface.coreDir}/\` — runtime config, SDK factories, session store,
  route registry (\`src/modules/index.ts\`), host adapter contracts.
- \`packages/${surface.packageDirPrefix}commons/\` — domain-neutral UI primitives.
- \`packages/${surface.packageDirPrefix}shell/\` — app shell and route assembly.
- \`packages/${surface.packageDirPrefix}<capability>/\` — one domain capability per package.
- \`packages/${surface.packageDirPrefix}console-*/\` — user-facing console family (app-api).
- \`packages/${surface.packageDirPrefix}admin-*/\` — internal operator family (backend-api, approved).
- \`${surface.bootDir}/\` — bootstrap only (environment, runtime, SDK clients, IAM runtime, host adapters, routes).
- \`${surface.sourceRoot}/\` (root) — thin entry and composition only.
- \`${surface.runtimeEnvDir}/\` — per-profile non-secret runtime config.

## Non-negotiable rules

- Business screens, services, state, i18n and route contributions live in packages, not in the root entry.
- Capability packages never construct SDK clients and never import generated SDK packages; SDK clients are built in \`${surface.coreDir}\` and injected.
- Admin packages are \`backend-admin\` and use the generated backend SDK. They require the governance approval recorded in \`specs/component.spec.json\`.
- Route ids follow \`<surface>.<domain>.<capability>.<screen>\` and are identical across every IAM client root.
- Platform APIs stay behind typed host adapter contracts.
- Config is secret-free. Public runtime config loads before SDK client construction.

## Related standards for this root

- \`PNPM_SCRIPT_SPEC.md\` — package script names and the \`_sdkwork:*\` lifecycle.
- \`GITHUB_WORKFLOW_SPEC.md\` — CI and release workflow contract.
- \`PAGINATION_SPEC.md\` — list endpoints use \`SdkWorkListQuery\`/\`SdkWorkPageInfo\`/\`q\`.
  Validated by \`node ../../../sdkwork-specs/tools/check-pagination.mjs --root .\`
- Lists use dynamic progressive loading (load more / infinite scroll), never
  full-page reloads.
- Language specs load on-demand per locale and per package i18n fragment.

## Verification

\`\`\`bash
node ../../../sdkwork-specs/tools/check-frontend-composition.mjs --root .
node ../../../sdkwork-specs/tools/check-component-port-bindings.mjs --root .
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../../../sdkwork-specs/tools/check-source-config-standard.mjs --root .
node ../../scripts/verify-client-app-surfaces.mjs --surface ${surface.key}
\`\`\`
`;
}

function readmeMd(surface) {
  const title = surfaceTitle(surface);
  const packages = packagesForSurface(surface);
  const capabilityDirs = (packageSurface) =>
    packages
      .filter((entry) => entry.kind === 'capability' && entry.surface === packageSurface)
      .map((entry) => `\`${entry.dir}\``)
      .join(', ');
  return `${docBanner()}# SDKWork IAM ${title}

SDKWork IAM ${title} client application root (\`apps/${surface.rootName}\`).

| Field | Value |
| --- | --- |
| Architecture | \`${surface.architecture}\` |
| Package segment | \`${surface.segment}\` |
| Runtime target | \`${surface.runtimeTarget}\` |
| App manifest | \`${surface.manifest}\` |
| Component spec | \`specs/component.spec.json\` |
| Deployment descriptor | \`etc/sdkwork.deployment.config.json\` |
| Route registry | \`packages/${surface.coreDir}/src/modules/index.ts\` |
| Packages | ${packages.length} |

## Commands

\`\`\`bash
pnpm install
pnpm typecheck
pnpm test
pnpm check
\`\`\`

## Surfaces

The root ships three surfaces from one renderer and SDK runtime model:

| Surface | Packages | API / SDK |
| --- | --- | --- |
| app | ${capabilityDirs('app')} | app-api / \`@sdkwork/iam-app-sdk\` |
| console | ${capabilityDirs('console')} | app-api / \`@sdkwork/iam-app-sdk\` |
| admin | ${capabilityDirs('backend-admin')} | backend-api / \`@sdkwork/iam-backend-sdk\` (approved) |

Cross-architecture IAM contracts/runtime live in \`../../apps/sdkwork-iam-common/packages/\`.
OAuth runtime discovery follows \`../../../sdkwork-specs/IAM_OAUTH_SPEC.md\`${oauthReexportClause(surface)}.

Owner: \`sdkwork-iam\` maintainers.

See \`AGENTS.md\` for the rules and the verification commands.
`;
}

function runtimeEntrypoint(surface) {
  if (surface.key === 'h5') {
    // Identifiers derive from the surface, not from literals. The core package
    // publishes `IamH5RuntimeEnv` / `createIamH5SessionStore` (PascalCase types,
    // camelCase values per NAMING_SPEC.md); a literal copy here goes stale and
    // surfaces as `TS2724: has no exported member named 'IamH5X'`.
    const typePrefix = pascalFromIdent(identPrefix(surface));
    const core = surface.coreName;
    const routeConstant = `${identPrefix(surface).toUpperCase()}_ROUTE_CONTRIBUTIONS`;
    return {
      'main.tsx': `${BANNER_COMMENT}
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { loadRuntimeEnv } from './bootstrap/environment';
import { resolveBootstrapRoutes } from './bootstrap/routes';

async function main(): Promise<void> {
  await loadRuntimeEnv();
  const container = document.getElementById('root');
  if (!container) throw new Error('${surface.rootName}: #root container is missing');
  const routes = resolveBootstrapRoutes();
  createRoot(container).render(
    <StrictMode>
      <App routes={routes} />
    </StrictMode>,
  );
}

void main();
`,
      'App.tsx': `${BANNER_COMMENT}
import type { ReactElement } from 'react';
import type { ${typePrefix}RouteContribution } from '${core}';

import { AuthGate } from './AuthGate';

export interface AppProps {
  routes: readonly ${typePrefix}RouteContribution[];
}

/**
 * Root composition boundary: providers, AuthGate and route assembly only.
 * Business screens live in \`packages/**\`.
 */
export function App({ routes }: AppProps): ReactElement {
  return (
    <AuthGate routes={routes}>
      <div id="${surface.rootName}-surface-root" data-route-count={routes.length} />
    </AuthGate>
  );
}
`,
      'AuthGate.tsx': `${BANNER_COMMENT}
import type { ReactElement, ReactNode } from 'react';
import type { ${typePrefix}RouteContribution } from '${core}';

import { create${typePrefix}SessionStore } from '${core}';

const sessionStore = create${typePrefix}SessionStore();

export interface AuthGateProps {
  children: ReactNode;
  routes: readonly ${typePrefix}RouteContribution[];
}

/**
 * AuthGate reads the shared session store and renders the public route set
 * while the session is empty. Route guards stay in shell/runtime, never in
 * capability packages (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §7).
 */
export function AuthGate({ children, routes }: AuthGateProps): ReactElement {
  const session = sessionStore.get();
  const visible = session
    ? routes
    : routes.filter((route) => route.auth === 'public');
  return (
    <div data-authenticated={session ? 'true' : 'false'} data-visible-routes={visible.length}>
      {children}
    </div>
  );
}
`,
      'providers/AppProviders.tsx': `${BANNER_COMMENT}
import type { ReactElement, ReactNode } from 'react';

export interface AppProvidersProps {
  children: ReactNode;
}

/** Provider composition boundary. SDK/session providers are wired here. */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return <>{children}</>;
}
`,
      'bootstrap/environment.ts': `${BANNER_COMMENT}
import type { ${typePrefix}RuntimeEnv } from '${core}';

declare global {
  // eslint-disable-next-line no-var
  var __SDKWORK_RUNTIME_ENV__: ${typePrefix}RuntimeEnv | undefined;
}

/**
 * Loads the browser-visible public runtime document before any SDK client is
 * constructed. The document is non-secret by contract.
 */
export async function loadRuntimeEnv(url = '/runtime-env.json'): Promise<${typePrefix}RuntimeEnv> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('${surface.rootName}: public runtime config request failed with ' + response.status);
  }
  const env = (await response.json()) as ${typePrefix}RuntimeEnv;
  globalThis.__SDKWORK_RUNTIME_ENV__ = env;
  return env;
}
`,
      'bootstrap/runtime.ts': `${BANNER_COMMENT}
import { read${typePrefix}RuntimeEnv } from '${core}';

export function describeRuntime(): { profileId: string; target: string } {
  const env = read${typePrefix}RuntimeEnv();
  return { profileId: env.profileId, target: env.runtimeTarget };
}
`,
      'bootstrap/sdkClients.ts': `${BANNER_COMMENT}
import { create${typePrefix}AppSdkClient, read${typePrefix}RuntimeEnv } from '${core}';

/** Builds the generated app SDK boundary once per bootstrap. */
export function createSdkClients() {
  return { app: create${typePrefix}AppSdkClient(read${typePrefix}RuntimeEnv()) };
}
`,
      'bootstrap/iamRuntime.ts': `${BANNER_COMMENT}
import { create${typePrefix}SessionStore } from '${core}';

/**
 * IAM runtime wiring. Appbase IAM owns login, session, refresh, logout and
 * token propagation; this module only binds the shared stores.
 */
export function createIamRuntime() {
  const sessionStore = create${typePrefix}SessionStore();
  return {
    sessionStore,
    clear: () => sessionStore.clear(),
  };
}
`,
      'bootstrap/tokenManager.ts': `${BANNER_COMMENT}
import { create${typePrefix}SessionStore, type ${typePrefix}SessionStore } from '${core}';

export const tokenManager: ${typePrefix}SessionStore = create${typePrefix}SessionStore();
`,
      'bootstrap/hostAdapters.ts': `${BANNER_COMMENT}
import { create${typePrefix}FallbackHostAdapter, type ${typePrefix}HostAdapter } from '${core}';

/**
 * Browser fallback host. Capacitor host implementations replace it in the
 * \`${surface.hostDir}\` package without touching feature code.
 */
export function createHostAdapters(): ${typePrefix}HostAdapter {
  return create${typePrefix}FallbackHostAdapter();
}
`,
      'bootstrap/routes.ts': `${BANNER_COMMENT}
import { ${routeConstant}, type ${typePrefix}RouteContribution } from '${core}';

/** Route assembly input for the root shell. Route guards stay here. */
export function resolveBootstrapRoutes(): readonly ${typePrefix}RouteContribution[] {
  return ${routeConstant};
}
`,
    };
  }

  // Non-React TypeScript surface: the mini program root. Identifiers derive from
  // the surface for the same reason as the H5 branch above.
  const typePrefix = pascalFromIdent(identPrefix(surface));
  const core = surface.coreName;
  const host = surface.hostName;
  const routeConstant = `${identPrefix(surface).toUpperCase()}_ROUTE_CONTRIBUTIONS`;
  return {
    'app.js': `${BANNER_COMMENT}
const { resolveBootstrapRoutes } = require('./bootstrap/routes');

App({
  onLaunch() {
    this.globalData = { routes: resolveBootstrapRoutes() };
  },
});
`,
    'bootstrap/runtime.ts': `${BANNER_COMMENT}
import { read${typePrefix}RuntimeEnv } from '${core}';

export function describeRuntime(): { profileId: string; target: string } {
  const env = read${typePrefix}RuntimeEnv();
  return { profileId: env.SDKWORK_PROFILE_ID, target: env.SDKWORK_RUNTIME_TARGET };
}
`,
    'bootstrap/sdkClients.ts': `${BANNER_COMMENT}
import { create${typePrefix}AppSdkClient, read${typePrefix}RuntimeEnv } from '${core}';

export function createSdkClients() {
  return { app: create${typePrefix}AppSdkClient(read${typePrefix}RuntimeEnv()) };
}
`,
    'bootstrap/iamRuntime.ts': `${BANNER_COMMENT}
import { create${typePrefix}SessionStore } from '${core}';

export function createIamRuntime() {
  const sessionStore = create${typePrefix}SessionStore();
  return { sessionStore, clear: () => sessionStore.clear() };
}
`,
    'bootstrap/hostAdapters.ts': `${BANNER_COMMENT}
import { create${typePrefix}HostAdapters, type ${typePrefix}HostAdapters } from '${host}';

/** Typed wrappers over \`wx.*\`. Feature packages never call platform globals. */
export function createHostAdapters(): ${typePrefix}HostAdapters {
  return create${typePrefix}HostAdapters();
}
`,
    'bootstrap/routes.ts': `${BANNER_COMMENT}
import { ${routeConstant}, type ${typePrefix}RouteContribution } from '${core}';

import type { MiniProgramRoutePlacement } from './types';

export function resolveBootstrapRoutes(): readonly ${typePrefix}RouteContribution[] {
  return ${routeConstant};
}

/** Projects route contributions into app.json pages and subpackages (spec §5). */
export function projectAppJson(): {
  pages: readonly string[];
  subPackages: readonly { root: string; pages: readonly string[] }[];
} {
  const routes = resolveBootstrapRoutes();
  const pages: string[] = [];
  const subpackageMap = new Map<string, string[]>();
  for (const route of routes) {
    const placement: MiniProgramRoutePlacement | undefined = route.miniProgram;
    if (!placement) continue;
    if (!placement.subpackage) {
      pages.push(placement.pagePath);
      continue;
    }
    const bucket = subpackageMap.get(placement.subpackage) ?? [];
    bucket.push(placement.pagePath);
    subpackageMap.set(placement.subpackage, bucket);
  }
  return {
    pages,
    subPackages: [...subpackageMap.entries()].map(([root, subPages]) => ({ root: root + '/', pages: subPages })),
  };
}
`,
  };
}

function contractTestSource(surface) {
  const expectedCount = ROUTES.length;
  // One core package per route tier, each owning its own registry (spec section 4).
  // The root test asserts the union, because no single tier registry holds every route.
  const tierRegistries = ROUTE_TIERS.map((tier) => ({
    tier,
    dir: tier === 'app' ? surface.coreDir : tier === 'console' ? surface.consoleCoreDir : surface.adminCoreDir,
    constant: tierPrefix(surface, tier).toUpperCase() + '_ROUTE_CONTRIBUTIONS',
    count: routesOfTier(tier).length,
  }));
  // The identity fields the runtime document must re-declare are contract
  // specific: a browser root follows ENVIRONMENT_SPEC.md §5.1.0/§5.1.0.1, a mini
  // program root follows UNIAPP_APP_ARCHITECTURE_SPEC.md §268. Asserting the
  // wrong vocabulary would either pass vacuously or force the wrong shape.
  const runtimeAssertions = surface.runtimeTarget === 'browser'
    ? `    assert.equal(document.profileId, profileId, file + ' profileId mismatch');
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
    }`
    : `    assert.equal(document.SDKWORK_PROFILE_ID, profileId, file + ' profileId mismatch');
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
      '${surface.runtimeTarget}',
      file + ' runtimeTarget mismatch',
    );
    assert.equal(
      document.SDKWORK_APP_API_BASE_URL,
      document.SDKWORK_DEPLOYMENT_PROFILE === 'standalone' ? '/' : document.SDKWORK_API_BASE_URL,
      file + ' standalone must resolve the same-origin root',
    )`;
  return `${BANNER_COMMENT}
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

test('root layout carries the standard ${surfaceTitle(surface)} directories', () => {
  for (const entry of [
    'AGENTS.md',
    'README.md',
    '.sdkwork/README.md',
    'sdkwork.app.config.json',
    'specs/component.spec.json',
    'etc/README.md',
    'etc/sdkwork.deployment.config.json',
    '${surface.runtimeEnvDir}',
    'config',
${tierRegistries.map((registry) => `    'packages/${registry.dir}'`).join(',\n')},
    'docs/README.md',
    'sdks/README.md',
    'scripts/README.md',
    '${surface.sourceRoot}',
    'packages',
    'tests',
    '${surface.manifest}',
  ]) {
    assert.ok(fs.existsSync(path.join(appRoot, entry)), 'missing ' + entry);
  }
});

const TIER_REGISTRIES = [
${tierRegistries
  .map(
    (registry) =>
      `  { tier: '${registry.tier}', dir: '${registry.dir}', constant: '${registry.constant}', count: ${registry.count} },`,
  )
  .join('\n')}
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
    for (const match of registry.matchAll(/'((?:app|console|admin)\\.iam\\.[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*)'/gu)) {
      ids.push(match[1]);
    }
  }
  return ids;
}

test('tier registries partition the route table without overlap', () => {
  const total = TIER_REGISTRIES.reduce((sum, registry) => sum + registry.count, 0);
  assert.equal(total, ${expectedCount}, 'tier route counts must sum to the whole route table');
});

test('every authored package name carries the architecture segment', () => {
  const packagesDir = path.join(appRoot, 'packages');
  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    assert.ok(
      entry.name.startsWith('${surface.packageDirPrefix}'),
      entry.name + ' does not start with ${surface.packageDirPrefix}',
    );
    assert.ok(
      fs.existsSync(path.join(packagesDir, entry.name, 'specs', 'component.spec.json')),
      entry.name + ' is missing specs/component.spec.json',
    );
  }
});

test('the tier registries together declare ${expectedCount} contributions with canonical ids', () => {
  const ids = allRouteIds();
  for (const id of ids) {
    const tier = id.slice(0, id.indexOf('.'));
    assert.ok(
      TIER_REGISTRIES.some((registry) => registry.tier === tier),
      id + ' is declared under a known tier',
    );
  }
  assert.equal(ids.length, ${expectedCount}, 'unexpected route count: ' + ids.join(', '));
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
  const envDir = path.join(appRoot, '${surface.runtimeEnvDir}');
  const files = fs.readdirSync(envDir).filter((name) => name.endsWith('.json'));
  assert.equal(
    files.length,
    ${PROFILE_IDS.length},
    'expected ${PROFILE_IDS.length} runtime documents under ${surface.runtimeEnvDir}, found ' + files.join(', '),
  );
  for (const file of files) {
    const document = JSON.parse(fs.readFileSync(path.join(envDir, file), 'utf8'));
    const profileId = file.replace('${surface.runtimeEnvFileBase}.', '').replace('.json', '');
${runtimeAssertions}
    for (const key of Object.keys(document)) {
      assert.ok(
        !/(?:secret|password|privateKey|signingKey|refreshToken|accessToken)/iu.test(key),
        file + ' leaks a secret-shaped key ' + key,
      );
    }
  }
});

${surface.rootEnvFiles ? `test('dotenv surfaces fold to one deploy-safe edge and keep the app ingress distinct', () => {
  const runtimeDir = path.join(appRoot, '${surface.runtimeEnvDir}');
  const files = fs.readdirSync(runtimeDir).filter((name) => name.endsWith('.json'));
  const deployment = JSON.parse(
    fs.readFileSync(path.join(repoRoot, 'etc', 'sdkwork.deployment.config.json'), 'utf8'),
  );
  for (const file of files) {
    const profileId = file.replace('${surface.runtimeEnvFileBase}.', '').replace('.json', '');
    const [deploymentProfile, environment] = profileId.split('.');
    const document = JSON.parse(fs.readFileSync(path.join(runtimeDir, file), 'utf8'));
    const dotenvPath = path.join(appRoot, '.env.' + profileId);
    assert.ok(fs.existsSync(dotenvPath), 'missing dotenv surface for ' + profileId);
    const entries = {};
    for (const line of fs.readFileSync(dotenvPath, 'utf8').split(/\\r?\\n/u)) {
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
` : ''}

test('app manifest never claims a root this workspace does not build', () => {
  const manifest = JSON.parse(read('sdkwork.app.config.json'));
  assert.equal(manifest.kind, 'sdkwork.app');
  assert.equal(manifest.app.appType, '${surface.appType}');
  assert.equal(manifest.app.versionSource, '${surface.versionSource}');
  assert.deepEqual(manifest.runtime.supportedDeploymentProfiles.slice().sort(), ['cloud', 'standalone']);
  assert.equal(manifest.metadata.deploymentConfig, 'etc/sdkwork.deployment.config.json');
});

test('the root is registered in the repository workspace and docs index', () => {
  const workspace = fs.readFileSync(path.join(repoRoot, 'pnpm-workspace.yaml'), 'utf8');
  assert.ok(
    workspace.includes('apps/${surface.rootName}'),
    'pnpm-workspace.yaml does not register apps/${surface.rootName}',
  );
  const index = fs.readFileSync(path.join(repoRoot, 'apps', 'README.md'), 'utf8');
  assert.ok(index.includes('${surface.rootName}'), 'apps/README.md does not index ${surface.rootName}');
});
`;
}

function routeAlignmentTestSource(surface) {
  const prefix = identPrefix(surface);
  return `${BANNER_COMMENT}
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(rootDir, '..');

const CANONICAL_ID_RE = /^(?:app|console|admin)\\.iam\\.[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*$/u;

/**
 * Reads the route registry *source* rather than any generated projection, so a
 * passing assertion is evidence about the registry itself. Field extraction
 * uses an id-delimited window: text from one id literal up to the next.
 */
function readContributions() {
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', '${surface.coreDir}', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  const literals = [...registry.matchAll(/'((?:app|console|admin)\\.iam\\.[a-z][a-z0-9-]*\\.[a-z][a-z0-9-]*)'/gu)];
  const seen = new Set();
  const contributions = [];
  for (const [index, literal] of literals.entries()) {
    const id = literal[1];
    assert.ok(!seen.has(id), 'duplicate id literal ' + id + ' breaks window extraction');
    seen.add(id);
    const end = literals[index + 1]?.index ?? Math.min(registry.length, literal.index + 600);
    const window = registry.slice(literal.index, end);
    const field = (name) => new RegExp('\\\\b' + name + ":\\\\s*'([^']*)'", 'u').exec(window)?.[1];
    contributions.push({
      id,
      surface: field('surface'),
      domain: field('domain'),
      capability: field('capability'),
      screen: field('screen'),
      titleKey: field('titleKey'),
      auth: field('auth'),
    });
  }
  return contributions;
}

test('route ids follow the canonical four-segment format', () => {
  for (const contribution of readContributions()) {
    assert.match(contribution.id, CANONICAL_ID_RE, contribution.id + ' is not canonical');
    assert.equal(
      contribution.id,
      [contribution.surface, contribution.domain, contribution.capability, contribution.screen].join('.'),
      contribution.id + ' disagrees with its own field segments',
    );
  }
});

test('route ids are unique and each id appears once in the registry', () => {
  const contributions = readContributions();
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', '${surface.coreDir}', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  const ids = contributions.map((contribution) => contribution.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate route ids');
  for (const id of ids) {
    const occurrences = registry.split("'" + id + "'").length - 1;
    assert.equal(occurrences, 1, id + ' appears ' + occurrences + ' times');
  }
});

test('title keys are domain-scoped and permission hints are dotted tokens', () => {
  for (const contribution of readContributions()) {
    assert.ok(contribution.titleKey?.startsWith('iam.'), contribution.id + ' titleKey must start with iam.');
  }
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', '${surface.coreDir}', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  for (const match of registry.matchAll(/permissionHint:\\s*'([^']+)'/gu)) {
    assert.match(match[1], /^iam\\.[a-z][a-z0-9_]*(?:\\.[a-z][a-z0-9_]*)*$/u, match[1] + ' is not a dotted permission token');
  }
});

test('route metadata never declares API paths, SDK methods or tokens', () => {
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', '${surface.coreDir}', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  assert.ok(!/\\/app\\/v3\\/api|\\/backend\\/v3\\/api/u.test(registry), 'route metadata must not declare API paths');
  assert.ok(!/(?:accessToken|refreshToken|clientSecret|apiKey)/u.test(registry), 'route metadata must not declare credentials');
});

test('every route carries a platform presentation and a title key', () => {
  for (const contribution of readContributions()) {
    assert.ok(contribution.titleKey, contribution.id + ' is missing titleKey');
    assert.ok(['public', 'required'].includes(contribution.auth), contribution.id + ' has an invalid auth mode');
  }
});

export { readContributions };
`;
}

/**
 * Materializes one TypeScript client root.
 *
 * @param {{surface: object, appRoot: string, repoRoot: string, packages: object[], writer: object, dryRun?: boolean}} input
 */
export function materializeTsSurface({
  surface,
  appRoot,
  repoRoot,
  packages,
  writer,
  authoredFiles = null,
  dryRun = false,
}) {
  // The authored-vs-generated decision, the extend-only package entry, the
  // manifest merge and the dry-run short-circuit are shared with the Dart and
  // ArkTS emitters. See `createSurfaceWriter` in `emit-common.mjs` for the rules
  // and their rationale.
  const surfaceWriter = createSurfaceWriter({
    appRoot,
    repoRoot,
    writer,
    authoredFiles,
    dryRun,
    preExistingPackageDirs: PRE_EXISTING_PACKAGE_DIRS,
    generatorOwnedRelative: GENERATOR_OWNED_RELATIVE,
  });
  const { rel, write, writeJson, writeEntry, writeMergedJson } = surfaceWriter;

  /** Conform a pre-existing manifest to the contract without discarding authored metadata. */
  const writeManifest = (relativePath, generated) =>
    writeMergedJson(relativePath, generated, mergeManifest);

  // ---- root: workspace and docs scaffolding ----
  write('AGENTS.md', agentsMd(surface));
  write('README.md', readmeMd(surface));
  for (const [name, body] of [
    ['CLAUDE.md', `# Claude\n\nAuthority: read [AGENTS.md](AGENTS.md) first.\n`],
    ['CODEX.md', `# Codex\n\nAuthority: read [AGENTS.md](AGENTS.md) first.\n`],
    ['GEMINI.md', `# Gemini\n\nAuthority: read [AGENTS.md](AGENTS.md) first.\n`],
  ]) {
    write(name, `${docBanner()}${body}`);
  }
  write('.gitignore', `.cache/\ndist/\n*.local.*\nproject.private.config.json\n`);
  write(
    '.sdkwork/README.md',
    `${docBanner()}# .sdkwork

Source-controlled workspace metadata for the \`${surface.rootName}\` client root:
application-local agent skills and plugins. Governed by
\`../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md\`.

Owner: \`sdkwork-iam\` maintainers.
`,
  );
  write(
    '.sdkwork/skills/README.md',
    `${docBanner()}# skills

Application-local agent skills for \`apps/${surface.rootName}\` belong here.

Skill directories use lowercase kebab-case and provide \`SKILL.md\` as the entrypoint.
Owner: \`sdkwork-iam\` maintainers.
`,
  );
  write(
    '.sdkwork/plugins/README.md',
    `${docBanner()}# plugins

Application-local agent plugins for \`apps/${surface.rootName}\` belong here.

Installable plugins declare \`.codex-plugin/plugin.json\` and document the skills,
tools, scripts and verification they contribute.
Owner: \`sdkwork-iam\` maintainers.
`,
  );
  write('docs/README.md', `${docBanner()}# docs\n\nLocal architecture notes, runbooks and decisions for \`apps/${surface.rootName}\`.\n`);
  write('sdks/README.md', `${docBanner()}# sdks\n\nThis root consumes the \`sdkwork-iam-app-sdk\` and \`sdkwork-iam-backend-sdk\` families owned by \`sdks/**\`. It owns no generated SDK family, so no generated output is committed here.\n`);
  write('scripts/README.md', `${docBanner()}# scripts\n\nLocal build, validation and release helpers for this client root.\n`);
  write(
    'config/README.md',
    surface.hostDir === null
      ? `${docBanner()}# config\n\nNon-secret public runtime documents live in \`${surface.runtimeEnvDir}/\`. This architecture has no platform host package, so no \`config/host/\` directory is expected here.\n`
      : `${docBanner()}# config\n\nSee \`config/host/\` for platform host templates. Non-secret public runtime documents live in \`${surface.runtimeEnvDir}/\`.\n`,
  );
  if (surface.hostDir !== null) {
    write('config/host/README.md', `${docBanner()}# config/host\n\nPlatform host metadata for this root: bundle/package identity references, permission references, signing reference names and store lane references. Signing private keys, tokens, API keys and database credentials are forbidden here.\n`);
  }
  write('etc/README.md', `${docBanner()}# etc\n\nSource configuration authority for this client root. \`sdkwork.deployment.config.json\` is the component deployment descriptor consumed by \`sdkwork-specs\` tooling.\n`);
  write('public/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#0f172a"/><text x="16" y="22" font-size="15" text-anchor="middle" fill="#f8fafc">IAM</text></svg>\n`);

  writeJson('sdkwork.app.config.json', appManifest(surface));
  writeJson('specs/component.spec.json', rootComponentSpec(surface, packages));
  writeJson('etc/sdkwork.deployment.config.json', deploymentIndex(surface));

  // Runtime documents: one authored, checked-in document per deployment profile,
  // under the directory this architecture standard declares
  // (`config/browser/`, `config/mini-program/`, `config/app/`, `env/`).
  const envDirectory = surface.runtimeEnvDir;
  const envFileBase = surface.runtimeEnvFileBase;
  for (const profileId of PROFILE_IDS) {
    writeJson(`${envDirectory}/${envFileBase}.${profileId}.json`, runtimeEnvDocument(surface, profileId, repoRoot));
  }
  // `public/runtime-env.json` is deliberately NOT written: it is the
  // materialization output of `pnpm workflow:materialize-client-env` and is
  // gitignored in the sibling roots, so committing it here would be a derived
  // artifact checked into source.
  if (surface.rootEnvFiles) {
    for (const profileId of PROFILE_IDS) {
      write(`.env.${profileId}`, rootEnvFile(surface, profileId, repoRoot));
    }
  }

  // ---- root: entry and bootstrap ----
  for (const [relativePath, content] of Object.entries(runtimeEntrypoint(surface))) {
    write(`${surface.sourceRoot}/${relativePath}`, content);
  }
  write(`${surface.sourceRoot}/index.css`, `:root { color-scheme: light dark; }\n`);
  write(`${surface.sourceRoot}/shell/README.md`, `${docBanner()}# shell\n\nThe root shell is assembled from \`packages/${surface.packageDirPrefix}shell\`. Business services stay in capability packages.\n`);
  write(`${surface.sourceRoot}/routes/README.md`, `${docBanner()}# routes\n\nRoute assembly reads \`packages/${surface.coreDir}/src/modules/index.ts\`. Route guards stay in the shell/runtime layer.\n`);

  if (surface.key === 'mp') {
    // Mini program `pages` and `subPackages` are projected from the route table
    // (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §7: "Mini program platform `pages`
    // and `subpackages` should be generated or assembled from route
    // contributions where tooling exists").
    const rootPages = [];
    const subPackagePages = new Map();
    for (const route of ROUTES) {
      const placement = miniProgramPlacement(route);
      if (placement.subpackage === null) {
        if (!rootPages.includes(placement.pagePath)) rootPages.push(placement.pagePath);
        continue;
      }
      if (!subPackagePages.has(placement.subpackage)) subPackagePages.set(placement.subpackage, []);
      const pages = subPackagePages.get(placement.subpackage);
      if (!pages.includes(placement.pagePath)) pages.push(placement.pagePath);
    }
    rootPages.sort();
    write(
      `${surface.sourceRoot}/app.json`,
      `${JSON.stringify(
        {
          pages: rootPages,
          subPackages: [...subPackagePages.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([root, pages]) => ({ root, pages: [...pages].sort() })),
          window: {
            navigationBarTitleText: 'SDKWork IAM',
            navigationBarBackgroundColor: '#0f172a',
            navigationBarTextStyle: 'white',
          },
        },
        null,
        2,
      )}\n`,
    );
    write(`${surface.sourceRoot}/app.wxss`, `page { background: #f8fafc; }\n`);
    write(
      `${surface.sourceRoot}/sitemap.json`,
      `${JSON.stringify({ desc: 'SDKWork IAM mini program sitemap', rules: [{ action: 'allow', page: '*' }] }, null, 2)}\n`,
    );
    write(`${surface.sourceRoot}/bootstrap/types.ts`, `${BANNER_COMMENT}\nexport interface MiniProgramRoutePlacement {\n  rootPackage?: boolean;\n  subpackage?: string;\n  pagePath: string;\n  preload?: boolean;\n}\n`);
  }

  // ---- root: manifests ----
  if (surface.key === 'h5') {
    writeJson('package.json', {
      name: surface.rootName,
      private: true,
      version: '0.1.0',
      type: 'module',
      packageManager: 'pnpm@10.33.0',
      scripts: rootScripts(),
      dependencies: Object.fromEntries(
        packages
          .map((entry) => [entry.name, 'workspace:*'])
          .concat([
            ['@sdkwork/app-topology', 'workspace:*'],
            ['@sdkwork/iam-contracts', 'workspace:*'],
            ['@sdkwork/iam-service', 'workspace:*'],
            ['@sdkwork/sdk-common', 'workspace:*'],
          ]),
      ),
      devDependencies: {
        '@types/node': 'catalog:',
        '@types/react': 'catalog:',
        '@types/react-dom': 'catalog:',
        react: 'catalog:',
        'react-dom': 'catalog:',
        typescript: 'catalog:',
      },
    });
    // Extend the repository base instead of re-declaring compiler options: the
    // base carries `types: ["node", "@testing-library/jest-dom"]`,
    // `allowImportingTsExtensions`, and the React `paths` mapping. A hand-rolled
    // copy silently omitted all three, which surfaced as `Cannot find namespace
    // 'NodeJS'`, `toHaveTextContent does not exist on type 'Assertion'`, and
    // TS5097 inside sibling workspace repositories.
    writeJson('tsconfig.json', {
      extends: '../../tsconfig.base.json',
      include: ['src', 'packages'],
      exclude: ['dist', 'node_modules', '.vite', 'tmp', 'target'],
    });
    write('index.html', `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <title>SDKWork IAM</title>
    <link rel="icon" href="/favicon.svg" />
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);
    write('vite.config.ts', `${BANNER_COMMENT}
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
`);
  } else {
    writeJson('package.json', {
      name: surface.rootName,
      private: true,
      version: '0.1.0',
      type: 'module',
      packageManager: 'pnpm@10.33.0',
      scripts: rootScripts(),
      dependencies: Object.fromEntries(
        packages
          .map((entry) => [entry.name, 'workspace:*'])
          .concat([
            ['@sdkwork/app-topology', 'workspace:*'],
            ['@sdkwork/iam-contracts', 'workspace:*'],
            ['@sdkwork/iam-service', 'workspace:*'],
          ]),
      ),
      devDependencies: {
        '@types/node': 'catalog:',
        // The root tsconfig sets `types: ['node', 'miniprogram-api-typings']`, so
        // the typings package is a hard requirement of the typecheck, not an
        // optional convenience. Version range matches the sibling
        // `sdkwork-im-mini-program` root.
        'miniprogram-api-typings': '^4.1.0',
        typescript: 'catalog:',
      },
    });
    writeJson('tsconfig.json', {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        lib: ['ES2022'],
        types: ['node', 'miniprogram-api-typings'],
      },
      include: ['src', 'packages'],
      exclude: ['dist', 'node_modules', '.vite', 'tmp'],
    });
    writeJson('project.config.json', {
      appid: 'wx0000000000000000',
      projectname: surface.rootName,
      compileType: 'miniprogram',
      libVersion: '3.5.5',
      miniprogramRoot: 'src/',
      setting: {
        urlCheck: true,
        es6: true,
        enhance: true,
        postcss: true,
        minified: true,
        packNpmManually: false,
        ignoreDevUnusedFiles: true,
        ignoreUploadUnusedFiles: true,
      },
      description: 'SDKWork IAM WeChat mini program client',
    });
    write(
      'project.private.config.json.example',
      `${JSON.stringify({ projectname: surface.rootName, setting: { compileHotReLoad: false } }, null, 2)}\n`,
    );
  }

  // ---- root: tests ----
  write(`tests/${surface.key}-surface-contract.test.mjs`, contractTestSource(surface));
  write(`tests/${surface.key}-route-alignment.test.mjs`, routeAlignmentTestSource(surface));

  // ---- packages ----
  for (const entry of packages) {
    const packageDir = `packages/${entry.dir}`;
    const routes = routesOfPackage(entry);
    const isCore = entry.role === 'core' || entry.role === 'console-core' || entry.role === 'admin-core';
    // A package that predates the generator may already own an authored i18n
    // aggregation — `sdkwork-iam-h5-auth` does, with a real
    // `createSdkworkMessageCatalog` binding over eleven authored fragments.
    // Generating locale fragments beside it would add a second, unreferenced
    // fragment set for the same capability, so the generator defers wherever the
    // package already tracks `src/i18n/index.ts` and only authors i18n where the
    // package has none.
    const i18nIndexPath = path.join(appRoot, packageDir, 'src/i18n/index.ts');
    const hasAuthoredI18n =
      authoredFiles === null ? fs.existsSync(i18nIndexPath) : authoredFiles.has(rel(i18nIndexPath));

    writeManifest(`${packageDir}/package.json`, packageManifest(surface, entry));
    write(
      `${packageDir}/README.md`,
      `${docBanner()}# ${entry.name}

| Field | Value |
| --- | --- |
| Role | \`${entry.role}\` |
| Surface | \`${entry.surface}\` |
| Capability | \`${entry.capability ?? '—'}\` |
| Layer role | \`${entry.layerRole}\` |
| SDK boundary | ${entry.sdkDependencies.length > 0 ? `\`${entry.sdkDependencies[0].surface}\` (${entry.sdkDependencies[0].credentialMode})` : 'none'} |

${routes.length > 0 ? `## Routes\n\n${routes.map((route) => `- \`${routeId(route)}\` → \`${route.path}\` (\`${route.titleKey}\`)`).join('\n')}\n` : ''}
`,
    );
    writeJson(`${packageDir}/specs/component.spec.json`, packageComponentSpec(surface, entry, routes));

    if (isCore) {
      const tier = routeSurfaceOf(entry.surface);
      write(
        `${packageDir}/src/sdk/index.ts`,
        tier === 'admin' ? adminCoreSdkSource(surface, entry) : coreSdkSource(surface),
      );
      // Each tier's core owns the route registry for its own surface only
      // (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §4). Tier-scoped constant and
      // type names keep the three registries distinct.
      write(`${packageDir}/src/modules/index.ts`, coreModulesSource(surface, tier));
      write(`${packageDir}/src/host/index.ts`, coreHostSource(surface, tier));
      write(`${packageDir}/src/session/index.ts`, coreSessionSource(surface, tier));
      write(`${packageDir}/src/composition/surface-composition.ts`, coreCompositionSource(surface, packages, tier));
      writeEntry(
        `${packageDir}/src/index.ts`,
        `${BANNER_COMMENT}
export * from './modules/index.js';
export * from './sdk/index.js';
export * from './host/index.js';
export * from './session/index.js';
export * from './composition/surface-composition.js';
`,
      );
      writeEntry(
        `${packageDir}/src/composition/index.ts`,
        `${BANNER_COMMENT}
export * from './surface-composition.js';
`,
      );
      continue;
    }

    if (entry.kind === 'capability') {
      const cap = entry.capability;
      const PascalToken = pascal(cap);
      const tier = routeSurfaceOf(entry.surface);
      const prefix = tierPrefix(surface, tier);
      const tierConstant = prefix.toUpperCase();
      const symbolBase = `${prefix}${PascalToken}`;
      const tierCoreName =
        tier === 'admin' ? surface.adminCoreName : tier === 'console' ? surface.consoleCoreName : surface.coreName;

      write(
        `${packageDir}/src/routes/route-contribution.ts`,
        `${BANNER_COMMENT}
import { ${tierConstant}_ROUTE_CONTRIBUTIONS } from '${tierCoreName}';

/** Route contributions owned by \`${entry.name}\`, taken from its tier registry. */
export const ${symbolBase.toUpperCase()}_ROUTE_CONTRIBUTIONS = ${tierConstant}_ROUTE_CONTRIBUTIONS.filter(${routePredicate(routes)});

export const ${symbolBase.toUpperCase()}_ROUTE_IDS = [
${routes.map((route) => `  '${routeId(route)}',`).join('\n')}
] as const;
`,
      );

      write(
        `${packageDir}/src/services/${kebabFromPascal(PascalToken)}-service.ts`,
        `${BANNER_COMMENT}
import type { SdkworkIamService } from '@sdkwork/iam-service';

export interface Create${symbolBase}ServiceInput {
  /** Injected service port. Capability services never build their own client. */
  service: SdkworkIamService;
}

export interface ${symbolBase}Service {
  /** Screen inventory owned by this capability. */
  listScreenIds(): readonly string[];
}

export function create${symbolBase}Service(input: Create${symbolBase}ServiceInput): ${symbolBase}Service {
  const { service } = input;
  return {
    listScreenIds() {
      void service;
      return [
${routes.map((route) => `        '${route.screen}',`).join('\n')}
      ];
    },
  };
}
`,
      );

      if (!hasAuthoredI18n) {
        for (const localeDir of ['en-US', 'zh-CN']) {
          write(
            `${packageDir}/src/i18n/${localeDir}/iam/${surface.segment}/${cap}.ts`,
            `${BANNER_COMMENT}
/** Locale fragment: domain \`iam\`, capability \`${cap}\`, package \`${entry.name}\`. */
export const ${symbolBase}Messages = {
${routes
  .map(
    (route) =>
      `  '${route.titleKey}': '${localeDir === 'zh-CN' ? zhTitle(route) : enTitle(route)}',`,
  )
  .join('\n')}
} as const;

export type ${symbolBase}MessageKey = keyof typeof ${symbolBase}Messages;
`,
          );
        }
        // I18N_SPEC.md section 6: the locale fragments are the authored source of
        // truth and a thin aggregation file binds them. Both locale fragments
        // export the same symbol name, so a bare `export *` from each of them
        // collides (TS2308); the manifest aliases them instead, and `index.ts`
        // re-exports only the default locale by name.
        write(
          `${packageDir}/src/i18n/manifest.ts`,
          `${BANNER_COMMENT}
import { ${symbolBase}Messages as enUS } from './en-US/iam/${surface.segment}/${cap}.js';
import { ${symbolBase}Messages as zhCN } from './zh-CN/iam/${surface.segment}/${cap}.js';

/** Locale fragment manifest for \`${entry.name}\` (I18N_SPEC.md section 6). */
export const ${symbolBase.toUpperCase()}_I18N_FRAGMENTS = {
  'en-US': enUS,
  'zh-CN': zhCN,
} as const;

export type ${symbolBase}Locale = keyof typeof ${symbolBase.toUpperCase()}_I18N_FRAGMENTS;

export const ${symbolBase.toUpperCase()}_DEFAULT_LOCALE = 'en-US' as const;

/** Message shape of the default locale; every locale must satisfy it. */
export type ${symbolBase}LocaleMessages =
  (typeof ${symbolBase.toUpperCase()}_I18N_FRAGMENTS)[typeof ${symbolBase.toUpperCase()}_DEFAULT_LOCALE];
`,
        );
        write(
          `${packageDir}/src/i18n/index.ts`,
          `${BANNER_COMMENT}
export * from './manifest.js';
export * from './en-US/iam/${surface.segment}/${cap}.js';
`,
        );
      }

      writeEntry(
        `${packageDir}/src/index.ts`,
        `${BANNER_COMMENT}
export * from './routes/route-contribution.js';
export * from './services/${kebabFromPascal(PascalToken)}-service.js';
export * from './i18n/index.js';
`,
      );
      continue;
    }

    if (entry.role === 'host') {
      write(`${packageDir}/src/index.ts`, hostPackageSource(surface, entry));
      continue;
    }

    // commons and shell
    const isShell = entry.role.endsWith('shell');
    const surfaceWord = entry.role.startsWith('console')
      ? 'console'
      : entry.role.startsWith('admin')
        ? 'admin'
        : 'app';
    // The shell reads its own tier's core registry, so the identifier prefix
    // carries the tier and the three shells never collide.
    const prefix = tierPrefix(surface, surfaceWord);
    const typePrefix = pascalFromIdent(prefix);
    if (isShell) {
      const tierCoreName =
        surfaceWord === 'admin'
          ? surface.adminCoreName
          : surfaceWord === 'console'
            ? surface.consoleCoreName
            : surface.coreName;
      write(
        `${packageDir}/src/index.ts`,
        `${BANNER_COMMENT}
import type { ${typePrefix}RouteContribution } from '${tierCoreName}';

export interface ${prefix}ShellRouteGroup {
  surface: '${surfaceWord}';
  routes: readonly ${typePrefix}RouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function group${prefix.replace(/^iam/u, 'Iam')}ShellRoutes(
  routes: readonly ${typePrefix}RouteContribution[],
): ${prefix}ShellRouteGroup {
  return {
    surface: '${surfaceWord}',
    routes,
  };
}
`,
      );
      continue;
    }

    write(
      `${packageDir}/src/index.ts`,
      `${BANNER_COMMENT}
/**
 * Domain-neutral UI primitives for the ${surface.rootName} client root.
 * No business screens and no SDK construction live here.
 */

export const ${prefix.toUpperCase()}_COMMONS_DESIGN_TOKENS = {
  spacing: { xs: 4, sm: 8, md: 16, lg: 24 },
  radius: { sm: 4, md: 8, lg: 12 },
} as const;
`,
    );
  }

  return { planned: surfaceWriter.planned };
}

/**
 * Root `package.json` scripts for a delegated application surface.
 *
 * This root ships `etc/sdkwork.deployment.config.json` with
 * `kind: sdkwork.component-deployment`, which makes it a delegated surface for
 * `check-pnpm-script-standard.mjs`. That classification requires `dev`,
 * `dev:standalone`, `dev:cloud` and `stop`, with `dev` delegating directly to
 * `dev:standalone`, and it pairs each facade lifecycle verb (`build`, `test`,
 * `check`, `verify`, `clean`) with a private `_sdkwork:<verb>` hook.
 *
 * `@sdkwork/app-topology` is a declared dependency because these scripts invoke
 * `pnpm exec sdkwork-app`; the gate rejects relying on an undeclared CLI.
 */
function rootScripts() {
  const specsTools = '../../../sdkwork-specs/tools';
  return {
    dev: 'pnpm dev:standalone',
    'dev:standalone': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile standalone',
    'dev:cloud': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile cloud',
    stop: 'pnpm exec sdkwork-app stop --root ../..',
    build: 'pnpm exec sdkwork-app build',
    test: 'pnpm exec sdkwork-app test',
    check: 'pnpm exec sdkwork-app check',
    verify: 'pnpm exec sdkwork-app verify',
    clean: 'pnpm exec sdkwork-app clean',
    typecheck: 'tsc --noEmit -p tsconfig.json',
    'test:config': `node ${specsTools}/check-app-manifest-standard.mjs --root . && node ${specsTools}/check-source-config-standard.mjs --root .`,
    /**
     * `public/runtime-env.json` is a *build* artifact: the bootstrap fetches it
     * before constructing any SDK client, so a dev session reads whatever the
     * file currently holds. `pnpm dev` does not rewrite it, and the
     * `dev:cloud` local-gateway rebinding
     * (`sdkwork-app-topology/tools/topology/lib/dev-gateway-binding.mjs`)
     * applies to injected *process* env, not to this fetched document. These two
     * scripts materialize the profile the dev server is about to serve, so
     * `pnpm build:dev:cloud && pnpm dev:cloud` starts against the profile the
     * topology declares rather than a leftover document from the other one.
     * Sibling roots expose the same pair.
     */
    'build:dev': `node ${specsTools}/build-browser-client.mjs --app-root . --environment dev`,
    'build:dev:cloud': `node ${specsTools}/build-browser-client.mjs --app-root . --environment dev --deployment-profile cloud`,
    '_sdkwork:build': `node ${specsTools}/build-browser-client.mjs --app-root . --environment dev`,
    '_sdkwork:test': 'node --test tests/*.test.mjs',
    '_sdkwork:check': 'pnpm run typecheck && pnpm run test:config',
    '_sdkwork:verify': 'pnpm run _sdkwork:check && pnpm run _sdkwork:test',
    '_sdkwork:clean':
      'node -e "const fs = require(\'node:fs\'); fs.rmSync(\'dist\', { recursive: true, force: true });"',
  };
}

/**
 * Conform a pre-existing package manifest to the composed-package contract while
 * keeping authored metadata.
 *
 * Authored values win on conflict (name, version, description, `sdkwork` block,
 * scripts). Generated values fill the gaps that the contract requires: the six
 * `exports` subpaths and the declared dependencies.
 */
function mergeManifest(previous, generated) {
  const merged = { ...generated, ...previous };
  merged.exports = { ...(generated.exports ?? {}), ...(previous.exports ?? {}) };
  merged.dependencies = { ...(generated.dependencies ?? {}), ...(previous.dependencies ?? {}) };
  merged.devDependencies = { ...(generated.devDependencies ?? {}), ...(previous.devDependencies ?? {}) };
  return merged;
}

/**
 * Browser roots also materialize one `.env.<deploymentProfile>.<environment>`
 * document per profile from the repository topology.
 *
 * The generated content mirrors the checked-in shape of the sibling roots: public
 * `VITE_*` values only, sorted, and secret-free.
 *
 * ## Value rules are delegated, not re-implemented
 *
 * A `.env` file is a dotenv surface whose values are consumed as *URLs*, not as a
 * build/deploy runtime document, so the rules that govern it differ from
 * `runtimeEnvDocument`'s:
 *
 * - SDK API base and platform-gateway keys carry the family's **primary member**,
 *   scheme-matched to the environment (plain-HTTP for the development edge,
 *   TLS otherwise). §5.1.0.1 excludes the development dotenv surface from the
 *   family requirement; it does **not** retarget it at loopback. Baking the
 *   `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` anchor into the committed
 *   dotenv file would ship a loopback API host to every environment that reads
 *   this profile, which is the off-edge host `audit-browser-workspace.mjs`
 *   rule G rejects.
 * - The application-public key is the **application ingress** from the topology,
 *   not the API edge, with the dev ingress port removed — a `:3901` web dev bind
 *   is a dev-process fact, not part of the promoted artifact.
 *
 * Both of those are exactly `applyViteSurfaceCloudValues` — the function
 * `sdkwork-specs/tools/materialize-client-env.mjs` uses for the same surface
 * type in every sibling repository. It is called here rather than re-derived:
 * a second implementation of the same folding/scheme/binding rules is how this
 * file previously shipped an application-public key bound to the *API* host and
 * dropped the platform-gateway key entirely.
 *
 * `standalone` keeps the canonical root-relative `/` path, which
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1 reserves for that profile; its
 * application-public key is the topology ingress (an absolute address), matching
 * the reference roots.
 *
 * @param {object} surface surface descriptor
 * @param {string} profileId canonical profile id
 * @param {string} repoRoot absolute path of the repository root, which owns the
 *   deployment authority the runtime document is derived from
 */
function rootEnvFile(surface, profileId, repoRoot) {
  const [deploymentProfile, environment] = profileId.split('.');
  const isStandalone = deploymentProfile === 'standalone';
  const topology = readProfileEnvValues(repoRoot, profileId);
  /**
   * `/` is the canonical same-origin SDK base of a `standalone` browser surface,
   * and the value the runtime document carries for that profile. A `cloud`
   * surface starts from the topology's declared domain gateway, which
   * `applyViteSurfaceCloudValues` folds to the primary registered edge below.
   */
  const apiBase = isStandalone
    ? '/'
    : topology.SDKWORK_IAM_PLATFORM_API_GATEWAY_HTTP_URL ?? '';
  const candidates = {
    VITE_SDKWORK_DEPLOYMENT_PROFILE: deploymentProfile,
    VITE_SDKWORK_ENVIRONMENT: environment,
    VITE_SDKWORK_IAM_API_BASE_URL: apiBase,
    VITE_SDKWORK_IAM_APP_API_BASE_URL: apiBase,
    VITE_SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL:
      topology.SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL ?? '',
    VITE_SDKWORK_IAM_DEPLOYMENT_PROFILE: deploymentProfile,
    VITE_SDKWORK_IAM_ENVIRONMENT: environment,
    VITE_SDKWORK_IAM_ISSUER: runtimeEnvDocument(surface, profileId, repoRoot).iamIssuer,
    VITE_SDKWORK_IAM_PLATFORM_API_GATEWAY_HTTP_URL: apiBase,
    VITE_SDKWORK_IAM_PROFILE_ID: profileId,
    VITE_SDKWORK_IAM_RUNTIME_TARGET: surface.runtimeTarget,
    VITE_SDKWORK_PROFILE_ID: profileId,
    VITE_SDKWORK_RUNTIME_TARGET: surface.runtimeTarget,
  };
  const entries = isStandalone
    ? candidates
    : applyViteSurfaceCloudValues(
        candidates,
        topology,
        { deploymentProfile, environment, profileId },
        { repositoryRoot: repoRoot, origins: cloudApiOriginsFor(repoRoot, environment) },
      );
  return [
    `# Generated from etc/topology/${profileId}.env (${profileId}).`,
    '# Regenerate with: pnpm workflow:materialize-client-env',
    ...Object.keys(entries)
      .filter((key) => String(entries[key]).trim().length > 0)
      .sort()
      .map((key) => `${key}=${entries[key]}`),
    '',
  ].join('\n');
}

function zhTitle(route) {  const map = {
    'iam.auth.login.title': '登录',
    'iam.auth.register.title': '注册',
    'iam.auth.forgotPassword.title': '找回密码',
    'iam.auth.oauthCallback.title': '授权回调',
    'iam.auth.contextSelection.title': '选择登录上下文',
    'iam.userCenter.profile.title': '个人资料',
    'iam.userCenter.password.title': '修改密码',
    'iam.accountBinding.list.title': '账号绑定',
    'iam.user.list.title': '用户列表',
    'iam.tenant.overview.title': '租户概览',
    'iam.organization.directory.title': '组织通讯录',
    'iam.oauth.providers.title': 'OAuth 提供方',
    'iam.console.tenant.overview.title': '租户管理',
    'iam.console.organization.directory.title': '组织管理',
    'iam.console.accountBinding.list.title': '账号绑定管理',
    'iam.console.userCenter.profile.title': '用户中心',
    'iam.admin.oauth.providers.title': 'OAuth 运维',
    'iam.admin.tenant.list.title': '租户运维',
    'iam.admin.organization.tree.title': '组织运维',
    'iam.admin.permission.roles.title': '角色',
    'iam.admin.permission.permissions.title': '权限',
    'iam.admin.permission.policies.title': '策略',
    'iam.admin.permission.authorizations.title': '授权',
    'iam.admin.accountBinding.list.title': '账号绑定运维',
    'iam.admin.user.list.title': '用户运维',
    'iam.admin.audit.events.title': '审计事件',
  };
  return map[route.titleKey] ?? route.titleKey;
}

function enTitle(route) {
  const map = {
    'iam.auth.login.title': 'Sign in',
    'iam.auth.register.title': 'Create account',
    'iam.auth.forgotPassword.title': 'Reset password',
    'iam.auth.oauthCallback.title': 'Authorization callback',
    'iam.auth.contextSelection.title': 'Choose login context',
    'iam.userCenter.profile.title': 'Profile',
    'iam.userCenter.password.title': 'Change password',
    'iam.accountBinding.list.title': 'Account binding',
    'iam.user.list.title': 'Users',
    'iam.tenant.overview.title': 'Tenant overview',
    'iam.organization.directory.title': 'Organization directory',
    'iam.oauth.providers.title': 'OAuth providers',
    'iam.console.tenant.overview.title': 'Tenant management',
    'iam.console.organization.directory.title': 'Organization management',
    'iam.console.accountBinding.list.title': 'Account binding management',
    'iam.console.userCenter.profile.title': 'User center',
    'iam.admin.oauth.providers.title': 'OAuth operations',
    'iam.admin.tenant.list.title': 'Tenant operations',
    'iam.admin.organization.tree.title': 'Organization operations',
    'iam.admin.permission.roles.title': 'Roles',
    'iam.admin.permission.permissions.title': 'Permissions',
    'iam.admin.permission.policies.title': 'Policies',
    'iam.admin.permission.authorizations.title': 'Authorizations',
    'iam.admin.accountBinding.list.title': 'Account binding operations',
    'iam.admin.user.list.title': 'User operations',
    'iam.admin.audit.events.title': 'Audit events',
  };
  return map[route.titleKey] ?? route.titleKey;
}

function packageManifest(surface, entry) {
  const isCore = entry.role === 'core' || entry.role === 'console-core' || entry.role === 'admin-core';
  const exports = isCore
    ? {
        '.': './src/index.ts',
        './sdk': './src/sdk/index.ts',
        './modules': './src/modules/index.ts',
        './host': './src/host/index.ts',
        './session': './src/session/index.ts',
        './composition': './src/composition/index.ts',
      }
    : { '.': './src/index.ts' };

  const dependencies = {};
  if (entry.role === 'capability') {
    const coreName =
      entry.surface === 'backend-admin'
        ? surface.adminCoreName
        : entry.surface === 'console'
          ? surface.consoleCoreName
          : surface.coreName;
    dependencies[coreName] = 'workspace:*';
    dependencies['@sdkwork/iam-service'] = 'workspace:*';
    dependencies['@sdkwork/iam-contracts'] = 'workspace:*';
  }
  if (entry.role === 'core' || entry.role === 'console-core') {
    dependencies['@sdkwork/iam-contracts'] = 'workspace:*';
    dependencies['@sdkwork/iam-runtime'] = 'workspace:*';
    dependencies['@sdkwork/iam-service'] = 'workspace:*';
    dependencies['@sdkwork/iam-app-sdk'] = 'workspace:*';
    if (surface.runtimeTarget === 'browser') {
      // The SDK boundary resolves the registered API edge family against the page
      // host through the shared §6.3 resolver, so the package that owns that
      // boundary declares the dependency instead of reaching into it implicitly.
      dependencies['@sdkwork/sdk-common'] = 'workspace:*';
    }
  }
  if (entry.role === 'admin-core') {
    dependencies['@sdkwork/iam-contracts'] = 'workspace:*';
    dependencies['@sdkwork/iam-service'] = 'workspace:*';
    dependencies['@sdkwork/iam-backend-sdk'] = 'workspace:*';
  }
  if (entry.role.endsWith('shell')) {
    const coreName =
      entry.role === 'admin-shell'
        ? surface.adminCoreName
        : entry.role === 'console-shell'
          ? surface.consoleCoreName
          : surface.coreName;
    dependencies[coreName] = 'workspace:*';
  }
  if (entry.role === 'commons') {
    dependencies['@sdkwork/iam-contracts'] = 'workspace:*';
  }
  if (entry.role === 'host') {
    dependencies['@sdkwork/iam-contracts'] = 'workspace:*';
  }

  return {
    name: entry.name,
    private: true,
    version: '0.1.0',
    type: 'module',
    description: `${entry.role} package for the ${surface.rootName} client root.`,
    exports,
    files: ['src', 'README.md'],
    scripts: {
      typecheck: 'tsc --noEmit',
    },
    dependencies,
    devDependencies: { typescript: 'catalog:' },
    sdkwork: {
      architecture: surface.architecture,
      surface: entry.surface === 'backend-admin' ? 'backend-admin' : entry.surface,
      domain: 'iam',
      capability: entry.capability ?? entry.role,
      packageType: isCore ? 'runtime' : 'feature',
      status: 'standardizing',
    },
  };
}

function adminCoreSdkSource(surface, entry) {
  const prefix = tierPrefix(surface, 'admin');
  return `${BANNER_COMMENT}
/**
 * Backend-admin SDK boundary. This is the only package in the client root that
 * may export backend SDK wrappers (APP_H5_ARCHITECTURE_SPEC §15).
 */

export interface ${prefix}BackendAdminSdkClient {
  readonly surface: 'backend-api';
  readonly baseUrl: string;
}

export function create${prefix.replace(/^iam/u, 'Iam')}BackendAdminSdkClient(
  baseUrl: string,
): ${prefix}BackendAdminSdkClient {
  if (!baseUrl) throw new Error('${entry.name}: backend admin base url is required');
  return { surface: 'backend-api', baseUrl };
}
`;
}

function hostPackageSource(surface, entry) {
  const prefix = tierPrefix(surface, 'app');
  const typePrefix = pascalFromIdent(prefix);
  if (surface.key === 'mp') {
    return `${BANNER_COMMENT}
import type { ${typePrefix}HostAdapter, ${typePrefix}HostCapability, ${typePrefix}HostOutcome } from '${surface.coreName}';

function unsupported<T>(capability: ${typePrefix}HostCapability): ${typePrefix}HostOutcome<T> {
  return { ok: false, error: { code: 'unsupported', message: capability + ' is unavailable on this platform' } };
}

/**
 * Typed wrappers over WeChat platform APIs. Feature packages depend on these
 * adapters, never on \`wx.*\` directly (MINI_PROGRAM_APP_ARCHITECTURE_SPEC §8).
 */
export interface ${typePrefix}HostAdapters extends ${typePrefix}HostAdapter {
  chooseMedia(): Promise<${typePrefix}HostOutcome<readonly string[]>>;
  scanCode(): Promise<${typePrefix}HostOutcome<string>>;
  getSystemInfo(): Promise<${typePrefix}HostOutcome<Record<string, string>>>;
}

export function create${prefix.replace(/^iam/u, 'Iam')}HostAdapters(): ${typePrefix}HostAdapters {
  const capabilities = new Set<${typePrefix}HostCapability>([
    'platformLogin',
    'camera',
    'qrScanner',
    'mediaPicker',
    'share',
    'networkStatus',
    'deviceInfo',
  ]);
  return {
    capabilities,
    hasCapability: (capability) => capabilities.has(capability),
    chooseMedia: async () => unsupported('mediaPicker'),
    scanCode: async () => unsupported('qrScanner'),
    getSystemInfo: async () => unsupported('deviceInfo'),
  };
}
`;
  }
  return `${BANNER_COMMENT}
import type { ${typePrefix}HostAdapter, ${typePrefix}HostCapability, ${typePrefix}HostOutcome } from '${surface.coreName}';

function unsupported<T>(capability: ${typePrefix}HostCapability): ${typePrefix}HostOutcome<T> {
  return { ok: false, error: { code: 'unsupported', message: capability + ' is unavailable on this platform' } };
}

/**
 * Single Capacitor host package for every shipped mobile platform
 * (APP_H5_ARCHITECTURE_SPEC §3). Per-platform differences belong in subtrees of
 * this package, never in a second package.
 */
export interface ${typePrefix}CapacitorHostAdapter extends ${typePrefix}HostAdapter {
  pickFile(): Promise<${typePrefix}HostOutcome<readonly string[]>>;
  scanQrCode(): Promise<${typePrefix}HostOutcome<string>>;
}

export function create${prefix.replace(/^iam/u, 'Iam')}CapacitorHostAdapter(): ${typePrefix}CapacitorHostAdapter {
  const capabilities = new Set<${typePrefix}HostCapability>([
    'deepLinks',
    'secureStorage',
    'camera',
    'qrScanner',
    'pushNotifications',
    'shareSheet',
    'networkStatus',
    'clipboard',
    'filePicker',
  ]);
  return {
    capabilities,
    hasCapability: (capability) => capabilities.has(capability),
    pickFile: async () => unsupported('filePicker'),
    scanQrCode: async () => unsupported('qrScanner'),
  };
}
`;
}
