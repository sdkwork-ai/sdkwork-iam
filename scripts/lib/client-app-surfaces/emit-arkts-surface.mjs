/**
 * Materializes the HarmonyOS/ArkTS client root: root scaffolding, the `entry`
 * module, the root test suite and the full package family.
 *
 * Same shape as `materializeDartSurface` in `emit-dart-surface.mjs`, and the same
 * authored-vs-generated rules (`createSurfaceWriter`). Only the file set, the
 * templates and the language-specific ownership table differ.
 *
 * Two Harmony-specific decisions:
 *
 * 1. **No pre-existing package suppresses writes.** `apps/sdkwork-iam-harmony-mobile`
 *    did not exist before this generator, so every package in it is generator
 *    output. `PRE_EXISTING_PACKAGE_DIRS` is therefore empty and the writer's git-index
 *    rule never fires; the package entry files are still written through `writeEntry`
 *    so the emitter keeps one code path for all four surfaces.
 * 2. **The runtime documents are derived, not hard-coded.** `config/app/runtime-env.*`
 *    comes from `etc/sdkwork.deployment.config.json` and `etc/topology/*.env`; see
 *    `readDeploymentAuthority` in `emit-arkts.mjs` for why.
 */

import path from 'node:path';

import { PROFILE_IDS, routeId, routesOfPackage } from './model.mjs';
import { GENERATED_BANNER, createSurfaceWriter, toPosix } from './emit-common.mjs';
import {
  adapterRegistrySource,
  authGateSource,
  bootstrapEnvironmentSource,
  bootstrapHostAdaptersSource,
  bootstrapIamRuntimeSource,
  bootstrapRoutesSource,
  bootstrapRuntimeSource,
  bootstrapSdkClientsSource,
  capabilityHostPortSource,
  commonsDir,
  controllerSource,
  coreAppSdkClientSource,
  coreCompositionSource,
  coreDependencyManifestSource,
  coreHostAdapterContractsSource,
  coreHostRegistrySource,
  coreRouteRegistrySource,
  coreModuleRegistrySource,
  corePackageJson,
  coreRuntimeEnvSource,
  coreSdkInventorySource,
  coreSdkSubpathSource,
  coreSessionSource,
  coreSubpathExports,
  coreTokenManagerSource,
  designTokensSource,
  entryAbilitySource,
  entryColorResources,
  entryIndexPageSource,
  entryMainPagesProfile,
  entryModuleJson,
  entryOhPackage,
  entrySource,
  entryStringResources,
  environmentContractSource,
  fragmentBundleSource,
  harmonyRuntimeEnvDocument,
  hostAdaptersSource,
  hostConfigExample,
  i18nFragment,
  i18nFragmentPath,
  i18nHelpersSource,
  i18nIndexSource,
  isCoreRole,
  isShellRole,
  kebabTokenOf,
  modelsSource,
  moduleNameOf,
  ohosTestSource,
  operatorProfileExample,
  packageBuildProfile,
  packageComponentSpec,
  packageModuleJson,
  packageOhPackage,
  pageSource,
  pascalFromDir,
  pascalTokenOf,
  readDeploymentAuthority,
  resolveRuntimeDocuments,
  rootBuildProfile,
  rootComponentSpec,
  rootOhPackage,
  rootPackageJson,
  routeContributionsSource,
  routePageMapSource,
  routeStackSource,
  runtimeConfigSource,
  screenStateSource,
  screenStateViewSource,
  sdkPortSource,
  serviceSource,
  shellRouteCompositionSource,
  shellRoutesSource,
  stateSource,
  summaryCardSource,
  tierOfEntry,
  viewModelSource,
  appScopeJson,
  appManifest,
  deploymentIndex,
} from './emit-arkts.mjs';

/**
 * Banner for ArkTS/TypeScript source files.
 *
 * `GENERATED_BANNER` is Markdown/JSON5 flavoured (`<!-- ... -->`). ArkTS rejects
 * HTML comments, so the two flavours are derived once here and never written by
 * hand. Markdown and JSON5 documents use `GENERATED_BANNER` through `docBanner()`.
 */
const BANNER = GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '');

/**
 * Closing ownership line shared by every document this module writes.
 *
 * Kept byte-identical to the other three surfaces so a cross-root diff of the
 * generated docs shows only real differences.
 */
const PUBLIC_DOC_LINE = 'Owner: `sdkwork-iam` maintainers.';

/**
 * Packages that predate the generator.
 *
 * Empty: this root is created by the generator, so every file in it is generator
 * output.
 */
export const PRE_EXISTING_PACKAGE_DIRS = new Set();

/**
 * Generator-owned files inside a package that predates the generator.
 *
 * Empty for the same reason. Kept as a named constant so the writer configuration
 * reads the same here as in the other three surfaces.
 */
const GENERATOR_OWNED_RELATIVE = [];

/** Line-comment form of the shared banner, for Markdown/YAML/JSON5 neighbours. */
function docBanner() {
  return `${GENERATED_BANNER}\n`;
}

/**
 * Host config environments.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 2 enumerates exactly these
 * four under `config/host/`, and the gate-passing sibling root carries exactly these
 * four. `demo` is absent from both, so this root does not invent it: `config/app/`
 * and `config/server/` are keyed by profile id and carry `demo`, while host config is
 * keyed by environment and does not.
 */
const HOST_CONFIG_ENVIRONMENTS = ['development', 'test', 'staging', 'production'];

function agentsMd(surface) {
  return `${docBanner()}# SDKWork IAM HarmonyOS Mobile

\`apps/${surface.rootName}\` is the SDKWork IAM **HarmonyOS native mobile** client
application root.

## Authority

- \`../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` — cross-client root,
  package taxonomy, route identity, dependency direction.
- \`../../../sdkwork-specs/${surface.architectureSpec}\` — this architecture's root standard.
- \`../../../sdkwork-specs/${surface.uiSpec}\` — ArkUI package rules.
- \`../../../sdkwork-specs/ENVIRONMENT_SPEC.md\` — required runtime-environment keys and
  the native HarmonyOS materialization.

## Cross-client references

- Cross-architecture IAM contracts/runtime: \`../../apps/sdkwork-iam-common/packages/\`.
- Cross-client route identity: the same route ids as the PC, H5, Flutter and mini
  program IAM roots; only the physical page path differs.

## Layout

- \`entry/\` — the installable Harmony application entry and composition module:
  ability, bootstrap, providers, route/page projection. No product workflows.
- \`packages/${surface.coreDir}/\` — runtime config, SDK factory contract, token manager,
  session store, host contracts, route registry.
- \`packages/${commonsDir(surface)}/\` — domain-neutral ArkUI primitives, design tokens,
  route contribution contract, locale helpers and the fragment loader.
- \`packages/${surface.packageDirPrefix}shell/\` — app shell, navigation and auth gate.
- \`packages/${surface.packageDirPrefix}<capability>/\` — one domain capability per package.
- \`packages/${surface.packageDirPrefix}console-*/\` — user-facing console family (app-api).
- \`packages/${surface.packageDirPrefix}admin-*/\` — internal operator family (backend-api, approved).
- \`packages/${surface.hostDir}/\` — HarmonyOS platform adapters.
- \`config/app/\` — per-profile non-secret runtime documents.
- \`config/host/\` — bundle id, module ids, device types, permissions, signing and
  distribution references. No secrets and no business route constants.

## Non-negotiable rules

- \`entry/\` stays thin: composition and registry only. Business pages, components,
  view models, controllers, services, state, i18n and route contributions live in
  packages.
- Capability packages never construct SDK clients and never import generated SDK
  packages; the bootstrap constructs the client and injects it through the port the
  capability declares.
- Feature packages never call HarmonyOS system APIs, hold an ability context, or
  handle a raw want. Platform behaviour goes through the typed adapters in
  \`packages/${surface.hostDir}/\`.
- Route ids align with every other client root; physical page paths may differ.

${PUBLIC_DOC_LINE}
`;
}

function readmeMd(surface, packages) {
  const capabilityCount = packages.filter((entry) => entry.role === 'capability').length;
  return `${docBanner()}# SDKWork IAM HarmonyOS Mobile

SDKWork IAM native HarmonyOS mobile client application root (\`apps/${surface.rootName}\`).

| Field | Value |
| --- | --- |
| Architecture | \`${surface.architecture}\` |
| Package segment | \`${surface.segment}\` |
| Runtime target | \`${surface.runtimeTarget}\` |
| App manifest | \`${surface.manifest}\` |
| Component spec | \`specs/component.spec.json\` |
| Deployment descriptor | \`etc/sdkwork.deployment.config.json\` |
| Route registry | \`packages/${surface.packageDirPrefix}{,console-,admin-}core/src/main/ets/composition/RouteRegistry.ets\` |
| Route composition | \`packages/${surface.packageDirPrefix}{,console-,admin-}shell/src/main/ets/routes/RouteRegistry.ets\` |
| Packages | ${packages.length} (${capabilityCount} capability) |
| Bundle name | \`${surface.bundleName}\` |

## Commands

The application build is HarmonyOS tooling, which is not part of this repository:

\`\`\`bash
ohpm install
hvigorw clean
hvigorw assembleHap
hvigorw assembleApp
hvigorw test
\`\`\`

The repository orchestrates the checks that can run without that toolchain through
pnpm:

\`\`\`bash
pnpm install
pnpm dev:standalone
pnpm test
pnpm check
\`\`\`

\`dev:standalone\`, \`dev:cloud\`, \`dev:harmony-native\` and \`stop\` drive the SDKWork
application lifecycle around this root. The HarmonyOS build commands are declared as
private \`_sdkwork:*\` hooks and are selected by the public lifecycle scripts, so no
command that cannot execute is advertised as one that can.

## Generated sources

\`entry/**\`, \`packages/**\`, \`config/**\`, \`specs/component.spec.json\`, this file and
\`AGENTS.md\` are generated by
\`node scripts/materialize-client-app-surfaces.mjs\` in the repository root
(\`sdkwork-iam\`). Edit the generator, not the output.

Two files are mirrored from the gate-passing sibling root rather than generated,
because they carry no application identity: \`entry/build-profile.json5\`,
\`hvigorfile.ts\` and \`hvigor/hvigor-config.json5\`.

${PUBLIC_DOC_LINE}
`;
}

function configReadme(surface) {
  return `${docBanner()}# config

| Directory | Owns |
| --- | --- |
| \`app/\` | Per-profile non-secret runtime documents (\`runtime-env.<deployment-profile>.<environment>.json\`). |
| \`host/\` | Bundle id, module ids, device types, permissions, app links, push and signing reference names, distribution references. |
| \`server/\` | Server profile templates, one per canonical profile. |
| \`container/\` | Container profile templates, one per canonical profile. |

The runtime documents under \`app/\` are **derived**, not authored: they come from
\`../../../etc/sdkwork.deployment.config.json\` and \`../../../etc/topology/<profile-id>.env\`
through the repository generator, and \`tests/harmony-runtime-config.test.mjs\`
re-derives them independently so drift fails the gate.

${PUBLIC_DOC_LINE}
`;
}

function hostConfigReadme(surface) {
  return `${docBanner()}# config/host

HarmonyOS bundle id, module metadata, device types, permissions, app links, push
profile references, signing reference names, and AppGallery/private distribution
references belong here.

Rules:

- Safe checked-in templates only. Files use the \`.example.json\` suffix.
- Must not contain signing private keys, auth tokens, refresh tokens, API keys,
  database credentials, private service endpoints, SDK ownership, or business
  route constants (\`${surface.architectureSpec}\` section 276).
- The bundle name in \`harmony.*.example.json\` must equal
  \`AppScope/app.json5#app.bundleName\` and
  \`sdkwork.app.config.json#app.identifiers.packageName\`; the root contract test
  asserts all three stay equal.
- The deep-link entry names only this application's own scheme and an empty path
  prefix. The template root's \`/app/communication\` is that application's business
  route and is exactly what section 276 excludes.

${PUBLIC_DOC_LINE}
`;
}

function sdksReadme(surface) {
  return `${docBanner()}# sdks

This directory follows \`SDK_WORKSPACE_GENERATION_SPEC.md\`.

This root consumes the \`sdkwork-iam-app-sdk\` and \`sdkwork-iam-backend-sdk\`
families owned by the repository-level \`sdks/\` workspace. It must not contain
hand-edited generated output and must not vendor a private transport copy.

| Target | State |
| --- | --- |
| typescript | materialized |
| dart | materialized |
| kotlin | materialized |
| swift | materialized |
| csharp | materialized |
| go | materialized |
| java | materialized |
| python | materialized |
| rust | materialized |
| arkts | _none_ — not produced by the SDK generation chain yet |

\`${surface.architectureSpec}\` section 6 requires Harmony packages to consume
\`/app/v3/api\` through generated ArkTS/TypeScript app SDK clients **adapted for the
Harmony runtime**. Because no ArkTS target is emitted yet,
\`packages/${surface.coreDir}\` declares the SDK **port** contract and the
base-URL/credential boundary in \`src/main/ets/sdk/AppSdkClient.ets\`, and the root
bootstrap injects the port. That is a declared seam, not a fabricated client: no raw
request API, manual auth header, copied React/Flutter/Kotlin/Swift wrapper, or local
DTO fork exists in this root.

Missing Harmony SDK methods are fixed in the OpenAPI/generator inputs and
regenerated, per section 6. Closing this gap is the one prerequisite that blocks a
real \`hvigorw assembleHap\`.

${PUBLIC_DOC_LINE}
`;
}

function docsReadme(surface) {
  return `${docBanner()}# docs

Local architecture notes and runbooks for \`apps/${surface.rootName}\`.

## Route identity

Every route this root ships carries the cross-client id
\`<surface>.<domain>.<capability>.<screen>\` that the PC, H5, Flutter and mini program
IAM roots declare. Only the physical Harmony page path differs, which
\`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` section 7 permits.

The mount table is generated into
\`entry/src/main/ets/pages/__generated__/RoutePageMap.ets\` from the same model that
emits each package's route contributions, so a route added to a package appears in
the navigator without anyone editing the root page.

## Verification

Where no HarmonyOS SDK, hvigor or ohpm is installed — the machine that generates
this root has none — the toolchain-free substitutes are:

\`\`\`bash
node ../../../sdkwork-iam/tools/check-arkts-imports.mjs --root .
node --test tests/harmony-runtime-config.test.mjs
node --test tests/harmony-surface-contract.test.mjs
\`\`\`

\`check-arkts-imports.mjs\` resolves every relative import and every
\`@sdkwork/<package>\` specifier against the files on disk and exits non-zero on the
first one that does not exist. It is strictly weaker than the ArkTS compiler: it
proves the import *graph* is connected, not that the types line up.

## Known follow-ups

- No ArkTS target of \`sdkwork-iam-app-sdk\` exists, so every capability's SDK port is
  unregistered and each capability renders its error state rather than data. See
  \`sdks/README.md\`.
- Every host adapter reports \`unsupported\`. Implementing one is a change to
  \`packages/${surface.hostDir}/src/main/ets/HostAdapters.ets\` alone, because feature
  code already handles the error value.
- The device locale is not read yet; the root page renders the default locale's
  fragment. The HarmonyOS localization-kit call needs the DevEco toolchain to
  compile.
- \`oh-package-lock.json5\` is not generated. Producing one requires \`ohpm install\`.

${PUBLIC_DOC_LINE}
`;
}

function scriptsReadme(surface) {
  return `${docBanner()}# scripts

Local build and release helpers for this HarmonyOS root belong here once the DevEco
toolchain is available. Nothing is required for that: every check that can run
without the HarmonyOS SDK runs from the repository root or from this root's
\`package.json\`.

There is deliberately no app-local runtime-config generator. The ten runtime
documents and the ArkTS projection of them are produced by the repository generator
(\`sdkwork-iam/scripts/materialize-client-app-surfaces.mjs\`) together with the rest
of this root, so an app-local script would be a second writer for one file.

There is also deliberately no \`check:harmony-native\` / \`build:harmony-native:*\`
alias: no HarmonyOS build command can run until DevEco Studio, a compatible
HarmonyOS SDK and a signing profile are installed, and a script that cannot execute
would be a false signal. \`${surface.architectureSpec}\` section 10 lists those
aliases as opt-in for roots whose tooling orchestrates Harmony; this root declares
the equivalents as private \`_sdkwork:*\` hooks instead.

${PUBLIC_DOC_LINE}
`;
}

function etcReadme() {
  return `${docBanner()}# etc

Source configuration authority for this client root. \`sdkwork.deployment.config.json\`
is the component deployment descriptor consumed by \`sdkwork-specs\` tooling.

\`materialization.deferred\` records that
\`sdkwork-specs/tools/materialize-client-env.mjs\` implements no Harmony surface
format. The documents under \`config/app/\` are still generated rather than authored —
by this repository's generator — and \`tests/harmony-runtime-config.test.mjs\` proves
they agree with the deployment authority.

${PUBLIC_DOC_LINE}
`;
}

function gitignore() {
  return `# HarmonyOS / DevEco build output
/build/
/entry/build/
/packages/*/build/
/oh_modules/
/entry/oh_modules/
/packages/*/oh_modules/
/.hvigor/
/.idea/
/.cxx/
local.properties
*.har
*.hap
*.hsp
*.app

# HarmonyOS signing material and operator-local host overrides
*.p12
*.cer
*.p7b
*.csr
config/host/harmony.local.*.json
signing/
`;
}

/**
 * Root contract suite: runtime documents.
 *
 * Re-derives every endpoint from the deployment authority with its **own** reader
 * rather than importing the generator's. Importing it would make the suite a
 * tautology — it would prove the generator is deterministic, not that its output is
 * right — and the whole point of the file is to catch a wrong derivation.
 */
function runtimeConfigTest(surface) {
  return `${BANNER}
/**
 * Runtime-configuration contract for the ${surface.rootName} root.
 *
 * Authority: \`ENVIRONMENT_SPEC.md\` sections 5.1.0.1, 5.1.2, 5.1.3 and 5.1.4.1.
 *
 * The ten documents under \`config/app/\` are generated from
 * \`etc/sdkwork.deployment.config.json\` and \`etc/topology/<profile-id>.env\`. This
 * suite re-derives every endpoint from those same files through its own reader and
 * asserts the checked-in documents still agree, so "generated" cannot quietly become
 * "whatever the generator happened to write".
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '..');
const REPO_ROOT = path.resolve(APP_ROOT, '..', '..');
const RUNTIME_DIR = path.join(APP_ROOT, 'config', 'app');
const AUTHORITY = path.join(REPO_ROOT, 'etc', 'sdkwork.deployment.config.json');
const GENERATED_ENTRY = path.join(APP_ROOT, 'entry', 'src', 'main', 'ets', 'generated', 'RuntimeConfig.ets');
const DEPLOYMENT_CONFIG = path.join(APP_ROOT, 'etc', 'sdkwork.deployment.config.json');

const PROFILE_IDS = [
  'cloud.demo',
  'cloud.development',
  'cloud.production',
  'cloud.staging',
  'cloud.test',
  'standalone.demo',
  'standalone.development',
  'standalone.production',
  'standalone.staging',
  'standalone.test',
];

const DEFAULT_PROFILE_ID = 'standalone.development';
const RUNTIME_TARGET = 'harmony-native';
const CANONICAL_API_PREFIXES = ['/app/v3/api', '/backend/v3/api'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function readProfileEnv(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\\r?\\n/u)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;
    values[trimmed.slice(0, separator).trim()] = trimmed.slice(separator + 1).trim();
  }
  return values;
}

function stripTrailingSlashes(value) {
  let normalized = value;
  while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

function websocketOf(origin) {
  if (origin.startsWith('https://')) return 'wss://' + origin.slice('https://'.length);
  if (origin.startsWith('http://')) return 'ws://' + origin.slice('http://'.length);
  throw new Error('cannot derive a websocket origin from ' + origin);
}

/** Independently re-derives one document from the deployment authority. */
function derive(profileId) {
  const authority = readJson(AUTHORITY);
  const [deploymentProfile, environment] = profileId.split('.');
  const values = readProfileEnv(path.join(REPO_ROOT, 'etc', authority.profiles[profileId].config));
  const applicationOrigin = stripTrailingSlashes(authority.environments[environment].applicationOrigin);
  if (deploymentProfile === 'standalone') {
    const origin = stripTrailingSlashes(values.SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL);
    return {
      application: { publicHttpUrl: origin, publicWebsocketUrl: websocketOf(origin) },
      appbase: { appApiBaseUrl: origin, loginUrl: origin },
      platform: { apiGatewayHttpUrl: origin },
    };
  }
  const family = authority.environments[environment].cloudApiBaseUrl;
  const primary = family.split(';')[0].trim();
  const localGateway = stripTrailingSlashes(values.SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL ?? '');
  const apiBase = localGateway.length > 0 ? localGateway : family;
  return {
    application: {
      publicHttpUrl: applicationOrigin,
      publicWebsocketUrl: websocketOf(primary),
    },
    appbase: { appApiBaseUrl: apiBase, loginUrl: applicationOrigin },
    platform: { apiGatewayHttpUrl: apiBase },
  };
}

function readRuntimeDocument(profileId) {
  return readJson(path.join(RUNTIME_DIR, 'runtime-env.' + profileId + '.json'));
}

describe('harmony runtime config', () => {
  it('tracks exactly the ten registered profiles', () => {
    const profiles = fs
      .readdirSync(RUNTIME_DIR)
      .filter((name) => /^runtime-env\\..+\\.json$/u.test(name))
      .map((name) => name.slice('runtime-env.'.length, -'.json'.length))
      .sort((a, b) => a.localeCompare(b));
    assert.deepEqual(profiles, PROFILE_IDS);
  });

  it('declares identity keys that agree with the filename and each other', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.equal(document.profileId, profileId, profileId + ': profileId');
      assert.equal(
        document.profileId,
        document.deploymentProfile + '.' + document.environment,
        profileId + ': profileId must be <deploymentProfile>.<environment>',
      );
      assert.equal(document.runtimeTarget, RUNTIME_TARGET, profileId + ': runtimeTarget');
    }
  });

  it('declares metadata that names this application', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.equal(document.metadata.applicationCode, 'iam', profileId + ': metadata.applicationCode');
      assert.equal(document.metadata.namespace, '${surface.rootName}', profileId + ': metadata.namespace');
    }
  });

  it('materializes endpoints that equal the deployment authority derivation', () => {
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      assert.deepEqual(
        {
          application: document.application,
          appbase: document.appbase,
          platform: document.platform,
        },
        derive(profileId),
        profileId + ': the tracked document must equal the deployment authority derivation',
      );
    }
  });

  it('materializes absolute origins with the expected scheme', () => {
    const websocketKeys = new Set(['publicWebsocketUrl']);
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      for (const group of ['application', 'appbase', 'platform']) {
        for (const key of Object.keys(document[group])) {
          for (const origin of String(document[group][key]).split(';')) {
            const match = /^([a-z][a-z0-9+.-]*):\\/\\/([^/\\s]+)$/u.exec(origin);
            assert.ok(match, profileId + ': ' + key + ' origin must be absolute, found ' + origin);
            const expected = websocketKeys.has(key) ? ['ws', 'wss'] : ['http', 'https'];
            assert.ok(
              expected.includes(match[1]),
              profileId + ': ' + key + ' must use ' + expected.join('/') + ', found ' + match[1],
            );
          }
        }
      }
    }
  });

  it('keeps base urls free of the canonical api prefix', () => {
    // ENVIRONMENT_SPEC.md section 5.1.4.1 assigns prefix normalization to the
    // generated SDK transport layer. A document that already carries the prefix
    // produces /app/v3/api/app/v3/api at request time.
    for (const profileId of PROFILE_IDS) {
      const document = readRuntimeDocument(profileId);
      for (const group of ['application', 'appbase', 'platform']) {
        for (const key of Object.keys(document[group])) {
          for (const prefix of CANONICAL_API_PREFIXES) {
            assert.ok(
              !String(document[group][key]).includes(prefix),
              profileId + ': ' + key + ' must be a bare origin',
            );
          }
        }
      }
    }
  });

  it('records the deferred materialization instead of a fabricated command', () => {
    const config = readJson(DEPLOYMENT_CONFIG);
    assert.equal(config.materialization.checkedIn, true, 'checkedIn');
    assert.equal(config.materialization.deferred, true, 'deferred');
    assert.ok(
      String(config.materialization.deferredReason ?? '').length > 0,
      'a deferred materialization must state its reason',
    );
    assert.equal(config.materialization.runtimeTarget, RUNTIME_TARGET, 'runtimeTarget');
    assert.equal(
      config.materialization.command,
      undefined,
      'a deferred materialization must not declare a command',
    );
    assert.deepEqual(
      [...config.materialization.profiles].sort((a, b) => a.localeCompare(b)),
      PROFILE_IDS,
      'declared profiles must match the tracked documents',
    );
    for (const profileId of PROFILE_IDS) {
      const source = config.profiles[profileId]?.source;
      assert.ok(source, 'profile ' + profileId + ' must declare its source document');
      assert.ok(
        fs.existsSync(path.join(APP_ROOT, 'etc', source)),
        'profile ' + profileId + ' source ' + source + ' must resolve to a real file',
      );
    }
  });

  it('projects every profile into the generated ArkTS module', () => {
    // Quote style is not the contract; content is. Normalizing to single quotes
    // keeps these assertions about which profiles and which default are projected,
    // instead of failing the moment the emitter's string style changes.
    const generated = fs.readFileSync(GENERATED_ENTRY, 'utf8').replaceAll('"', "'");
    assert.ok(
      generated.includes('GENERATED FILE - DO NOT EDIT'),
      'the generated module must be marked as generated',
    );
    for (const profileId of PROFILE_IDS) {
      assert.ok(
        generated.includes("profileId: '" + profileId + "'"),
        'generated RuntimeConfig.ets is missing profile ' + profileId,
      );
    }
    assert.ok(
      generated.includes("IAM_HARMONY_DEFAULT_PROFILE_ID: string = '" + DEFAULT_PROFILE_ID + "'"),
      'the generated module must pin the default profile id',
    );
    assert.ok(
      generated.includes("from '../bootstrap/EnvironmentContract'"),
      'the generated module must import the document contract, not redeclare it',
    );
    assert.ok(
      !generated.includes('metadata'),
      'the projection must not carry metadata, which the contract interface does not declare',
    );
  });
});
`;
}

/**
 * Root contract suite: ArkTS surface contract.
 *
 * `sdkwork-specs/tools/lib/frontend-composition.mjs` scans only `.ts`/`.tsx`/`.js`/`.jsx`,
 * so every ArkTS file is invisible to the workspace gate's dependency-direction and
 * raw-SDK-import rules. This suite applies those rules to `.ets` and adds the route
 * and locale alignment the architecture standard requires.
 */
function surfaceContractTest(surface, packages) {
  const family = packages.map((entry) => entry.dir).sort((a, b) => a.localeCompare(b));
  const routeIds = [];
  for (const entry of packages) {
    if (entry.role !== 'capability') continue;
    for (const route of routesOfPackage(entry)) routeIds.push(routeId(route));
  }
  const sortedIds = [...new Set(routeIds)].sort((a, b) => a.localeCompare(b));
  return `${BANNER}
/**
 * Surface contract for the ${surface.rootName} root.
 *
 * Authority: \`${surface.architectureSpec}\` sections 1, 3, 4, 5, 6, 8 and 11, and
 * \`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` section 7.
 *
 * \`sdkwork-specs/tools/lib/frontend-composition.mjs\` scans only \`.ts\`, \`.tsx\`,
 * \`.js\` and \`.jsx\`; every ArkTS file in this root is \`.ets\`, so the workspace
 * gate's dependency-direction and raw-SDK-import rules reach none of it. This suite
 * applies those rules to ArkTS and adds the cross-client route and locale alignment
 * the standard requires.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(HERE, '..');
const PACKAGES_DIR = path.join(APP_ROOT, 'packages');
const ENTRY_ETS = path.join(APP_ROOT, 'entry', 'src', 'main', 'ets');
const HOST_DIR = path.join(PACKAGES_DIR, '${surface.hostDir}');

const FAMILY_PACKAGES = [
${family.map((dir) => `  '${dir}',`).join('\n')}
];

/**
 * The capability packages of the family.
 *
 * Every other member is infrastructure, and the split decides which assertions
 * apply: only a capability ships locale fragments, a service/port/state/view-model
 * stack and a route contribution. \`commons\` in particular owns the fragment loader
 * and the i18n helpers with no locale tree of its own, so asserting "both locales"
 * against the whole family reported a defect that was not there.
 */
const INFRASTRUCTURE_SUFFIXES = ['-commons', '-core', '-shell', '-host'];
const CAPABILITY_PACKAGES = FAMILY_PACKAGES.filter(
  (name) => !INFRASTRUCTURE_SUFFIXES.some((suffix) => name.endsWith(suffix)),
);

/** The cross-client route ids of APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC section 7. */
const CROSS_CLIENT_ROUTE_IDS = [
${sortedIds.map((id) => `  '${id}',`).join('\n')}
];

const BUSINESS_SDK_RE = /(?:^|\\/|@sdkwork\\/)[a-z0-9-]+-(?:app|backend)-sdk(?:$|\\/)/u;

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(readText(file));
}

function listFiles(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'oh_modules' || entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, filter, out);
      continue;
    }
    if (filter(entry.name)) out.push(full);
  }
  return out;
}

/** Extracts import specifiers, with comments stripped so prose cannot look like an import. */
function extractImportSpecifiers(source) {
  const withoutBlockComments = source.replace(/\\/\\*[\\s\\S]*?\\*\\//gu, '');
  const withoutLineComments = withoutBlockComments.replace(/^\\s*\\/\\/.*$/gmu, '');
  const specifiers = [];
  for (const match of withoutLineComments.matchAll(/\\bfrom\\s+['"]([^'"]+)['"]/gu)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function collectQuotedKeys(source) {
  const keys = [];
  for (const match of source.matchAll(/^\\s*['"]([a-zA-Z0-9_.]+)['"]\\s*:/gmu)) {
    keys.push(match[1]);
  }
  return keys;
}

describe('harmony surface contract', () => {
  it('ships every family package with its ohpm manifest and public boundary', () => {
    for (const name of FAMILY_PACKAGES) {
      const packageDir = path.join(PACKAGES_DIR, name);
      assert.ok(fs.existsSync(packageDir), name + ': package directory is missing');
      for (const required of [
        'oh-package.json5',
        'build-profile.json5',
        'specs/component.spec.json',
        path.join('src', 'main', 'ets', 'Index.ets'),
      ]) {
        assert.ok(fs.existsSync(path.join(packageDir, required)), name + '/' + required + ' is missing');
      }
    }
  });

  it('gives the host package no package.json and the cores exactly one', () => {
    // HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md section 4: a host package MUST NOT
    // carry a package.json - ohpm does not read it and check-client-host-packages
    // reports it as migration debt. The one package.json this root may carry inside
    // packages/ is the core's composition contract.
    const hostPackageJson = path.join(HOST_DIR, 'package.json');
    assert.ok(!fs.existsSync(hostPackageJson), 'the host package must not carry a package.json');
    // Exactly three directories in the family carry a composition package.json:
    // the app core, the console core and the admin core. Every other package
    // (commons, shell, host, capabilities, console capabilities, admin
    // capabilities) is resolved by ohpm through oh-package.json5 only.
    for (const name of FAMILY_PACKAGES) {
      const isCore = name.endsWith('-core');
      if (!isCore) continue;
      const corePackageJson = path.join(PACKAGES_DIR, name, 'package.json');
      assert.ok(fs.existsSync(corePackageJson), name + ' must carry its composition package.json');
      const parsed = readJson(corePackageJson);
      assert.equal(parsed.sdkwork.role.startsWith('harmony-arkts-'), true, name + ': sdkwork.role');
    }
    const rootPackageJson = readJson(path.join(APP_ROOT, 'package.json'));
    assert.ok(
      !rootPackageJson.dependencies || !rootPackageJson.dependencies['@sdkwork/' + '${surface.hostDir}'],
      'the root manifest is not the ohpm dependency graph',
    );
  });

  it('respects the dependency direction of section 5 and keeps the graph acyclic', () => {
    const graph = new Map();
    const capabilityNames = new Set();
    for (const name of FAMILY_PACKAGES) {
      if (!/-(?:core|commons|shell|host)$/u.test(name)) capabilityNames.add(name);
    }
    for (const name of FAMILY_PACKAGES) {
      const deps = Object.keys(
        readJson(path.join(PACKAGES_DIR, name, 'oh-package.json5')).dependencies ?? {},
      );
      graph.set('@sdkwork/' + name, deps.filter((dep) => dep.startsWith('@sdkwork/')));
      for (const dep of deps) {
        assert.notEqual(dep, '@sdkwork/' + name, name + ' must not depend on itself');
        if (/-(?:core|commons)$/u.test(name)) {
          assert.ok(
            !capabilityNames.has(dep.replace('@sdkwork/', '')),
            name + ': a core or commons package must not depend on a capability package',
          );
        }
        if (/-host$/u.test(name)) {
          assert.ok(!BUSINESS_SDK_RE.test(dep), name + ': the host package must not depend on a business SDK');
        }
      }
    }
    const visiting = new Set();
    const visited = new Set();
    const visit = (node, trail) => {
      if (visited.has(node)) return;
      assert.ok(!visiting.has(node), 'cyclic dependency: ' + [...trail, node].join(' -> '));
      visiting.add(node);
      for (const next of graph.get(node) ?? []) {
        if (graph.has(next)) visit(next, [...trail, node]);
      }
      visiting.delete(node);
      visited.add(node);
    };
    for (const node of graph.keys()) visit(node, []);
  });

  it('keeps generated business SDK imports out of every ArkTS package and the entry module', () => {
    const hits = [];
    for (const file of [
      ...listFiles(PACKAGES_DIR, (name) => name.endsWith('.ets')),
      ...listFiles(ENTRY_ETS, (name) => name.endsWith('.ets')),
    ]) {
      for (const specifier of extractImportSpecifiers(readText(file))) {
        if (BUSINESS_SDK_RE.test(specifier)) {
          hits.push(path.relative(APP_ROOT, file) + ': ' + specifier);
        }
      }
    }
    assert.deepEqual(
      hits,
      [],
      'ArkTS packages reach the SDK through the injected port, never through a generated SDK module',
    );
  });

  it('keeps every feature package clear of HarmonyOS system APIs', () => {
    // Section 7: host adapters own platform calls. A feature package that imports a
    // @kit.* module directly has moved that call out of the boundary.
    const hits = [];
    for (const name of FAMILY_PACKAGES) {
      if (name === '${surface.hostDir}' || /-core$/u.test(name)) continue;
      for (const file of listFiles(path.join(PACKAGES_DIR, name, 'src'), (entry) => entry.endsWith('.ets'))) {
        for (const specifier of extractImportSpecifiers(readText(file))) {
          if (/^@(?:kit|ohos)\\./u.test(specifier)) {
            hits.push(path.relative(APP_ROOT, file) + ': ' + specifier);
          }
        }
      }
    }
    assert.deepEqual(hits, [], 'only the host package and the entry module may import a @kit.* module');
  });

  it('publishes exactly the cross-client route ids, once each', () => {
    // The identities are authored in each tier core's registry, not in the capability
    // packages: a capability narrows its tier registry instead of restating the ids, and
    // the shell only joins the slices. Reading the cores is therefore the check that the
    // set still matches the cross-client table, and reading all three is what proves no
    // two tiers claim the same id.
    const contributions = [];
    for (const name of FAMILY_PACKAGES) {
      if (!/-core$/u.test(name)) continue;
      const file = path.join(
        PACKAGES_DIR, name, 'src', 'main', 'ets', 'composition', 'RouteRegistry.ets',
      );
      assert.ok(fs.existsSync(file), name + ': every tier core must own a route registry');
      for (const match of readText(file).matchAll(/^\\s*id: '([^']+)',$/gmu)) {
        contributions.push(match[1]);
      }
    }
    assert.deepEqual(uniqueSorted(contributions), CROSS_CLIENT_ROUTE_IDS, 'route ids must match the cross-client set');
    assert.equal(contributions.length, contributions.length === 0 ? 0 : new Set(contributions).size, 'no route id may be declared twice');
    for (const id of contributions) {
      assert.equal(id.split('.').length, 4, id + ': route id must have four segments');
    }
  });

  it('mounts every route id in the generated page projection', () => {
    const generated = readText(
      path.join(ENTRY_ETS, 'pages', '__generated__', 'RoutePageMap.ets'),
    );
    const declared = uniqueSorted(
      [...generated.matchAll(/^\\s*'([a-z][a-z0-9.-]+)',$/gmu)].map((match) => match[1]),
    );
    assert.deepEqual(declared, CROSS_CLIENT_ROUTE_IDS, 'the projection must mount every route id');
  });

  it('exposes one routable page and keeps every screen in a package', () => {
    const mainPages = readJson(
      path.join(APP_ROOT, 'entry', 'src', 'main', 'resources', 'base', 'profile', 'main_pages.json'),
    );
    assert.deepEqual(mainPages.src, ['pages/Index'], 'entry must expose exactly the root page');
    assert.ok(
      fs.existsSync(path.join(ENTRY_ETS, 'pages', 'Index.ets')),
      'the root page must exist',
    );
    const rootPage = readText(path.join(ENTRY_ETS, 'pages', 'Index.ets'));
    assert.ok(
      !rootPage.includes('/services/') && !rootPage.includes('fetch(') && !rootPage.includes('http.createHttp'),
      'the root page must hold no business workflow',
    );
  });

  it('declares the same locale key set in every capability locale', () => {
    for (const name of CAPABILITY_PACKAGES) {
      const i18nDir = path.join(PACKAGES_DIR, name, 'src', 'main', 'ets', 'i18n');
      assert.ok(fs.existsSync(i18nDir), name + ': every capability must ship a locale tree');
      const perLocale = new Map();
      for (const file of listFiles(i18nDir, (entry) => entry.endsWith('.ts'))) {
        const relative = path.relative(i18nDir, file).split(path.sep).join('/');
        const segments = relative.split('/');
        if (segments.length < 4) continue;
        perLocale.set(segments[0], collectQuotedKeys(readText(file)));
      }
      assert.ok(perLocale.size >= 2, name + ': every capability must ship both locales');
      const [first, ...rest] = [...perLocale.entries()];
      for (const [locale, keys] of rest) {
        assert.deepEqual(
          uniqueSorted(keys),
          uniqueSorted(first[1]),
          name + ': ' + locale + ' must declare the same key set as ' + first[0],
        );
      }
    }
  });

  it('keeps the locale fragments under their authored path', () => {
    for (const name of FAMILY_PACKAGES) {
      const i18nDir = path.join(PACKAGES_DIR, name, 'src', 'main', 'ets', 'i18n');
      if (!fs.existsSync(i18nDir)) continue;
      const fragments = listFiles(i18nDir, (entry) => entry.endsWith('.ts') || entry.endsWith('.json'))
        .map((file) => path.relative(i18nDir, file).split(path.sep).join('/'))
        .filter((relative) => relative !== 'index.ts')
        .sort((a, b) => a.localeCompare(b));
      for (const relative of fragments) {
        const segments = relative.split('/');
        assert.equal(
          segments.length,
          4,
          'I18N_SPEC line 202 fixes <locale>/<domain>/<capability>/<fragment>, found ' + relative,
        );
        assert.match(segments[0], /^[a-z]{2}-[A-Z]{2}$/u, relative + ': normalized BCP 47');
        assert.equal(segments[1], 'iam', relative + ': domain segment');
      }
    }
  });

  it('does not fork another client architecture into this root', () => {
    const hits = [];
    for (const file of listFiles(APP_ROOT, (name) => name.endsWith('.ets') || name.endsWith('.ts'))) {
      if (file.startsWith(path.join(APP_ROOT, 'tests'))) continue;
      for (const specifier of extractImportSpecifiers(readText(file))) {
        const foreign = /^@sdkwork\\/(sdkwork-iam-(?:h5|pc|mp|mini-program|flutter)[a-z-]*)/u.exec(specifier);
        if (foreign) hits.push(path.relative(APP_ROOT, file) + ': ' + specifier);
      }
    }
    assert.deepEqual(hits, [], 'section 3 forbids importing another architecture UI/runtime implementation');
  });

  it('keeps the host config secret-free and route-free, with one bundle name', () => {
    const hostDir = path.join(APP_ROOT, 'config', 'host');
    const appScope = readJson(path.join(APP_ROOT, 'AppScope', 'app.json5'));
    const manifest = readJson(path.join(APP_ROOT, 'sdkwork.app.config.json'));
    const bundleName = appScope.app.bundleName;
    assert.equal(
      manifest.app.identifiers.packageName,
      bundleName,
      'sdkwork.app.config.json must declare the same bundle name as AppScope/app.json5',
    );
    assert.match(bundleName, /^com\\.sdkwork\\.iam\\.mobile$/u, 'unexpected bundle name');
    for (const file of listFiles(hostDir, (name) => name.endsWith('.example.json'))) {
      const source = readText(file);
      const parsed = readJson(file);
      assert.equal(
        parsed.bundleName,
        bundleName,
        path.basename(file) + ': host config bundle name must equal AppScope/app.json5',
      );
      for (const key of ['secret', 'token', 'password', 'privateKey', 'apiKey']) {
        assert.ok(
          !new RegExp(key, 'iu').test(source),
          path.basename(file) + ': host config must not carry ' + key,
        );
      }
      for (const want of parsed.wants ?? []) {
        assert.equal(
          want.pathPrefix,
          '',
          path.basename(file) + ': section 276 forbids a business route constant in host config',
        );
      }
    }
  });
});
`;
}

/**
 * Materializes the HarmonyOS client root.
 *
 * @param {{surface: object, appRoot: string, repoRoot: string, packages: object[], writer: object, authoredFiles: Set<string>|null, dryRun: boolean}} input
 */
export function materializeArktsSurface({
  surface,
  appRoot,
  repoRoot,
  packages,
  writer,
  authoredFiles = null,
  dryRun = false,
}) {
  const surfaceWriter = createSurfaceWriter({
    appRoot,
    repoRoot,
    writer,
    authoredFiles,
    preExistingPackageDirs: PRE_EXISTING_PACKAGE_DIRS,
    generatorOwnedRelative: GENERATOR_OWNED_RELATIVE,
    dryRun,
  });
  const { write, writeJson, writeEntry } = surfaceWriter;

  // Derived once and reused by everything that needs an endpoint, so a document and
  // its ArkTS projection cannot disagree.
  const authority = readDeploymentAuthority(repoRoot);
  const resolved = resolveRuntimeDocuments(authority, repoRoot);
  const documents = PROFILE_IDS.map((profileId) =>
    harmonyRuntimeEnvDocument(surface, resolved[profileId]),
  );

  // ---- root: workspace and docs scaffolding ----
  write('AGENTS.md', agentsMd(surface));
  write('README.md', readmeMd(surface, packages));
  for (const name of ['CLAUDE', 'CODEX', 'GEMINI']) {
    write(`${name}.md`, `${docBanner()}# ${name}\n\nAuthority: read [AGENTS.md](AGENTS.md) first.\n`);
  }
  write('.gitignore', gitignore());
  write('.sdkwork/README.md', `${docBanner()}# .sdkwork\n\nSource-controlled workspace metadata for the \`${surface.rootName}\` client root: application-local agent skills and plugins. Governed by \`../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md\`.\n\n${PUBLIC_DOC_LINE}\n`);
  write('.sdkwork/skills/README.md', `${docBanner()}# skills\n\nApplication-local agent skills for \`apps/${surface.rootName}\` belong here. Skill directories use lower snake case and provide \`SKILL.md\` as the entrypoint.\n\n${PUBLIC_DOC_LINE}\n`);
  write('.sdkwork/plugins/README.md', `${docBanner()}# plugins\n\nApplication-local agent plugins for \`apps/${surface.rootName}\` belong here. Installable plugins declare \`.codex-plugin/plugin.json\` and document the skills, tools, scripts and verification they contribute.\n\n${PUBLIC_DOC_LINE}\n`);
  write('docs/README.md', docsReadme(surface));
  write('sdks/README.md', sdksReadme(surface));
  write('scripts/README.md', scriptsReadme(surface));
  write('config/README.md', configReadme(surface));
  write('config/host/README.md', hostConfigReadme(surface));
  write('etc/README.md', etcReadme());

  writeJson('sdkwork.app.config.json', appManifest(surface));
  writeJson('specs/component.spec.json', rootComponentSpec(surface, packages));
  writeJson('etc/sdkwork.deployment.config.json', deploymentIndex(surface));
  writeJson('package.json', rootPackageJson(surface));

  // ---- root: ohpm and hvigor manifests ----
  writeJson('oh-package.json5', rootOhPackage(surface, packages));
  writeJson('build-profile.json5', rootBuildProfile());
  writeJson('AppScope/app.json5', appScopeJson(surface));

  // ---- root: runtime documents and config templates ----
  for (const document of documents) {
    writeJson(
      `${surface.runtimeEnvDir}/${surface.runtimeEnvFileBase}.${document.profileId}.json`,
      document,
    );
  }
  for (const environment of HOST_CONFIG_ENVIRONMENTS) {
    writeJson(`config/host/harmony.${environment}.example.json`, hostConfigExample(surface, environment));
  }
  for (const profileId of PROFILE_IDS) {
    for (const kind of ['server', 'container']) {
      write(
        `config/${kind}/sdkwork-iam.${profileId}.toml.example`,
        operatorProfileExample(surface, kind, profileId),
      );
    }
  }

  // ---- entry module: manifests and resources ----
  writeJson('entry/oh-package.json5', entryOhPackage(surface, packages));
  writeJson('entry/src/main/module.json5', entryModuleJson());
  writeJson('entry/src/main/resources/base/element/string.json', entryStringResources());
  writeJson('entry/src/main/resources/base/element/color.json', entryColorResources());
  writeJson('entry/src/main/resources/base/profile/main_pages.json', entryMainPagesProfile());

  // ---- entry module: ability, bootstrap, generated projection, pages ----
  write('entry/src/main/ets/entryability/EntryAbility.ets', entryAbilitySource(surface));
  write('entry/src/main/ets/bootstrap/EnvironmentContract.ets', environmentContractSource(surface));
  write('entry/src/main/ets/bootstrap/Environment.ets', bootstrapEnvironmentSource(surface));
  write('entry/src/main/ets/bootstrap/SdkClients.ets', bootstrapSdkClientsSource(surface));
  write('entry/src/main/ets/bootstrap/IamRuntime.ets', bootstrapIamRuntimeSource(surface));
  write('entry/src/main/ets/bootstrap/HostAdapters.ets', bootstrapHostAdaptersSource(surface));
  write('entry/src/main/ets/bootstrap/Routes.ets', bootstrapRoutesSource(surface));
  write('entry/src/main/ets/bootstrap/Runtime.ets', bootstrapRuntimeSource(surface));
  write('entry/src/main/ets/generated/RuntimeConfig.ets', runtimeConfigSource(surface, documents));
  write('entry/src/main/ets/pages/__generated__/RoutePageMap.ets', routePageMapSource(surface, packages));
  write('entry/src/main/ets/pages/Index.ets', entryIndexPageSource(surface));

  // ---- entry module: on-device contract test ----
  write('entry/src/ohosTest/ets/test/Ability.test.ets', ohosTestSource(surface, packages));

  // ---- root: contract suites ----
  write('tests/harmony-runtime-config.test.mjs', runtimeConfigTest(surface));
  write('tests/harmony-surface-contract.test.mjs', surfaceContractTest(surface, packages));

  // ---- packages ----
  for (const entry of packages) {
    writePackage(surface, entry, packages, { write, writeJson, writeEntry });
  }

  return { planned: surfaceWriter.planned };
}

function writePackage(surface, entry, packages, io) {
  const { write, writeJson, writeEntry } = io;
  const packageDir = `packages/${entry.dir}`;
  const token = kebabTokenOf(entry);
  const pascal = pascalTokenOf(entry);

  writeJson(`${packageDir}/oh-package.json5`, packageOhPackage(surface, entry, packages));
  writeJson(`${packageDir}/build-profile.json5`, packageBuildProfile());
  writeJson(`${packageDir}/src/main/module.json5`, packageModuleJson(entry));
  write(
    `${packageDir}/README.md`,
    `${docBanner()}# ${entry.name}

| Field | Value |
| --- | --- |
| Role | \`${entry.role}\` |
| Surface | \`${entry.surface}\` |
| Capability | \`${entry.capability ?? '—'}\` |
| Layer role | \`${entry.layerRole}\` |
| ArkTS entry | \`src/main/ets/Index.ets\` |
| ohpm manifest | \`oh-package.json5\` |
| ohpm module | \`${moduleNameOf(entry)}\` |

${isCoreRole(entry) ? 'Composition core: owns the route registry, the SDK inventory, the session store and the host adapter contracts. It carries the one `package.json` a Harmony package may have, because `check-frontend-composition` reads it.' : `ArkTS package: provides its own screens, state and locale fragments for the \`${entry.capability ?? entry.role}\` capability.`}

${PUBLIC_DOC_LINE}
`,
  );
  writeEntry(`${packageDir}/src/main/ets/Index.ets`, entrySource(entry));
  writeJson(
    `${packageDir}/specs/component.spec.json`,
    packageComponentSpec(surface, entry, routesOfPackage(entry).map(routeId)),
  );

  if (entry.role === 'capability') {
    const routes = routesOfPackage(entry);
    write(`${packageDir}/src/main/ets/models/Models.ets`, modelsSource(surface, entry, routes));
    write(`${packageDir}/src/main/ets/services/${pascal}SdkPort.ets`, sdkPortSource(surface, entry));
    write(`${packageDir}/src/main/ets/services/${pascal}Service.ets`, serviceSource(surface, entry, routes));
    write(`${packageDir}/src/main/ets/state/${pascal}State.ets`, stateSource(surface, entry));
    write(
      `${packageDir}/src/main/ets/presentation/viewModels/${pascal}ViewModel.ets`,
      viewModelSource(surface, entry, routes),
    );
    write(
      `${packageDir}/src/main/ets/presentation/controllers/${pascal}Controller.ets`,
      controllerSource(surface, entry, routes),
    );
    write(`${packageDir}/src/main/ets/components/${pascal}SummaryCard.ets`, summaryCardSource(surface, entry));
    write(`${packageDir}/src/main/ets/pages/${pascal}Page.ets`, pageSource(surface, entry, routes));
    write(
      `${packageDir}/src/main/ets/routes/RouteContributions.ets`,
      routeContributionsSource(surface, entry),
    );
    write(`${packageDir}/src/main/ets/host/${pascal}HostPort.ets`, capabilityHostPortSource(surface, entry));
    write(`${packageDir}/src/main/ets/i18n/index.ts`, i18nIndexSource(entry));
    for (const locale of ['en-US', 'zh-CN']) {
      write(`${packageDir}/${i18nFragmentPath(entry, locale)}`, i18nFragment(entry, locale));
    }
    return;
  }

  if (entry.role === 'commons') {
    write(`${packageDir}/src/main/ets/theme/DesignTokens.ets`, designTokensSource());
    write(`${packageDir}/src/main/ets/state/ScreenState.ets`, screenStateSource());
    write(`${packageDir}/src/main/ets/components/ScreenStateView.ets`, screenStateViewSource());
    write(`${packageDir}/src/main/ets/i18n/I18nHelpers.ets`, i18nHelpersSource());
    write(`${packageDir}/src/main/ets/l10n/FragmentBundle.ets`, fragmentBundleSource(surface, entry));
    return;
  }

  if (isShellRole(entry)) {
    const tier = tierOfEntry(entry);
    write(`${packageDir}/src/main/ets/navigation/ShellRoutes.ets`, shellRoutesSource(surface, tier));
    write(`${packageDir}/src/main/ets/navigation/RouteStack.ets`, routeStackSource(surface, tier));
    write(`${packageDir}/src/main/ets/auth/AuthGate.ets`, authGateSource(surface, tier));
    // The composition lives in the shell, not the core: section 4 gives the shell
    // "route contribution assembly" and section 5 both states that "shell packages
    // compose route contributions" and forbids `core` from depending on a capability
    // package. A registry in the core would be core -> capability -> core, which
    // section 5 forbids outright.
    write(
      `${packageDir}/src/main/ets/routes/RouteRegistry.ets`,
      shellRouteCompositionSource(surface, tier, packages),
    );
    return;
  }

  if (entry.role === 'host') {
    write(`${packageDir}/src/main/ets/HostAdapters.ets`, hostAdaptersSource(surface, entry));
    write(`${packageDir}/src/main/ets/host/AdapterRegistry.ets`, adapterRegistrySource(surface));
    return;
  }

  // ---- tier cores ----
  const tier = tierOfEntry(entry);
  writeJson(`${packageDir}/package.json`, corePackageJson(surface, entry));
  write(`${packageDir}/src/composition/index.ets`, coreCompositionSource(surface, tier));
  write(
    `${packageDir}/src/main/ets/composition/DependencyManifest.ets`,
    coreDependencyManifestSource(surface, tier),
  );
  write(
    `${packageDir}/src/main/ets/composition/ModuleRegistry.ets`,
    coreModuleRegistrySource(surface, tier, packages),
  );
  // Section 4 gives the tier core the route registry. It is a static list and imports
  // no capability package, because section 5 forbids `core` from depending on one.
  write(
    `${packageDir}/src/main/ets/composition/RouteRegistry.ets`,
    coreRouteRegistrySource(surface, tier, packages),
  );
  write(
    `${packageDir}/src/main/ets/composition/SdkInventory.ets`,
    coreSdkInventorySource(surface, tier),
  );
  write(
    `${packageDir}/src/main/ets/composition/HostRegistry.ets`,
    coreHostRegistrySource(surface, tier),
  );
  write(`${packageDir}/src/main/ets/sdk/SdkInventory.ets`, coreSdkSubpathSource(surface, tier));
  write(`${packageDir}/src/main/ets/sdk/AppSdkClient.ets`, coreAppSdkClientSource(surface, tier));
  write(`${packageDir}/src/main/ets/session/SessionStore.ets`, coreSessionSource(surface, tier));
  // `./host` is a required subpath of every tier core, not only the app core:
  // app-composition.mjs fixes CORE_EXPORT_SUBPATHS to include './host' and
  // check-frontend-composition fails a core that omits it. Each core is its own
  // HAR, so the module-scope type names below do not collide across tiers.
  write(
    `${packageDir}/src/main/ets/host/HostAdapterContracts.ets`,
    coreHostAdapterContractsSource(surface, tier),
  );
  if (tier === 'app') {
    write(`${packageDir}/src/main/ets/sdk/TokenManager.ets`, coreTokenManagerSource(surface));
    write(`${packageDir}/src/main/ets/runtime/RuntimeEnv.ets`, coreRuntimeEnvSource(surface));
  }
}
