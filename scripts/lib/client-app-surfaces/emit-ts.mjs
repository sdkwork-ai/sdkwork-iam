/**
 * Emitters for the TypeScript client roots (H5 and mini program).
 *
 * Both roots share one package taxonomy, so the emitter is parameterised by a
 * surface descriptor from `model.mjs`. Everything it writes is deterministic;
 * generated files carry the `SDKWORK-CLIENT-APP-SURFACES-GENERATED` banner.
 */

import path from 'node:path';

import { APP_ID, ENVIRONMENTS, PROFILE_IDS, ROUTES, permissionCompositionFor, routeId, routesOfPackage, routesOfTier } from './model.mjs';
import { GENERATED_BANNER, relativeFrom, toPosix } from './emit-common.mjs';
import {
  CLOUD_SDK_BASE_URL_KEYS,
  cloudApiBaseForProfile,
  cloudBrowserApiOrigins,
  cloudPrimaryOrigin,
  cloudSdkBaseUrlFamily,
} from './cloud-api-base.mjs';

/**
 * Human-readable surface label used in `displayName` values.
 *
 * A ternary `key === 'h5' ? 'H5' : 'Mini Program'` silently labels the Harmony
 * and Flutter roots as mini programs, so every surface is spelled out.
 */
const SURFACE_TITLE = {
  h5: 'H5',
  mp: 'Mini Program',
  harmony: 'HarmonyOS Mobile',
  flutter: 'Flutter Mobile',
};

/**
 * Human-readable component title.
 *
 * `COMPONENT_SPEC.md` section 3 shows `"displayName": "SDKWork IAM PC Core"`, and
 * every authored template package follows that shape
 * (`SDKWork IM H5 Core`, `SDKWork IM Flutter Mobile Core`). `component.displayName`
 * is a label for humans; the machine name belongs in `component.name`.
 */
function displayNameFor(surface, entry) {
  const tokens = entry.dir
    .replace(/^sdkwork[-_]iam[-_]/u, '')
    .replace(/^(?:h5|mp|harmony[-_]mobile|flutter[-_]mobile)[-_]/u, '')
    .split(/[-_]/u)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1));
  return `SDKWork IAM ${SURFACE_TITLE[surface.key]} ${tokens.join(' ')}`;
}

/**
 * Manifest file names the client root actually carries, in `COMPONENT_SPEC.md`
 * section 3 shape (bare file names relative to `component.root`, not repo paths).
 *
 * Ground truth: `apps/sdkwork-im-mini-program/specs/component.spec.json` lists
 * `package.json`, `sdkwork.app.config.json`, and `project.config.json`; every
 * template package lists a bare `package.json`.
 */
const ROOT_EXTRA_MANIFESTS = {
  h5: [],
  mp: ['project.config.json'],
  harmony: [],
  flutter: [],
};

function rootManifestsFor(surface) {
  const extras = ROOT_EXTRA_MANIFESTS[surface.key];
  if (!extras) throw new Error(`no root manifest list for surface ${surface.key}`);
  return [surface.manifest, 'sdkwork.app.config.json', ...extras];
}

const CAPABILITY_PASCAL = {
  auth: 'Auth',
  'user-center': 'UserCenter',
  'account-binding': 'AccountBinding',
  user: 'User',
  tenant: 'Tenant',
  organization: 'Organization',
  oauth: 'Oauth',
  permission: 'Permission',
  audit: 'Audit',
};

function pascal(capability) {
  const found = CAPABILITY_PASCAL[capability];
  if (!found) throw new Error(`no Pascal token for capability ${capability}`);
  return found;
}

/** `h5` -> `iamH5`, `mp` -> `iamMp`. */
function identPrefix(surface) {
  return `iam${surface.segment.replace(/^./u, (c) => c.toUpperCase())}`;
}

function kebabFromPascal(value) {
  return value.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
}

/** The platform-specific presentation key for one root. */
function presentationKey(surface) {
  if (surface.key === 'h5') return 'h5Mobile';
  if (surface.key === 'mp') return 'miniProgram';
  if (surface.key === 'harmony') return 'harmonyNative';
  return 'flutterMobile';
}

function presentationValue(surface, route) {
  return route.presentation[presentationKey(surface)] ?? 'page';
}

/** Mini program pages live in subpackages keyed by capability (spec §5). */
function miniProgramPlacement(route) {
  if (route.surface === 'app') {
    if (route.capability === 'auth') return { subpackage: null, pagePath: `pages/${route.screen}/index` };
  }
  return {
    subpackage: `${route.surface}-${route.capability}`,
    pagePath: `pages/${route.screen}/index`,
  };
}

function runtimeBaseName(route) {
  return `${kebabFromPascal(pascal(route.capability))}`;
}

// ---------------------------------------------------------------------------
// shared JSON payloads
// ---------------------------------------------------------------------------

function appManifest(surface) {
  const app = {
    key: surface.rootName,
    name: `SDKWork IAM ${SURFACE_TITLE[surface.key]}`,
    displayName: `SDKWork IAM ${SURFACE_TITLE[surface.key]}`,
    description: surface.description,
    vendor: 'SDKWork',
    officialWebsiteUrl: `https://sdkwork.com/apps/${surface.rootName}`,
    supportUrl: 'https://sdkwork.com/support',
    privacyPolicyUrl: 'https://sdkwork.com/privacy',
    termsOfServiceUrl: 'https://sdkwork.com/terms',
    iconUrl: `https://cdn.sdkwork.com/apps/${surface.rootName}/assets/icon-1024.png`,
    appType: surface.appType,
    versionSource: surface.versionSource,
    identifiers: {
      packageName: surface.bundleName ?? null,
      bundleId: surface.bundleName ?? null,
      desktopAppId: null,
      containerImage: surface.containerImage,
    },
  };

  const manifest = {
    schemaVersion: 3,
    kind: 'sdkwork.app',
    app,
    backend: {
      profileKey: 'backend-root-admin',
      ownerMode: 'tenant',
      grantMode: 'current',
      platform: surface.platform,
      appId: 'sdkwork-iam',
      serviceId: 'sdkwork-api-iam-assembly',
      tenantId: '100001',
      organizationId: '0',
      accessTokenPermissionScope: [
        'iam:self',
        'iam.users.read',
        'iam.organizations.read',
        'iam.roles.read',
        'iam.permissions.read',
      ],
    },
    runtime: {
      family: surface.runtimeFamily,
      framework: surface.runtimeFramework,
      runtimes: [surface.platform],
      deliveryModes: surface.deliveryModes,
      defaultPlatform: surface.platform,
      defaultArchitecture: surface.architecture,
      targetPlatforms: [surface.architecture],
      clientArchitectures: [surface.architecture],
      supportedDeploymentProfiles: ['standalone', 'cloud'],
      defaultDeploymentProfile: 'standalone',
    },
    media: {
      icons: {
        primary: {
          id: `${surface.rootName}-primary-icon`,
          type: 'ICON',
          purpose: 'PRIMARY',
          url: `https://cdn.sdkwork.com/apps/${surface.rootName}/assets/icon-1024.png`,
          platform: surface.platform === 'H5' ? 'APP' : surface.platform,
          locale: 'en-US',
          width: 1024,
          height: 1024,
          format: 'PNG',
          fileSizeBytes: 524288,
          alphaChannel: surface.key !== 'h5',
          enabled: true,
          metadata: { generatedPlaceholder: true },
        },
        platform: [],
        metadata: { generatedPlaceholder: true },
      },
      screenshots: [],
      previews: [],
      metadata: { assetVersion: '0.1.0', defaultLocale: 'en-US' },
    },
    publish: {
      status: 'DRAFT',
      preLaunch: true,
      installSkill: false,
      platforms: surface.publishPlatforms,
      installPlatforms: surface.publishPlatforms,
      config: {
        workspaceRoot: `apps/${surface.rootName}`,
        framework: surface.runtimeFramework,
        managedBy: 'sdkwork-iam-client-app-surfaces',
      },
    },
    artifacts: {
      installConfig: {
        packages: [],
        metadata: {
          workspaceRoot: `apps/${surface.rootName}`,
          framework: surface.runtimeFramework,
          packageManager: surface.manifestPackageManager,
          releaseBuildDeferred: true,
          releaseBuildDeferredReason:
            surface.key === 'mp'
              ? 'WeChat DevTools CLI is not available in this environment, so the mini program bundle cannot be built or previewed here.'
              : 'No release lane is configured for this client root yet; the root ships source and contract verification only.',
        },
      },
    },
    release: {
      currentVersion: '0.1.0',
      defaultChannel: 'BETA',
      latest: { BETA: '0.1.0' },
      notes: [{ version: '0.1.0', channel: 'BETA', current: true, packageIds: [] }],
    },
    security: { checksumRequired: true, signatureRequired: false, sbomRequired: true },
    devApp: { build: { targets: [] }, sourceRoot: `apps/${surface.rootName}` },
    metadata: {
      standardOwner: 'sdkwork-iam',
      initializedAt: '2026-09-18T00:00:00Z',
      deploymentConfig: 'etc/sdkwork.deployment.config.json',
      releaseAuthority: '../../sdkwork.workflow.json',
      architectureSpec: surface.architectureSpec,
      runtimeTarget: surface.runtimeTarget,
    },
  };

  if (surface.appTypeNote) manifest.metadata.appTypeNote = surface.appTypeNote;
  return manifest;
}

function rootComponentSpec(surface, packages) {
  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: surface.rootName,
      displayName: `SDKWork IAM ${SURFACE_TITLE[surface.key]}`,
      version: '0.1.0',
      type: surface.componentType,
      root: `${APP_ID}/apps/${surface.rootName}`,
      domain: 'iam',
      declaredDomain: 'iam',
      capability: 'iam',
      status: 'standardizing',
      surface: 'app',
      languages: surface.languages,
      generated: false,
      private: true,
      manifests: rootManifestsFor(surface),
    },
    canonicalSpecs: [
      { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy, route identity, and dependency direction.' },
      { file: surface.architectureSpec, purpose: 'Client root architecture standard.' },
      { file: surface.uiSpec, purpose: 'Client package UI rules.' },
      { file: 'APP_COMPOSITION_SPEC.md', purpose: 'Native-authority application composition.' },
      { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'Generated SDK integration, TokenManager wiring, and dependency composition rules.' },
      { file: 'SOURCE_CONFIG_SPEC.md', purpose: 'Source configuration authority and component deployment descriptors.' },
      { file: 'TEST_SPEC.md', purpose: 'Contract, frontend, SDK, security, and documentation verification rules.' },
    ].map((entry) => ({
      ...entry,
      // 4 ups: apps/<root>/specs -> <root> -> apps -> sdkwork-iam -> workspace root.
      // The sibling roots still carry a 3-up path that predates the repo split
      // and does not resolve; generated roots use the working depth.
      path: `../../../../sdkwork-specs/${entry.file}`,
    })),
    contracts: {
      publicExports: [],
      runtimeEntrypoints: [],
      // `contracts.sdkClients` lists generated SDK client classes only when the
      // component owns a generated SDK family (COMPONENT_SPEC §136). This root
      // consumes SDK families owned by `sdks/**`, so the list stays empty.
      sdkClients: [],
      events: [],
      configKeys: [],
      routeManifest: null,
      // Route identity lives in the core package route registry, which is the
      // owner named by APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §233.
      routeRegistry: `packages/${surface.coreDir}/src/modules/index.ts`,
      packageCount: packages.length,
      layerRole: 'runtime-composition',
      providedPorts: [],
      requiredPorts: [],
    },
    integration: {
      authority: 'Root SDKWork specs remain authoritative. Local specs may extend but must not contradict them.',
      dependencyPolicy: 'Consumers integrate through public package exports, declared runtime entrypoints, generated SDK clients, or documented adapters only.',
      sdkPolicy: 'Generated SDK clients are injected through service/runtime boundaries; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'Language-specific packages follow their native manifest and build tools while preserving the same component contract.',
    },
    verification: {
      commands: [`node scripts/verify-client-app-surfaces.mjs --surface ${surface.key}`, `pnpm --filter "${surface.packageNamePrefix}*" typecheck`],
    },
  };
}

function deploymentIndex(surface) {
  // Every profile source is the tracked runtime document this root actually
  // materializes, so both halves come from the surface descriptor: the
  // directory from `runtimeEnvDir` and the file stem from `runtimeEnvFileBase`
  // (`runtime-env` for the JSON surfaces; `sdkwork` for Flutter's
  // `env/sdkwork.<profile-id>.json`, ENVIRONMENT_SPEC.md section 5.1.3).
  //
  // The previous version appended a literal `app` segment and a literal
  // `runtime-env` stem, so all ten sources of every client root named files
  // that do not exist — `../config/browser/app/runtime-env.standalone.development.json`
  // instead of `../config/browser/runtime-env.standalone.development.json`, and
  // `../env/app/runtime-env.<profile>.json` instead of
  // `../env/sdkwork.<profile>.json`.
  //
  // `check-source-config-standard.mjs` cannot see that class of error:
  // `inspectComponentDeploymentConfig` validates only `parentDeploymentConfig`
  // and `parentTopologySpec`, and `inspectDeploymentIndex` returns immediately
  // for a descriptor whose `kind` is not `sdkwork.deployment-index` — this one
  // is `sdkwork.component-deployment`. Resolving both halves from the
  // descriptor is what keeps the two from drifting apart again.
  //
  // The retired `envFileStyle === 'etc'` branch is gone with them: no surface
  // ever declared that style, so it only offered a silent way to emit a
  // repository-relative path where the descriptor needs a config-directory
  // relative one.
  const profiles = {};
  for (const profileId of PROFILE_IDS) {
    profiles[profileId] = {
      source: `../${surface.runtimeEnvDir}/${surface.runtimeEnvFileBase}.${profileId}.json`,
    };
  }
  // A browser root is *not* deferred. `sdkwork-specs/tools/build-browser-client.mjs`
  // implements this surface: it validates the selected source against
  // ENVIRONMENT_SPEC.md section 5.1.0/5.1.0.1 and materializes the deploy-time
  // document at `public/runtime-env.json`, which is what `loadRuntimeEnv()`
  // fetches. Declaring `output` is what switches that path on, and declaring the
  // real command keeps `deferred` from claiming the opposite. The sources stay
  // checked in, so the file itself is a build artifact and stays git-ignored
  // (`**/public/runtime-env.json` in the repository `.gitignore`).
  const materialization = surface.runtimeTarget === 'browser'
    ? {
        authority: '../../../etc/sdkwork.deployment.config.json',
        command: 'pnpm exec sdkwork-app build',
        format: 'json',
        output: '../public/runtime-env.json',
        outputPattern: `../${surface.runtimeEnvDir}/${surface.runtimeEnvFileBase}.{deploymentProfile}.{environment}.json`,
        profiles: [...PROFILE_IDS],
        runtimeTarget: surface.runtimeTarget,
        checkedIn: true,
      }
    : {
        authority: '../../../etc/sdkwork.deployment.config.json',
        format: 'json',
        outputPattern: `../${surface.runtimeEnvDir}/${surface.runtimeEnvFileBase}.{deploymentProfile}.{environment}.json`,
        profiles: [...PROFILE_IDS],
        runtimeTarget: surface.runtimeTarget,
        checkedIn: true,
        deferred: true,
        // A surface may know something more specific than "this format is missing":
        // the Harmony root, for example, *is* generated, just by this repository's
        // own generator rather than by the workspace materializer. Declaring the
        // generic sentence for it would understate what actually happens.
        deferredReason:
          surface.materializationDeferredReason ??
          'sdkwork-specs/tools/materialize-client-env.mjs does not implement this surface format yet. The runtime documents are authored and checked in and validated by the root contract test instead of being generated; declaring a generation command here would be a false signal.',
      };
  return {
    schemaVersion: 1,
    kind: 'sdkwork.component-deployment',
    application: surface.rootName,
    parentDeploymentConfig: '../../../etc/sdkwork.deployment.config.json',
    parentTopologySpec: '../../../specs/topology.spec.json',
    materialization,
    profiles,
  };
}

/**
 * One profile's runtime document.
 *
 * Two field vocabularies coexist because the spec gives the two runtime classes
 * two different contracts, and collapsing them would silently break one of them:
 *
 * - A **browser** root (`config/browser/runtime-env.<profileId>.json`) follows
 *   `ENVIRONMENT_SPEC.md` sections 5.1.0 and 5.1.0.1, which name the identity
 *   fields in camelCase (`environment`, `deploymentProfile`, `profileId`,
 *   `runtimeTarget`) and require `browserOriginMode` plus the seven
 *   `SDK_BASE_URL_KEYS` fields. `sdkwork-specs/tools/build-browser-client.mjs`
 *   enforces exactly this shape at build time: it rejects a source whose
 *   `deploymentProfile`/`environment`/`profileId`/`runtimeTarget` do not match
 *   the profile being built, and rejects a cloud SDK base URL that is not the
 *   registered family. The shape below is the one
 *   `sdkwork-specs/tools/align-browser-runtime-env.mjs` writes, so this
 *   generator stays byte-identical to the canonical materializer instead of
 *   merely being accepted by it.
 * - A **mini program / Flutter** root keeps the `SDKWORK_*` vocabulary.
 *   `UNIAPP_APP_ARCHITECTURE_SPEC.md` section 268 requires
 *   `config/mini-program/` (and `config/app/`) templates to declare
 *   `SDKWORK_ENVIRONMENT`, `SDKWORK_DEPLOYMENT_PROFILE`, `SDKWORK_PROFILE_ID`
 *   and `SDKWORK_RUNTIME_TARGET`, and those documents are read by platform code
 *   that looks up those exact names.
 *
 * Within the browser shape, two *value* shapes coexist deliberately:
 *
 * - The SDK API base URL fields address the API *edge*. A deployed cloud edge
 *   serves every registered base domain, so §5.1.0.1 requires these fields to
 *   carry the complete registered origin family (`origin1;origin2;…`, primary
 *   base domain first) and leaves member selection to the browser SDK factory,
 *   which matches the page host at request time. A single `api-*` origin is the
 *   drift defect the same section names.
 * - `iamIssuer` is an *identity*, not a route: it has exactly one `iss` value,
 *   so it stays on the primary (first, canonical) origin. A list would produce a
 *   token whose issuer can never be matched.
 *
 * The `dev:cloud` local-gateway anchor does **not** appear here: §5.1.0.1
 * excludes the development dotenv surface from the family requirement, and
 * `build-browser-client.mjs` rejects a non-`api-*` origin in a runtime source
 * (§5.1.4.2). The anchor stays in `etc/topology/cloud.development.env`, where
 * the `@sdkwork/app-topology` dev runtime and the client-env materializer bind
 * gateway-attached URLs to it for `cloud.development` only — the same section
 * keeps the domain edges authoritative for cloud-mode builds and deployed
 * services.
 *
 * `standalone` is same-origin by definition and uses the canonical root-relative
 * path, which the spec reserves for that profile.
 *
 * @param {object} surface surface descriptor
 * @param {string} profileId canonical profile id
 * @param {string} repoRoot absolute path of the repository root that owns the
 *   deployment authority
 */
function runtimeEnvDocument(surface, profileId, repoRoot) {
  const [deploymentProfile, environment] = profileId.split('.');
  const isStandalone = deploymentProfile === 'standalone';
  const issuer = isStandalone ? '/' : cloudPrimaryOrigin(repoRoot, environment);
  if (surface.runtimeTarget !== 'browser') {
    const apiBase = isStandalone ? '/' : cloudApiBaseForProfile(repoRoot, profileId);
    return {
      SDKWORK_ENVIRONMENT: environment,
      SDKWORK_DEPLOYMENT_PROFILE: deploymentProfile,
      SDKWORK_PROFILE_ID: profileId,
      SDKWORK_RUNTIME_TARGET: surface.runtimeTarget,
      SDKWORK_APP_ID: 'sdkwork-iam',
      SDKWORK_API_BASE_URL: apiBase,
      SDKWORK_APP_API_BASE_URL: apiBase,
      SDKWORK_OPEN_API_BASE_URL: apiBase,
      SDKWORK_IAM_ISSUER: issuer,
      SDKWORK_FEATURE_APP_SURFACE: true,
      SDKWORK_FEATURE_CONSOLE_SURFACE: true,
      SDKWORK_FEATURE_ADMIN_SURFACE: true,
    };
  }
  const apiBase = isStandalone ? '/' : cloudSdkBaseUrlFamily(repoRoot, environment);
  const origins = cloudBrowserApiOrigins(repoRoot, profileId);
  // Key order is the canonical order `align-browser-runtime-env.mjs` emits:
  // identity, then preserved application fields, then `cloudApiBaseUrls`, then
  // the SDK base URL keys. The canonical tool reads `cloudApiBaseUrls` back as a
  // preserved (non-SDK, non-identity) field, so it re-emits it in exactly this
  // position; keeping the two identical is what lets
  // `align-browser-runtime-env.mjs --dry-run` serve as an exact equivalence
  // oracle — any real divergence shows up as a diff instead of hiding behind a
  // harmless-looking reorder.
  const document = {
    environment,
    deploymentProfile,
    profileId,
    runtimeTarget: 'browser',
    browserOriginMode: isStandalone ? 'same-origin' : 'cross-origin',
    appKey: surface.rootName,
    iamIssuer: issuer,
    featureFlags: {
      appSurface: true,
      consoleSurface: true,
      adminSurface: true,
    },
  };
  if (origins) {
    document.cloudApiBaseUrls = [...origins];
  }
  for (const key of CLOUD_SDK_BASE_URL_KEYS) {
    document[key] = apiBase;
  }
  return document;
}

// ---------------------------------------------------------------------------
// TS source templates
// ---------------------------------------------------------------------------

/**
 * Identifier prefix for one route tier.
 *
 * `apps` -> `iamH5`, `console` -> `iamH5Console`, `admin` -> `iamH5Admin`.
 *
 * The tier is part of the prefix because §4 gives every tier its own core
 * package that owns a route registry. Without the tier segment a console core and
 * an admin core would both publish `IAMH5_ROUTE_CONTRIBUTIONS`, so a capability
 * package's import would resolve to a registry for the wrong surface.
 */
function tierPrefix(surface, tier = 'app') {
  const base = identPrefix(surface);
  if (tier === 'app') return base;
  return `${base}${tier.replace(/^./u, (character) => character.toUpperCase())}`;
}

/** `iamH5Admin` -> `IamH5Admin`, matching the existing `replace(/^iam/, 'Iam')` idiom. */
function pascalFromIdent(prefix) {
  return prefix.replace(/^iam/u, 'Iam');
}

function coreModulesSource(surface, tier = 'app') {
  const prefix = tierPrefix(surface, tier);
  const typePrefix = pascalFromIdent(prefix);
  const key = presentationKey(surface);
  const tierRoutes = routesOfTier(tier);
  const entries = tierRoutes.map((route) => {
    const lines = [
      `  {`,
      `    id: '${routeId(route)}',`,
      `    surface: '${route.surface}',`,
      `    domain: 'iam',`,
      `    capability: '${route.capability}',`,
      `    screen: '${route.screen}',`,
      `    path: '${route.path}',`,
      `    titleKey: '${route.titleKey}',`,
      `    auth: '${route.auth}',`,
      route.permissionHint ? `    permissionHint: '${route.permissionHint}',` : null,
      route.additionalPermissionHints
        ? `    additionalPermissionHints: [${route.additionalPermissionHints.map((hint) => `'${hint}'`).join(', ')}],`
        : null,
      `    presentation: { ${key}: '${presentationValue(surface, route)}' },`,
      surface.key === 'mp'
        ? (() => {
            const placement = miniProgramPlacement(route);
            const inner = [
              placement.subpackage ? `subpackage: '${placement.subpackage}'` : null,
              `pagePath: '${placement.pagePath}'`,
            ]
              .filter(Boolean)
              .join(', ');
            return `    miniProgram: { ${inner} },`;
          })()
        : null,
      `  },`,
    ];
    return lines.filter((line) => line !== null).join('\n');
  }).join('\n');

  const tierTitle = tier === 'app' ? 'application' : tier;

  return `${GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '')}
/**
 * Canonical IAM route identity registry for the ${surface.rootName} **${tierTitle}**
 * surface.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md §7 (route identity) and §4
 * (the route registry belongs to the tier's core package). \`id\` follows
 * \`<surface>.<domain>.<capability>.<screen>\` and is identical across every IAM
 * client root and every tier; only \`presentation\` and the mini program
 * placement are platform-specific.
 *
 * This registry holds the ${tierRoutes.length} \`${tier}\`-surface route(s). The other tiers
 * own theirs in their own core package, so no tier has to depend on another.
 */

export type ${typePrefix}RouteSurface = '${tier}';

export interface ${typePrefix}RouteContribution {
  id: string;
  surface: ${typePrefix}RouteSurface;
  domain: string;
  capability: string;
  screen: string;
  /** Physical path for this platform. Physical paths may differ per platform. */
  path: string;
  titleKey: string;
  auth: 'public' | 'required';
  permissionHint?: string;
  additionalPermissionHints?: readonly string[];
  presentation: Record<string, string>;
  miniProgram?: { subpackage?: string; pagePath: string };
}

export const ${prefix.toUpperCase()}_ROUTE_CONTRIBUTIONS: readonly ${typePrefix}RouteContribution[] = [
${entries}
];

export function list${pascalFromIdent(prefix)}RouteIds(): readonly string[] {
  return ${prefix.toUpperCase()}_ROUTE_CONTRIBUTIONS.map((route) => route.id);
}

export function find${pascalFromIdent(prefix)}Route(id: string): ${typePrefix}RouteContribution | undefined {
  return ${prefix.toUpperCase()}_ROUTE_CONTRIBUTIONS.find((route) => route.id === id);
}

export function list${pascalFromIdent(prefix)}RoutesByCapability(
  capability: string,
): readonly ${typePrefix}RouteContribution[] {
  return ${prefix.toUpperCase()}_ROUTE_CONTRIBUTIONS.filter((route) => route.capability === capability);
}
`;
}

function coreSdkSource(surface, tier = 'app') {
  const prefix = tierPrefix(surface, tier);
  const typePrefix = pascalFromIdent(prefix);
  const isBrowser = surface.runtimeTarget === 'browser';
  // A browser root reads the §5.1.0/§5.1.0.1 runtime document; a mini program
  // root reads the `SDKWORK_*` template `UNIAPP_APP_ARCHITECTURE_SPEC.md`
  // section 268 mandates. Same boundary, two contracts.
  const runtimeEnvInterface = isBrowser
    ? `export interface ${typePrefix}RuntimeEnv {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly browserOriginMode: string;
  readonly appKey: string;
  readonly iamIssuer: string;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly appApiBaseUrl: string;
  readonly backendApiBaseUrl: string;
  readonly driveAppApiBaseUrl: string;
  readonly appbaseAppApiBaseUrl: string;
  readonly deployAppApiBaseUrl: string;
  readonly openApiBaseUrl: string;
  readonly sdkBaseUrl: string;
}`
    : `export interface ${typePrefix}RuntimeEnv {
  SDKWORK_ENVIRONMENT: string;
  SDKWORK_DEPLOYMENT_PROFILE: string;
  SDKWORK_PROFILE_ID: string;
  SDKWORK_RUNTIME_TARGET: string;
  SDKWORK_APP_ID: string;
  SDKWORK_API_BASE_URL: string;
  SDKWORK_APP_API_BASE_URL: string;
  SDKWORK_OPEN_API_BASE_URL: string;
  SDKWORK_IAM_ISSUER: string;
  SDKWORK_FEATURE_APP_SURFACE: boolean;
  SDKWORK_FEATURE_CONSOLE_SURFACE: boolean;
  SDKWORK_FEATURE_ADMIN_SURFACE: boolean;
}`;
  const sdkCommonImport = isBrowser
    ? `import { resolveBaseUrlWithAlignProtocol } from '@sdkwork/sdk-common';\n\n`
    : '';
  const appSdkFactoryBody = isBrowser
    ? `  // \`appApiBaseUrl\` carries the registered API edge family, so the shared
  // §6.3 resolver — not this factory — owns member selection: it matches the
  // family against the page host, aligns the result with the page protocol
  // (http on an http page, https on an https page: the edge terminates both on
  // one host), and falls back to the primary origin for a page host that is not
  // a registered deployment host.
  const { url } = resolveBaseUrlWithAlignProtocol({
    baseUrls: env.appApiBaseUrl,
    mode: env.deploymentProfile,
  });
  return { surface: 'app-api', baseUrl: url };`
    : `  return { surface: 'app-api', baseUrl: env.SDKWORK_APP_API_BASE_URL };`;
  return `${GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '')}
/**
 * SDK construction boundary for the ${surface.rootName} client root.
 *
 * Runtime config is resolved from the checked-in public runtime document, not
 * from build-time inlined variables (APP_H5_ARCHITECTURE_SPEC §2.1). SDK clients
 * are constructed here and injected; feature packages never build their own.
 */

${sdkCommonImport}${runtimeEnvInterface}

declare global {
  // eslint-disable-next-line no-var
  var __SDKWORK_RUNTIME_ENV__: ${typePrefix}RuntimeEnv | undefined;
}

export function read${prefix.replace(/^iam/u, 'Iam')}RuntimeEnv(): ${typePrefix}RuntimeEnv {
  const env = globalThis.__SDKWORK_RUNTIME_ENV__;
  if (!env) {
    throw new Error(
      '${surface.rootName}: public runtime config was not loaded before SDK client construction.',
    );
  }
  return env;
}

export interface ${typePrefix}AppSdkClient {
  readonly surface: 'app-api';
  readonly baseUrl: string;
}

/**
 * Resolves the generated app SDK base origin. The protocol-adaptive alignment
 * helper from \`@sdkwork/sdk-common\` owns the URL composition; this factory only
 * contributes the profile-resolved origin.
 */
export function create${prefix.replace(/^iam/u, 'Iam')}AppSdkClient(env: ${typePrefix}RuntimeEnv): ${typePrefix}AppSdkClient {
${appSdkFactoryBody}
}
`;
}

function coreHostSource(surface, tier = 'app') {
  const prefix = tierPrefix(surface, tier);
  const typePrefix = pascalFromIdent(prefix);
  const capabilities =
    surface.key === 'mp'
      ? ['platformLogin', 'secureStorage', 'camera', 'qrScanner', 'mediaPicker', 'filePicker', 'share', 'subscriptionsOrPush', 'deepLinksOrScene', 'networkStatus', 'appLifecycle', 'clipboard', 'geolocation', 'deviceInfo', 'haptics', 'paymentBridge']
      : ['windowOrNavigationHost', 'deepLinks', 'secureStorage', 'camera', 'qrScanner', 'pushNotifications', 'biometric', 'shareSheet', 'networkStatus', 'appLifecycle', 'clipboard', 'filePicker', 'filesystemSandbox', 'geolocation', 'deviceInfo', 'haptics'];
  return `${GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '')}
/**
 * Host adapter contracts. Feature packages depend on these interfaces, never on
 * platform globals (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §9).
 */

export type ${typePrefix}HostErrorCode =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

export interface ${typePrefix}HostError {
  code: ${typePrefix}HostErrorCode;
  message: string;
}

export type ${typePrefix}HostOutcome<T> = { ok: true; value: T } | { ok: false; error: ${typePrefix}HostError };

export const ${prefix.toUpperCase()}_HOST_CAPABILITIES = [
${capabilities.map((name) => `  '${name}',`).join('\n')}
] as const;

export type ${typePrefix}HostCapability = (typeof ${prefix.toUpperCase()}_HOST_CAPABILITIES)[number];

export interface ${typePrefix}HostAdapter {
  readonly capabilities: ReadonlySet<${typePrefix}HostCapability>;
  hasCapability(capability: ${typePrefix}HostCapability): boolean;
}

/** Browser/environment fallback: declares no capability and reports \`unsupported\`. */
export function create${prefix.replace(/^iam/u, 'Iam')}FallbackHostAdapter(): ${typePrefix}HostAdapter {
  const capabilities = new Set<${typePrefix}HostCapability>();
  return {
    capabilities,
    hasCapability: () => false,
  };
}
`;
}

function coreSessionSource(surface, tier = 'app') {
  const prefix = tierPrefix(surface, tier);
  const typePrefix = pascalFromIdent(prefix);
  return `${GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '')}
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface ${typePrefix}SessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type ${typePrefix}SessionListener = (snapshot: ${typePrefix}SessionSnapshot | undefined) => void;

export interface ${typePrefix}SessionStore {
  clear(): void;
  get(): ${typePrefix}SessionSnapshot | undefined;
  set(snapshot: ${typePrefix}SessionSnapshot): void;
  subscribe(listener: ${typePrefix}SessionListener): () => void;
}

export function create${prefix.replace(/^iam/u, 'Iam')}SessionStore(): ${typePrefix}SessionStore {
  let current: ${typePrefix}SessionSnapshot | undefined;
  const listeners = new Set<${typePrefix}SessionListener>();
  const emit = () => {
    for (const listener of listeners) listener(current);
  };
  return {
    clear() {
      current = undefined;
      emit();
    },
    get() {
      return current;
    },
    set(snapshot) {
      current = snapshot;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
`;
}

function coreCompositionSource(surface, packages, tier = 'app') {
  const prefix = tierPrefix(surface, tier);
  const routeSurface = tier;
  const coreDir = tier === 'app' ? surface.coreDir : tier === 'console' ? surface.consoleCoreDir : surface.adminCoreDir;
  // Each tier's composition entry lists only that tier's own packages, so no tier
  // has to reference another tier's core.
  const tierPackageSurface = tier === 'app' ? 'app' : tier;
  const others = packages
    .filter((entry) => entry.dir !== coreDir)
    .filter((entry) =>
      tier === 'app'
        ? entry.role === 'commons' || entry.role === 'shell' || entry.role === 'host' || entry.surface === 'app'
        : entry.surface === tierPackageSurface,
    )
    .map((entry) => `  '${toPosix(`../${entry.dir}/src/index.ts`)}',`)
    .join('\n');

  const sdkDependencies =
    tier === 'admin'
      ? `export const ${prefix.toUpperCase()}_BACKEND_ADMIN_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
] as const;`
      : `export const ${prefix.toUpperCase()}_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
] as const;`;

  return `${GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '')}
/**
 * Dependency composition entry for the \`${routeSurface}\` surface of the
 * ${surface.rootName} client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const ${prefix.toUpperCase()}_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const ${prefix.toUpperCase()}_PACKAGE_ENTRYPOINTS = [
${others}
] as const;

${sdkDependencies}
`;
}

function packageComponentSpec(surface, entry, routes) {
  const isCore = entry.role === 'core' || entry.role === 'console-core' || entry.role === 'admin-core';
  const permissionComposition = permissionCompositionFor(entry);
  const providedName = entry.capability
    ? `${entry.dir}-surface`
    : `${entry.dir}-composition`;
  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: entry.name,
      displayName: displayNameFor(surface, entry),
      version: '0.1.0',
      type: 'node-package',
      root: `${APP_ID}/apps/${surface.rootName}/packages/${entry.dir}`,
      domain: 'iam',
      declaredDomain: 'iam',
      capability: entry.capability ?? entry.role,
      status: 'standardizing',
      surface: entry.surface,
      languages: surface.languages,
      generated: false,
      private: true,
      manifests: ['package.json'],
    },
    canonicalSpecs: [
      { file: 'COMPONENT_SPEC.md', purpose: 'Local component specs directory and manifest rules.' },
      { file: 'MODULE_SPEC.md', purpose: 'Reusable package contract and dependency direction.' },
      { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy and dependency direction.' },
      { file: surface.architectureSpec, purpose: 'Client root architecture standard.' },
      { file: surface.uiSpec, purpose: 'Client package UI rules.' },
      { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'SDK integration, TokenManager wiring, and dependency composition rules.' },
    ].map((item) => ({ ...item, path: `../../../../../../sdkwork-specs/${item.file}` })),
    contracts: {
      publicExports: isCore ? ['src/index.ts', 'src/sdk/index.ts', 'src/modules/index.ts', 'src/host/index.ts', 'src/session/index.ts', 'src/composition/index.ts'] : ['src/index.ts'],
      runtimeEntrypoints: [],
      sdkClients: [],
      events: [],
      configKeys: [],
      routeManifest: null,
      sdkDependencies: entry.sdkDependencies,
      layerRole: entry.layerRole,
      providedPorts: [{ name: providedName, export: 'src/index.ts' }],
      requiredPorts: [],
      ...(routes.length > 0 ? { routeIds: routes.map((route) => routeId(route)) } : {}),
      ...(permissionComposition === null ? {} : { permissionComposition }),
    },
    integration: {
      authority: 'Root SDKWork specs remain authoritative. Local specs may extend but must not contradict them.',
      dependencyPolicy: 'Consumers integrate through public package exports, declared runtime entrypoints, generated SDK clients, or documented adapters only.',
      sdkPolicy: 'Generated SDK clients are injected through service/runtime boundaries; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'Language-specific packages follow their native manifest and build tools while preserving the same component contract.',
    },
    verification: {
      commands: [`pnpm --filter ${entry.name} typecheck`],
    },
  };
}

export {
  appManifest,
  displayNameFor,
  rootComponentSpec,
  deploymentIndex,
  runtimeEnvDocument,
  identPrefix,
  pascalFromIdent,
  tierPrefix,
  coreModulesSource,
  coreSdkSource,
  coreHostSource,
  coreSessionSource,
  coreCompositionSource,
  packageComponentSpec,
  pascal,
  presentationKey,
  presentationValue,
  miniProgramPlacement,
  runtimeBaseName,
  kebabFromPascal,
  CAPABILITY_PASCAL,
};
