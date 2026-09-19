/**
 * Emitters for the HarmonyOS/ArkTS client root (`sdkwork-iam-harmony-mobile`).
 *
 * Shape authority:
 * - `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 2 (root layout), section 3
 *   (package taxonomy), section 4 (package internal shape), section 5
 *   (dependency direction), section 6 (SDK/IAM integration), section 7 (host
 *   adapter boundary), section 8 (route alignment), section 9 (config), section
 *   10 (commands), section 11 (verification).
 * - `APP_HARMONY_NATIVE_UI_SPEC.md` — package-local UI rules.
 * - `ENVIRONMENT_SPEC.md` section 5.1.2/5.1.3 — the required identity keys and
 *   `config/app/runtime-env.<profile-id>.json` for native HarmonyOS.
 * - `I18N_SPEC.md` section 199 — the Harmony ArkTS authored layout is
 *   `src/main/ets/i18n/<locale>/<domain>/<capability>/<page-or-component>.json`
 *   **or `.ts`**. It is deliberately not `.ets`: `check-i18n-standard.mjs` keeps
 *   `.ets` in `LITERAL_SCAN_EXTENSIONS` but not in `SOURCE_EXTENSIONS`, so an
 *   `.ets` fragment is never layout-checked at all. Emitting the specified
 *   extension is what keeps the rule able to see the file.
 * - `apps/sdkwork-im-harmony-mobile/**` — the gate-passing template root. Its
 *   structure travels; its identity, its `im`/`appbase` endpoint groups and its
 *   `.ets` locale fragments do not.
 *
 * Language-neutral JSON payloads (`appManifest`, `deploymentIndex`) are imported
 * from `emit-ts.mjs`, which owns them for the first emitter. They are
 * parameterised entirely by the surface descriptor, so the same builders serve
 * every client root.
 */

import fs from 'node:fs';
import path from 'node:path';

import { APP_ID, APP_CODE, PROFILE_IDS, permissionCompositionFor, routeId, routesOfPackage } from './model.mjs';
import { GENERATED_BANNER } from './emit-common.mjs';
import { cloudApiBaseForProfile, cloudPrimaryOrigin, readProfileEnvValues } from './cloud-api-base.mjs';
import { appManifest, deploymentIndex, displayNameFor } from './emit-ts.mjs';

/** Line-comment form of the shared banner, for `.ets` / `.ts` / `.json5`. */
const BANNER = GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '');

const PUBLIC_DOC_LINE = 'Owner: `sdkwork-iam` maintainers.';

/**
 * Locales this root ships fragments for.
 *
 * `I18N_SPEC.md` section 199 requires the locale directory to be a normalized
 * BCP 47 tag, and `ENVIRONMENT_SPEC.md` records `zh-CN` as the database seed
 * locale for this application, so the pair is the application default plus
 * English rather than an arbitrary list.
 */
const LOCALES = ['en-US', 'zh-CN'];

/** Domain segment of every authored fragment path (section 199). */
const I18N_DOMAIN = 'iam';

/**
 * Deployment authority of the IAM repository.
 *
 * Every endpoint this root materializes is *derived* from
 * `etc/sdkwork.deployment.config.json` and `etc/topology/<profile-id>.env` rather
 * than written down here, for two reasons that both come from the sibling roots:
 *
 * 1. `ENVIRONMENT_SPEC.md` section 5.1.0.1 makes the environment-level
 *    `cloudApiBaseUrl` key "the single authoritative value for every browser SDK
 *    API base URL", and requires a repository that registers more than one base
 *    domain to materialize the **complete origin family** rather than one member
 *    of it. This repository registers sixteen. A hand-copied table would be a
 *    second authority, and it would drift the first time a base domain is added.
 * 2. `specs/topology.spec.json` and `etc/topology/*.env` own the standalone
 *    ingress. The template root hard-codes `18089`/`18079`, which are the IM
 *    application's binds; reading the profile file is what makes that class of
 *    copy-paste error impossible instead of merely unlikely.
 */

/** Application root this authority belongs to; used only for error messages. */
const IAM_APP_ROOT = 'apps/sdkwork-iam';

/** Reads and parses one JSON document, or throws naming the path. */
function readJsonDocument(absolutePath) {
  let raw;
  try {
    raw = fs.readFileSync(absolutePath, 'utf8');
  } catch (error) {
    throw new Error(
      `harmony runtime documents are derived from ${absolutePath}, which could not be read: `
      + `${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${absolutePath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Drops every trailing slash, which is the only rewrite applied to an origin.
 */
function stripTrailingSlashes(value) {
  let normalized = value;
  while (normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  return normalized;
}

/**
 * Swaps the scheme of one origin.
 *
 * `http` -> `ws` and `https` -> `wss`, which is the transformation
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1's websocket column and the sibling roots'
 * `applicationPublicWebsocketUrl` both apply to the environment's primary origin.
 */
function websocketOriginOf(origin) {
  if (origin.startsWith('https://')) return `wss://${origin.slice('https://'.length)}`;
  if (origin.startsWith('http://')) return `ws://${origin.slice('http://'.length)}`;
  throw new Error(`cannot derive a websocket origin from ${origin}`);
}

/**
 * Reads the deployment authority this root derives its endpoints from.
 *
 * Holds only the values that are genuinely single-valued per environment. The
 * API edge is a *family*, and `ENVIRONMENT_SPEC.md` section 5.1.0.1 names
 * `sdkwork-specs/tools/browser-cloud-api-base.mjs` as the one implementation
 * that resolves it, so it is not duplicated into this structure.
 *
 * @param {string} repoRoot absolute path of the `sdkwork-iam` repository root
 * @returns {{
 *   applicationOrigin: Record<string, string>,
 *   profiles: Record<string, Record<string, string>>,
 * }}
 */
export function readDeploymentAuthority(repoRoot) {
  const deploymentPath = path.join(repoRoot, 'etc', 'sdkwork.deployment.config.json');
  const deployment = readJsonDocument(deploymentPath);
  if (deployment.kind !== 'sdkwork.deployment-index') {
    throw new Error(
      `${deploymentPath} must be a sdkwork.deployment-index, found ${deployment.kind}`,
    );
  }
  if (deployment.application !== 'sdkwork-iam') {
    throw new Error(
      `${deploymentPath} declares application ${deployment.application}; `
      + `this generator materializes ${IAM_APP_ROOT}`,
    );
  }

  const applicationOrigin = {};
  for (const [environment, entry] of Object.entries(deployment.environments ?? {})) {
    applicationOrigin[environment] = stripTrailingSlashes(String(entry.applicationOrigin ?? ''));
    if (applicationOrigin[environment].length === 0) {
      throw new Error(`${deploymentPath}: environments.${environment}.applicationOrigin is required`);
    }
  }

  // The API edge family is deliberately *not* read here. It is resolved through
  // `cloud-api-base.mjs`, which delegates to the canonical
  // `sdkwork-specs/tools/browser-cloud-api-base.mjs` materializer
  // (`ENVIRONMENT_SPEC.md` section 5.1.0.1). Reading the raw
  // `environments.<env>.cloudApiBaseUrl` field here as well would be a second
  // implementation of a platform rule and would silently ignore the topology
  // merge the canonical resolver performs.
  const profiles = {};
  for (const profileId of PROFILE_IDS) {
    const declared = deployment.profiles?.[profileId];
    if (!declared?.config) {
      throw new Error(`${deploymentPath}: profiles.${profileId}.config is required`);
    }
    profiles[profileId] = readProfileEnvValues(repoRoot, profileId);
  }

  return { applicationOrigin, profiles };
}

/**
 * Resolves the ten runtime documents from the deployment authority.
 *
 * Both deployment profiles are covered because a native HarmonyOS root packages
 * every profile into one HAP and selects at runtime
 * (`ENVIRONMENT_SPEC.md` section 5.1.3), so there is one document per registered
 * profile and no build-time narrowing.
 *
 * - `standalone` points every endpoint at the profile's own application ingress,
 *   which `etc/topology/standalone.<environment>.env` declares as
 *   `SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL`.
 * - `cloud` takes the application ingress from
 *   `etc/sdkwork.deployment.config.json#environments.<environment>.applicationOrigin`
 *   and the API bases from the canonical cloud API edge resolver. A profile that
 *   declares its own `SDKWORK_LOCAL_PLATFORM_API_GATEWAY_HTTP_URL` — only
 *   `cloud.development` does — binds the API bases to that locally started
 *   gateway, which is the `dev:cloud` contract of
 *   `APP_RUNTIME_TOPOLOGY_SPEC` section 4.2 and `PNPM_SCRIPT_SPEC` section 3; the
 *   domain-valued ingress and websocket keys are deliberately left alone there,
 *   because those are what a deployed build uses.
 *
 * @param {object} authority value returned by {@link readDeploymentAuthority}
 * @param {string} repoRoot absolute path of the repository root, needed to resolve
 *   the registered API edge family through the canonical materializer
 * @returns {Record<string, object>} one runtime document per profile id
 */
export function resolveRuntimeDocuments(authority, repoRoot) {
  const documents = {};
  for (const profileId of PROFILE_IDS) {
    const [deploymentProfile, environment] = profileId.split('.');
    const values = authority.profiles[profileId] ?? {};
    const applicationOrigin = authority.applicationOrigin[environment];
    if (applicationOrigin === undefined) {
      throw new Error(`no applicationOrigin registered for environment ${environment}`);
    }

    let apiBase;
    let loginUrl;
    let websocketOrigin;
    /**
     * Application ingress.
     *
     * `ENVIRONMENT_SPEC.md` section 5.1.2 defines it as the application-owned public
     * HTTP origin. Which authority holds that value depends on the deployment
     * profile, and the family authority `sdkwork-im-harmony-mobile` settles it:
     *
     *   - `standalone.*` — the topology env. IM's `standalone.development` document
     *     declares `http://127.0.0.1:18089` while IM's
     *     `environments.development.applicationOrigin` is
     *     `http://im-dev.sdkwork.com:3801/`, so the standalone document demonstrably
     *     does *not* come from `applicationOrigin`. A standalone process publishes its
     *     own bind address; that is the ingress.
     *   - `cloud.*` — `applicationOrigin`, paired with the websocket host taken from
     *     the primary member of the registered API edge family. IM's `cloud.production`
     *     document carries `https://im.sdkwork.com` and `wss://api.sdkwork.com`
     *     respectively, which is exactly this pairing and emphatically not one shared
     *     origin.
     */
    let publicHttpUrl;
    if (deploymentProfile === 'standalone') {
      const declared = values.SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL;
      if (declared === undefined || declared.length === 0) {
        throw new Error(
          `etc/topology/${profileId}.env must declare SDKWORK_IAM_APPLICATION_PUBLIC_HTTP_URL`,
        );
      }
      const origin = stripTrailingSlashes(declared);
      apiBase = origin;
      loginUrl = origin;
      publicHttpUrl = origin;
      websocketOrigin = websocketOriginOf(origin);
    } else {
      const resolvedApiBase = cloudApiBaseForProfile(repoRoot, profileId);
      if (resolvedApiBase === null) {
        throw new Error(`profile ${profileId} is not a cloud profile`);
      }
      apiBase = resolvedApiBase;
      loginUrl = applicationOrigin;
      publicHttpUrl = applicationOrigin;
      // The websocket host is the primary registered origin: section 5.1.0.1
      // orders the family primary-base-domain-first and names that member as the
      // host the whole family's realtime channel lives on.
      websocketOrigin = websocketOriginOf(cloudPrimaryOrigin(repoRoot, environment));
    }

    documents[profileId] = {
      environment,
      deploymentProfile,
      profileId,
      application: {
        publicHttpUrl,
        publicWebsocketUrl: websocketOrigin,
      },
      appbase: {
        appApiBaseUrl: apiBase,
        loginUrl,
      },
      platform: {
        apiGatewayHttpUrl: apiBase,
      },
    };
  }
  return documents;
}

// ---------------------------------------------------------------------------
// naming
// ---------------------------------------------------------------------------

/** `sdkwork-iam-harmony-mobile-auth` -> `IamHarmonyMobileAuth`. */
export function pascalFromDir(dir) {
  return dir
    .replace(/^sdkwork-/u, '')
    .split(/[-_]/u)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');
}

export function camel(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function upperSnake(value) {
  return value
    .replace(/[-\s]+/gu, '_')
    .replace(/([a-z0-9])([A-Z])/gu, '$1_$2')
    .toUpperCase();
}

/**
 * The capability/role token as it appears in ArkTS file names and identifiers.
 *
 * `account-binding` -> `AccountBinding`; the console and admin families prefix
 * the token because section 3 gives them their own cores, and an unprefixed
 * `AccountBindingService.ets` would be ambiguous once both tiers ship the same
 * capability inside this one root.
 */
export function pascalTokenOf(entry) {
  if (entry.role !== 'capability') {
    return entry.role
      .split('-')
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
      .join('');
  }
  const base = entry.capability
    .split('-')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');
  if (entry.surface === 'console') return `Console${base}`;
  if (entry.surface === 'backend-admin') return `Admin${base}`;
  return base;
}

/** `account-binding` -> `accountBinding`, with the family prefix when there is one. */
export function camelTokenOf(entry) {
  return camel(pascalTokenOf(entry));
}

/** Kebab token including the family prefix: `account-binding`, `admin-account-binding`. */
export function kebabTokenOf(entry) {
  if (entry.role !== 'capability') return entry.role;
  if (entry.surface === 'console') return `console-${entry.capability}`;
  if (entry.surface === 'backend-admin') return `admin-${entry.capability}`;
  return entry.capability;
}

/**
 * Symbol prefix of one package.
 *
 * The template uses `ImHarmony` + capability (`imHarmonyChatRouteContributions`),
 * which is both shorter than the package name and stable if the package is
 * renamed; `IamHarmony` is the same prefix for this application.
 */
export function symbolOf(entry) {
  return `IamHarmony${pascalTokenOf(entry)}`;
}

export function camelSymbolOf(entry) {
  return camel(symbolOf(entry));
}

export function constSymbolOf(entry) {
  return upperSnake(symbolOf(entry));
}

export function tokenOfEntry(entry) {
  return kebabTokenOf(entry);
}

export function coreDirOf(surface, tier) {
  if (tier === 'app') return surface.coreDir;
  if (tier === 'console') return surface.consoleCoreDir;
  return surface.adminCoreDir;
}

export function tierOfEntry(entry) {
  if (entry.role === 'console-core' || entry.role === 'console-shell' || entry.surface === 'console') {
    return 'console';
  }
  if (entry.role === 'admin-core' || entry.role === 'admin-shell' || entry.surface === 'backend-admin') {
    return 'admin';
  }
  return 'app';
}

export function isCoreRole(entry) {
  return entry.role === 'core' || entry.role === 'console-core' || entry.role === 'admin-core';
}

export function isShellRole(entry) {
  return entry.role === 'shell' || entry.role === 'console-shell' || entry.role === 'admin-shell';
}

export function commonsDir(surface) {
  return `${surface.packageDirPrefix}commons`;
}

/** HarmonyOS `module.json5#module.name` — a legal identifier, so underscores. */
export function moduleNameOf(entry) {
  return entry.dir.replaceAll('-', '_');
}

// ---------------------------------------------------------------------------
// i18n copy
// ---------------------------------------------------------------------------

/**
 * Titles keyed by `<capability>.<screen>`.
 *
 * Keyed by capability *and* screen rather than by screen alone: `list` is the
 * screen token of account binding, user, and — on the admin tier — of account
 * binding and user again, so a screen-only table would give the user directory
 * and the account-binding list the same title.
 */
const SCREEN_TITLES = {
  'auth.login': ['Sign in', '登录'],
  'auth.register': ['Create account', '注册账号'],
  'auth.forgot-password': ['Reset password', '重置密码'],
  'auth.oauth-callback': ['Completing sign-in', '正在完成登录'],
  'auth.context-selection': ['Choose a workspace', '选择工作空间'],
  'user-center.profile': ['Profile', '个人资料'],
  'user-center.password': ['Change password', '修改密码'],
  'account-binding.list': ['Account bindings', '账号绑定'],
  'user.list': ['Users', '用户'],
  'tenant.overview': ['Tenant overview', '租户概览'],
  'tenant.list': ['Tenants', '租户'],
  'organization.directory': ['Organizations', '组织'],
  'organization.tree': ['Organization tree', '组织树'],
  'oauth.providers': ['Identity providers', '身份提供商'],
  'permission.roles': ['Roles', '角色'],
  'permission.permissions': ['Permissions', '权限'],
  'permission.policies': ['Policies', '策略'],
  'permission.authorizations': ['Authorizations', '授权'],
  'audit.events': ['Audit events', '审计事件'],
};

/**
 * Screen-state copy every capability fragment carries.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 11 requires UI coverage for
 * loading, success, empty, validation-error, permission-denied, offline and
 * unknown-error, so the fragments declare one key per required state instead of
 * leaving a screen to invent copy inline.
 */
const STATE_COPY = [
  ['loading', ['Loading', '加载中']],
  ['empty', ['Nothing to show yet', '暂无内容']],
  ['error', ['Something went wrong', '出错了']],
  ['retry', ['Retry', '重试']],
  ['offline', ['You are offline', '当前无网络']],
  ['permissionDenied', ['You do not have permission to view this', '你没有权限查看此内容']],
  ['submit', ['Submit', '提交']],
  ['cancel', ['Cancel', '取消']],
  ['confirm', ['Confirm', '确认']],
];

/** Locale key prefix of one package: `iam`, `iam.console`, `iam.admin`. */
export function localeKeyPrefixOf(entry) {
  if (entry.surface === 'console') return `${APP_CODE}.console`;
  if (entry.surface === 'backend-admin') return `${APP_CODE}.admin`;
  return APP_CODE;
}

/** `en-US` -> `EnUs`, for an exported symbol that names its locale. */
export function localeTokenOf(locale) {
  return locale
    .split('-')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join('');
}

/**
 * Authored fragment path of one package and locale.
 *
 * `I18N_SPEC.md` line 202 fixes the Harmony ArkTS layout as
 * `src/main/ets/i18n/<locale>/<domain>/<capability>/<page-or-component>.json` or
 * `.ts`. `.ts` is chosen over `.json` because `check-i18n-standard.mjs` lists `.ts`
 * in `SOURCE_EXTENSIONS` *and* in the Harmony `allowedExtensions`, so the fragment
 * is layout-checked, while a `.json` fragment would need a JSON import in ArkTS to
 * be reachable from the thin boundary file at all.
 *
 * The `<capability>` segment is the tier-qualified token (`console-tenant`,
 * `admin-user`), not the bare capability: this one root ships all three tiers, and
 * the console and admin families each own a `tenant`, `user`, `organization` and
 * `account-binding` capability that would otherwise collide inside one locale tree.
 */
export function i18nFragmentPath(entry, locale) {
  const token = kebabTokenOf(entry);
  return `src/main/ets/i18n/${locale}/${I18N_DOMAIN}/${token}/${token}.ts`;
}

/**
 * Authored fragment of one package and locale.
 *
 * Keys are the cross-client `titleKey` values of `APP_CLIENT_ARCHITECTURE_
 * ALIGNMENT_SPEC.md` section 7 plus the required screen states, so the same
 * screen keeps one key across PC, H5, Flutter, mini program and Harmony.
 */
export function i18nFragment(entry, locale) {
  const index = locale === 'zh-CN' ? 1 : 0;
  const document = {};
  for (const route of routesOfPackage(entry)) {
    const copy = SCREEN_TITLES[`${route.capability}.${route.screen}`];
    if (!copy) throw new Error(`no ${locale} title copy for ${route.capability}.${route.screen}`);
    document[route.titleKey] = copy[index];
  }
  const prefix = localeKeyPrefixOf(entry);
  for (const copy of STATE_COPY) {
    document[`${prefix}.${camelTokenOf(entry)}.state.${copy[0]}`] = copy[1][index];
  }
  const lines = Object.keys(document)
    .sort()
    .map((key) => `  ${JSON.stringify(key)}: ${JSON.stringify(document[key])},`)
    .join('\n');
  return `${BANNER}
/**
 * ${locale} messages of \`${entry.dir}\`.
 *
 * Authority: \`I18N_SPEC.md\` line 202. Keys are cross-client title keys plus the
 * screen states \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 11 requires, so
 * no screen has to invent copy inline.
 */
export const ${constSymbolOf(entry)}Messages${localeTokenOf(locale)}: Record<string, string> = {
${lines}
};
`;
}

/**
 * `src/main/ets/i18n/index.ts` — the thin locale boundary.
 *
 * `I18N_SPEC.md` line 202 permits a platform resource index only as a generated or
 * thin projection, and `check-i18n-standard.mjs` allows exactly one file in a
 * locale tree's root when `isThinI18nBoundaryFile` recognises its name — so this
 * module exports, imports, types and registers fragments and carries no copy of its
 * own. The message loader is elsewhere on purpose: it is infrastructure rather than
 * locale source, and `commons/src/main/ets/l10n/FragmentBundle.ets` is where it
 * lives.
 */
export function i18nIndexSource(entry) {
  const token = kebabTokenOf(entry);
  const imports = LOCALES.map(
    (locale) => `import { ${constSymbolOf(entry)}Messages${localeTokenOf(locale)} } from './${locale}/${I18N_DOMAIN}/${token}/${token}';`,
  ).join('\n');
  const map = LOCALES.map(
    (locale) => `  '${locale}': ${constSymbolOf(entry)}Messages${localeTokenOf(locale)},`,
  ).join('\n');
  return `${BANNER}
/**
 * Locale projection boundary of \`${entry.dir}\`.
 *
 * Authority: \`I18N_SPEC.md\` line 202 — a platform resource index is generated or
 * thin, and authored copy belongs in
 * \`<locale>/${I18N_DOMAIN}/<capability>/${token}.ts\` beside this file. This module
 * imports, types and registers those fragments; it authors none.
 */

${imports}

/** Locales this package ships fragments for. */
export const ${constSymbolOf(entry)}_SUPPORTED_LOCALES: string[] = [${LOCALES.map((locale) => `'${locale}'`).join(', ')}];

/** Locale used when a caller asks for one this package does not ship. */
export const ${constSymbolOf(entry)}_DEFAULT_LOCALE: string = '${LOCALES[0]}';

/** Fragment shape of one locale. */
export type ${symbolOf(entry)}LocaleModule = Record<string, string>;

/** This package's fragments, resolved through a static map. */
export const ${constSymbolOf(entry)}_FRAGMENTS: Record<string, ${symbolOf(entry)}LocaleModule> = {
${map}
};

/**
 * Fragments of one locale.
 *
 * Falls back to the default locale rather than returning an empty table: an empty
 * table renders every key as itself, which reads as a defect on screen and hides
 * the unsupported locale from whoever is looking.
 */
export function ${camelSymbolOf(entry)}LocaleMessages(locale: string): ${symbolOf(entry)}LocaleModule {
  const found: ${symbolOf(entry)}LocaleModule | undefined = ${constSymbolOf(entry)}_FRAGMENTS[locale];
  return found === undefined
    ? ${constSymbolOf(entry)}_FRAGMENTS[${constSymbolOf(entry)}_DEFAULT_LOCALE]
    : found;
}
`;
}

// ---------------------------------------------------------------------------
// package manifests
// ---------------------------------------------------------------------------

/** Direct dependencies of one package, following section 5's allowed flow. */
export function dependenciesOf(surface, entry, packages = []) {
  const commons = commonsDir(surface);
  const core = coreDirOf(surface, tierOfEntry(entry));
  if (entry.role === 'core') return [];
  if (entry.role === 'commons') return [];
  if (isCoreRole(entry)) return [surface.coreDir, commons];
  if (entry.role === 'host') return [core];
  if (isShellRole(entry)) {
    // A shell composes its tier's route contributions, so it declares the tier's
    // capability packages. That is the one place the composition can live: section 5
    // forbids `core` and `commons` from depending on a capability package, and the same
    // section states that "shell packages compose route contributions and layout". The
    // edge stays acyclic because a capability's allowed dependencies do not include the
    // shell.
    const tier = tierOfEntry(entry);
    const capabilities = packages
      .filter((candidate) => candidate.role === 'capability' && tierOfEntry(candidate) === tier)
      .map((candidate) => candidate.dir);
    return [core, commons, ...capabilities];
  }
  return [core, commons];
}

/**
 * `oh-package.json5` of one package.
 *
 * `main` points at the package root export file, which section 4 makes the public
 * integration boundary; there is no bundler to resolve a bare directory import.
 */
export function packageOhPackage(surface, entry, packages = []) {
  const dependencies = {};
  for (const dir of dependenciesOf(surface, entry, packages).sort()) {
    dependencies[`@sdkwork/${dir}`] = `file:../${dir}`;
  }
  return {
    name: `@sdkwork/${entry.dir}`,
    version: '0.1.0',
    description: `${displayNameFor(surface, entry)}: ${entry.layerRole.replace(/^frontend-/u, '')}.`,
    main: 'src/main/ets/Index.ets',
    author: 'SDKWork',
    license: 'Apache-2.0',
    dependencies,
  };
}

/**
 * `build-profile.json5` of one package.
 *
 * Identical for every package because a HAR has no product-level variation: the
 * release build mode only turns off obfuscation so a release build stays
 * debuggable while the sign/release profile is still unset.
 */
export function packageBuildProfile() {
  return {
    apiType: 'stageMode',
    buildOption: {},
    buildOptionSet: [
      { name: 'release', arkOptions: { obfuscation: { ruleOptions: { enable: false } } } },
    ],
    targets: [{ name: 'default' }],
  };
}

/** `src/main/module.json5` of one HAR. */
export function packageModuleJson(entry) {
  return {
    module: {
      name: moduleNameOf(entry),
      type: 'har',
      deviceTypes: ['phone', 'tablet'],
    },
  };
}

/**
 * `package.json` of the **core** package.
 *
 * Section 176: every package carries `oh-package.json5` plus
 * `build-profile.json5`, and the one `package.json` this root may carry inside
 * `packages/` is the core's composition contract, because
 * `check-frontend-composition.mjs` reads it. The file is explicitly marked as not
 * a pnpm workspace member so the note and the behaviour cannot drift apart, and a
 * host package must not carry one at all.
 */
export function corePackageJson(surface, entry) {
  const exports = {
    '.': './src/main/ets/Index.ets',
    './composition': './src/composition/index.ets',
  };
  for (const relative of coreSubpathExports(entry)) {
    exports[`./${relative.name}`] = `./src/main/ets/${relative.path}`;
  }
  return {
    name: `@sdkwork/${entry.dir}`,
    private: true,
    version: '0.1.0',
    type: 'module',
    sdkwork: {
      role: `harmony-arkts-${tierOfEntry(entry)}-core-contract`,
      toolchain: 'ohpm',
      note: 'Composition contract entry for check-frontend-composition. Not a pnpm workspace member.',
    },
    exports,
  };
}

/**
 * Subpath exports of one tier core.
 *
 * `./host` is part of every tier core, not just the app core:
 * `tools/lib/app-composition.mjs` fixes `CORE_EXPORT_SUBPATHS` as
 * `['.', './sdk', './modules', './host', './session', './composition']` and
 * `check-frontend-composition` fails any core missing one of them. The Flutter,
 * H5 and mini-program roots all give all three tiers a host contract subpath, so
 * dropping it for console and admin would be a cross-root divergence as well as a
 * gate failure.
 *
 * The token manager, the runtime environment document and the generated SDK
 * client stay app-tier only: section 3 gives console and admin the session store
 * and the SDK factory, and the app tier is the one that materializes the profile
 * runtime document.
 */
export function coreSubpathExports(entry) {
  const tier = tierOfEntry(entry);
  const shared = [
    { name: 'sdk', path: 'sdk/SdkInventory.ets' },
    { name: 'modules', path: 'composition/ModuleRegistry.ets' },
    { name: 'host', path: 'host/HostAdapterContracts.ets' },
    { name: 'session', path: 'session/SessionStore.ets' },
  ];
  if (tier !== 'app') return shared;
  return [
    ...shared,
    { name: 'runtime', path: 'runtime/RuntimeEnv.ets' },
    { name: 'http-client', path: 'sdk/AppSdkClient.ets' },
  ];
}

// ---------------------------------------------------------------------------
// package source files
// ---------------------------------------------------------------------------

/**
 * Specifiers re-exported by `src/main/ets/Index.ets`.
 *
 * Each entry is a complete module specifier relative to `src/main/ets/Index.ets`,
 * not a bare path: the composition aggregate lives at `src/composition/index.ets`,
 * one level above `src/main/ets`, so `./`-prefixing a bare path here would emit
 * `./composition/Composition` for a file that does not exist.
 *
 * The core publishes its own static route registry and imports no capability, because
 * `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 5 forbids `core` from depending on
 * a capability package; the shell joins the capability slices (see
 * `shellRouteCompositionSource`). The core keeps `ModuleRegistry`, which holds static
 * descriptors.
 */
export function entryExports(entry) {
  if (entry.role === 'core') {
    return [
      '../../composition/index',
      './composition/DependencyManifest',
      './composition/ModuleRegistry',
      './composition/RouteRegistry',
      './composition/SdkInventory',
      './composition/HostRegistry',
      './sdk/SdkInventory',
      './sdk/AppSdkClient',
      './sdk/TokenManager',
      './session/SessionStore',
      './runtime/RuntimeEnv',
      './host/HostAdapterContracts',
    ];
  }
  if (entry.role === 'console-core' || entry.role === 'admin-core') {
    return [
      '../../composition/index',
      './composition/DependencyManifest',
      './composition/ModuleRegistry',
      './composition/RouteRegistry',
      './composition/SdkInventory',
      './composition/HostRegistry',
      './sdk/SdkInventory',
      './sdk/AppSdkClient',
      './session/SessionStore',
      './host/HostAdapterContracts',
    ];
  }
  if (entry.role === 'commons') {
    return [
      './theme/DesignTokens',
      './state/ScreenState',
      './components/ScreenStateView',
      './i18n/I18nHelpers',
      './l10n/FragmentBundle',
    ];
  }
  if (isShellRole(entry)) {
    return ['./navigation/RouteStack', './navigation/ShellRoutes', './auth/AuthGate', './routes/RouteRegistry'];
  }
  if (entry.role === 'host') {
    return ['./HostAdapters', './host/AdapterRegistry'];
  }
  return [
    './models/Models',
    `./services/${pascalTokenOf(entry)}Service`,
    `./services/${pascalTokenOf(entry)}SdkPort`,
    `./state/${pascalTokenOf(entry)}State`,
    `./presentation/viewModels/${pascalTokenOf(entry)}ViewModel`,
    `./presentation/controllers/${pascalTokenOf(entry)}Controller`,
    `./components/${pascalTokenOf(entry)}SummaryCard`,
    `./pages/${pascalTokenOf(entry)}Page`,
    './routes/RouteContributions',
    `./host/${pascalTokenOf(entry)}HostPort`,
    './i18n/index',
  ];
}

export function entrySource(entry) {
  const lines = [
    `${BANNER}`,
    '/**',
    ` * ${entry.name} public integration boundary.`,
    ' *',
    ' * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath',
    ' * declared in `package.json#exports` resolves through here, so a consumer',
    ' * importing the package root sees the same surface as one importing a subpath.',
    ' */',
    '',
  ];
  for (const specifier of entryExports(entry)) lines.push(`export * from '${specifier}';`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Static route identity registry of one tier (sections 4 and 7).
 *
 * Owner: `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 4 gives the route
 * registry to the tier's core package, and section 7 fixes the id shape as
 * `<surface>.<domain>.<capability>.<screen>`. `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md`
 * section 3 repeats it for this architecture and section 5 adds the rule that decides
 * the shape of this function: "cyclic ohpm/hvigor dependencies are forbidden", on top of
 * the alignment spec's "`core` and `commons` MUST NOT depend on capability packages".
 *
 * So the registry carries the identities inline and imports nothing. Eagerly counting a
 * capability's routes here would be `core -> capability -> core`; the shell, not the
 * core, is where the contributions get joined (`shellRouteCompositionSource`), which is
 * exactly what section 4 means by giving the shell "route contribution assembly".
 */
export function coreRouteRegistrySource(surface, tier, packages) {
  const dir = coreDirOf(surface, tier);
  const symbol = camel(pascalFromDir(dir));
  const owned = packages.filter(
    (entry) => entry.role === 'capability' && tierOfEntry(entry) === tier,
  );
  const entries = owned
    .map((entry) =>
      routesOfPackage(entry)
        .map((route) =>
          [
            '  {',
            `    id: '${routeId(route)}',`,
            `    surface: '${entry.surface === 'backend-admin' ? 'admin' : entry.surface}',`,
            `    capability: '${route.capability}',`,
            `    screen: '${route.screen}',`,
            `    pagePath: '${harmonyPagePathOf(surface, entry, route)}',`,
            `    titleKey: '${route.titleKey}',`,
            `    auth: '${route.auth}',`,
            `    harmonyNative: '${route.presentation.harmonyNative}',`,
            route.permissionHint ? `    permissionHint: '${route.permissionHint}',` : null,
            route.additionalPermissionHints
              ? `    additionalPermissionHints: [${route.additionalPermissionHints.map((hint) => `'${hint}'`).join(', ')}],`
              : null,
            '  },',
          ]
            .filter((line) => line !== null)
            .join('\n'),
        )
        .join('\n'),
    )
    .join('\n');
  const routeCount = owned.reduce((total, entry) => total + routesOfPackage(entry).length, 0);

  return `${BANNER}
/**
 * Canonical IAM route identity registry of the \`${tier}\` tier.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). \`id\` follows
 * \`<surface>.<domain>.<capability>.<screen>\` and is identical across every IAM client
 * root and every tier; only \`pagePath\` and \`harmonyNative\` are Harmony-specific.
 *
 * This registry holds the ${routeCount} \`${tier}\` route(s) and imports no other package,
 * because section 5 forbids \`core\` from depending on a capability package. The tier
 * shell joins the capability slices into composition order; this file is the single
 * place the identities are authored.
 */

/** Authentication mode of a route contribution. */
export type RouteAuth = 'public' | 'required';

/** HarmonyOS presentation of a route contribution (section 8). */
export type HarmonyRoutePresentation = 'page' | 'tab' | 'dialog' | 'sheet';

/**
 * One route of this tier.
 *
 * Route metadata must not declare API URLs, SDK methods, access tokens or signing
 * material (section 8), so this interface has no transport field.
 */
export interface RouteContribution {
  /** Cross-client route id, identical in every IAM client root. */
  readonly id: string;
  /** Route surface tier: \`app\`, \`console\` or \`admin\`. */
  readonly surface: string;
  /** Domain capability token. */
  readonly capability: string;
  /** Screen token within the capability. */
  readonly screen: string;
  /** Physical HarmonyOS page path. Physical paths may differ per platform. */
  readonly pagePath: string;
  /** Locale key of the screen title. */
  readonly titleKey: string;
  /** Whether the route requires an authenticated session. */
  readonly auth: RouteAuth;
  /** HarmonyOS presentation pattern. */
  readonly harmonyNative: HarmonyRoutePresentation;
  /** Primary permission hint, when the route is permission-gated. */
  readonly permissionHint?: string;
  /** Additional permission hints the route accepts. */
  readonly additionalPermissionHints?: string[];
}

/** Every route of the \`${tier}\` surface, in canonical order. */
export const ${symbol}RouteContributions: RouteContribution[] = [
${entries}
];

/** Route ids of the \`${tier}\` surface, in registry order. */
export function ${symbol}RouteIds(): string[] {
  return ${symbol}RouteContributions.map((entry: RouteContribution) => entry.id);
}

/** Routes of one capability token, for that capability's own contribution list. */
export function ${symbol}RoutesByCapability(capability: string): RouteContribution[] {
  return ${symbol}RouteContributions.filter(
    (entry: RouteContribution) => entry.capability === capability,
  );
}

/** Finds one route by its cross-client route id. */
export function find${pascalFromDir(dir)}Route(id: string): RouteContribution | undefined {
  return ${symbol}RouteContributions.find((entry: RouteContribution) => entry.id === id);
}
`;
}

/**
 * Route contributions of one capability package.
 *
 * The package exposes a *slice* of its tier core's registry instead of a second copy of
 * the identities. Section 5 leaves `capability -> core` as the only direction open to a
 * capability, and one authored identity list is also what stops a route id from existing
 * twice inside one root.
 */
export function routeContributionsSource(surface, entry) {
  const core = coreDirOf(surface, tierOfEntry(entry));
  const coreSymbol = camel(pascalFromDir(core));
  const symbol = camelSymbolOf(entry);
  return `${BANNER}
/**
 * Route contributions of \`${entry.dir}\`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * \`${core}\`, which owns the
 * \`${tierOfEntry(entry)}\` tier registry; this file narrows them to the \`${entry.capability}\`
 * capability so the pages, the tier shell and the entry bootstrap share one source of
 * truth.
 */

import { ${coreSymbol}RoutesByCapability, type RouteContribution } from '@sdkwork/${core}';

/** Every route \`${entry.dir}\` contributes, in registry order. */
export const ${symbol}RouteContributions: RouteContribution[] =
  ${coreSymbol}RoutesByCapability('${entry.capability}');

/**
 * Route ids of this capability, keyed by screen token.
 *
 * Derived rather than restated: a caller writes \`${constSymbolOf(entry)}_ROUTE_IDS.login\`
 * instead of a string literal, and the map cannot disagree with the registry it comes
 * from because nothing here spells an id out.
 */
export function ${symbol}RouteIdsByScreen(): Record<string, string> {
  const ids: Record<string, string> = {};
  for (const contribution of ${symbol}RouteContributions) {
    ids[contribution.screen] = contribution.id;
  }
  return ids;
}

/** Screen-token keyed route ids of \`${entry.dir}\`. */
export const ${constSymbolOf(entry)}_ROUTE_IDS: Record<string, string> = ${symbol}RouteIdsByScreen();
`;
}

/**
 * Physical HarmonyOS page path of one route.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 8 lets a physical path differ
 * per platform while the route id stays identical; the tier segment keeps two
 * tiers that share a capability from colliding in one path.
 */
export function harmonyPagePathOf(surface, entry, route) {
  const tier = tierOfEntry(entry);
  const tierSegment = tier === 'app' ? '' : `${tier}/`;
  return `pages/${tierSegment}${kebabTokenOf(entry)}/${pascalFromDir(
    `${kebabTokenOf(entry)}-${route.screen}`,
  )}`;
}

export function modelsSource(surface, entry, routes) {
  const pascal = pascalTokenOf(entry);
  const routeIdLines = routes
    .map((route) => `  /** Route id of \`${route.path}\`. */\n  static readonly ${camel(route.screen)}: string = '${routeId(route)}';`)
    .join('\n\n');
  return `${BANNER}
/**
 * View models, route parameters and SDK port shapes of \`${entry.dir}\`.
 *
 * Section 4 gives \`models/\` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface ${pascal}SdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type ${pascal}SdkPortResolver = () => ${pascal}SdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class ${pascal}Routes {
${routeIdLines}
}

/** Route parameters the \`${kebabTokenOf(entry)}\` pages read. */
export interface ${pascal}RouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the \`${kebabTokenOf(entry)}\` capability. */
export interface ${pascal}ViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface ${pascal}ListItem {
  readonly id: string;
  readonly labelKey: string;
}
`;
}

export function stateSource(surface, entry) {
  const pascal = pascalTokenOf(entry);
  return `${BANNER}
/**
 * Presentation state of \`${entry.dir}\`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so the state object is a plain value and the controller
 * is what replaces it.
 */

import { type ScreenState } from '@sdkwork/${commonsDir(surface)}';

/** State of the \`${kebabTokenOf(entry)}\` capability. */
export interface ${pascal}State {
  /** Which of the required screen states is active (section 11). */
  readonly status: ScreenState;
  /** Locale key of the last user-safe failure, or undefined after a success. */
  readonly errorKey?: string;
  /** Identifiers of the records currently displayed. */
  readonly items: string[];
}

/** The state a screen renders before its first request resolves. */
export function create${pascal}State(): ${pascal}State {
  return { status: 'loading', items: [] };
}

/**
 * Applies a result to the previous state.
 *
 * Returns a new value rather than mutating, so a controller can hand the previous
 * state to a comparison or a test without it changing underneath.
 */
export function apply${pascal}Result(
  state: ${pascal}State,
  items: string[],
): ${pascal}State {
  return {
    status: items.length === 0 ? 'empty' : 'success',
    items,
    errorKey: undefined,
  };
}

/** Applies a user-safe failure. */
export function apply${pascal}Failure(
  state: ${pascal}State,
  errorKey: string,
): ${pascal}State {
  return { status: 'error', items: state.items, errorKey };
}
`;
}

export function serviceSource(surface, entry, routes) {
  const pascal = pascalTokenOf(entry);
  const apiPath = entry.surface === 'backend-admin' ? 'backend' : 'app';
  const routeLines = routes.map((route) => `  '${routeId(route)}': '${route.path}',`).join('\n');
  return `${BANNER}
/**
 * Use-case orchestration of \`${entry.dir}\`.
 *
 * Section 6: this package consumes \`/${apiPath}/v3/api\` through the generated
 * ArkTS app SDK client that the bootstrap injected. The service receives its
 * collaborators through the resolver, so it never constructs a client and never
 * composes raw HTTP or manual authorization headers.
 */

import { type ${pascal}SdkPort, type ${pascal}SdkPortResolver } from '../models/Models';

/** Physical paths this package's routes resolve to on HarmonyOS. */
export const ${constSymbolOf(entry)}_ROUTE_PATHS: Record<string, string> = {
${routeLines}
};

/** Validation, route resolution and error mapping of the \`${kebabTokenOf(entry)}\` capability. */
export class ${pascal}Service {
  private readonly resolvePort: ${pascal}SdkPortResolver;

  constructor(resolvePort: ${pascal}SdkPortResolver) {
    this.resolvePort = resolvePort;
  }

  /**
   * Maps a physical HarmonyOS page path back to its cross-client route id.
   *
   * Section 8 resolves a deep link to a route id before converting it into a
   * navigation action, so the reverse lookup lives beside the forward one.
   */
  routeIdForPagePath(pagePath: string): string | undefined {
    let found: string | undefined = undefined;
    // Iterated by key rather than through \`Object.entries\` destructuring: ArkTS
    // rejects a destructuring declaration binding, which the ArkUI template packages
    // avoid everywhere.
    for (const id of Object.keys(${constSymbolOf(entry)}_ROUTE_PATHS)) {
      if (${constSymbolOf(entry)}_ROUTE_PATHS[id] === pagePath) {
        found = id;
      }
    }
    return found;
  }

  /**
   * Reads the injected SDK base URL.
   *
   * Deliberately returns just the origin: the generated transport owns API path
   * prefixing (\`ENVIRONMENT_SPEC.md\` section 5.1.4.1), so a service that appended
   * \`/app/v3/api\` here would double it at request time.
   */
  baseUrl(): string {
    return this.resolvePort().baseUrl;
  }
}
`;
}

/** The injection seam a capability package exposes to the root bootstrap. */
export function sdkPortSource(surface, entry) {
  const pascal = pascalTokenOf(entry);
  const constSymbol = constSymbolOf(entry);
  return `${BANNER}
/**
 * Injected SDK port holder of \`${entry.dir}\`.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 6. Runtime
 * bootstrap constructs the generated SDK client and injects it; capability
 * services only ever receive it. This module is the injection seam, so the
 * services never construct a client and never fall back to raw request APIs.
 *
 * PREREQUISITE, stated rather than hidden: the SDK generation chain emits
 * TypeScript, Dart, Kotlin, Swift, C#, Go, Java, Python and Rust targets for
 * \`sdkwork-iam-app-sdk\`; no ArkTS target exists yet (see \`sdks/README.md\`).
 * Until one lands nothing can satisfy \`${pascal}SdkPort\`, so resolution fails with
 * a named, user-safe error instead of a fabricated transport. The capability
 * renders that as its error state, which is why the app still boots and the
 * shell, session, routing and locale layers stay verifiable.
 *
 * Registration replaces rather than accumulates: bootstrap calls it once, and a
 * later call (for example after a profile switch) must replace the client instead
 * of leaving two transports alive against different origins.
 */

import { type ${pascal}SdkPort, type ${pascal}SdkPortResolver } from '../models/Models';

/** Stable code surfaced to the UI so an error state is not string-matched. */
export const ${constSymbol}_SDK_UNAVAILABLE_CODE: string = 'harmony-${kebabTokenOf(entry)}-sdk-unavailable';

/**
 * User-safe resolution failure.
 *
 * Carries no origin, token or stack detail: this instance is what reaches a phone
 * screen through the screen-state error message.
 */
export class ${pascal}SdkUnavailableError extends Error {
  readonly code: string = ${constSymbol}_SDK_UNAVAILABLE_CODE;

  constructor(message: string) {
    super(message);
    this.name = '${pascal}SdkUnavailableError';
  }
}

const UNAVAILABLE_MESSAGE: string =
  'The generated ArkTS IAM app SDK client is not registered for harmony-native yet.';

let registeredPort: ${pascal}SdkPort | undefined = undefined;

/** Registers the client constructed by the root bootstrap. */
export function register${pascal}SdkPort(port: ${pascal}SdkPort): void {
  registeredPort = port;
}

export function is${pascal}SdkPortRegistered(): boolean {
  return registeredPort !== undefined;
}

/**
 * Resolves the registered client, or fails with a named error.
 *
 * Called lazily from inside a service method rather than at import time so a
 * missing transport cannot break module loading — that would take down the shell
 * and the session screen along with this capability.
 */
export function resolve${pascal}SdkPort(): ${pascal}SdkPort {
  const port: ${pascal}SdkPort | undefined = registeredPort;
  if (port === undefined) {
    throw new ${pascal}SdkUnavailableError(UNAVAILABLE_MESSAGE);
  }
  return port;
}

/**
 * Clears the registered client.
 *
 * Logout and profile switches must call this together with the session store and
 * the realtime bridges (section 6).
 */
export function reset${pascal}SdkPort(): void {
  registeredPort = undefined;
}

/** The resolver every service in this package is constructed with. */
export const resolve${pascal}SdkPortResolver: ${pascal}SdkPortResolver = resolve${pascal}SdkPort;
`;
}

export function viewModelSource(surface, entry, routes) {
  const pascal = pascalTokenOf(entry);
  return `${BANNER}
/**
 * View model of \`${entry.dir}\`.
 *
 * Section 4: \`presentation/viewModels/\` maps capability state onto what a screen
 * renders. It holds no transport and reads no runtime environment.
 */

import { type ${pascal}State } from '../../state/${pascal}State';
import { type ${pascal}ViewModel } from '../../models/Models';

/**
 * Re-export of the projected type.
 *
 * A screen that renders this view model needs both the type and the projector, and
 * it reaches both through this module. Without the re-export the page's
 * \`import { type ${pascal}ViewModel } from '../presentation/viewModels/${pascal}ViewModel'\`
 * names a binding this module never exports: importing a type is not re-exporting
 * it, so the page compiled nowhere while the module itself stayed clean.
 */
export { type ${pascal}ViewModel } from '../../models/Models';

/** Locale keys of the screens this package contributes. */
export const ${constSymbolOf(entry)}_TITLE_KEYS: string[] = [
${routes.map((route) => `  '${route.titleKey}',`).join('\n')}
];

/**
 * Projects capability state onto the view model.
 *
 * The error key is passed through unchanged rather than resolved to copy here:
 * locale resolution belongs to the screen, which knows the active locale.
 */
export function to${pascal}ViewModel(state: ${pascal}State, titleKey: string): ${pascal}ViewModel {
  return {
    titleKey,
    loading: state.status === 'loading',
    errorKey: state.errorKey,
  };
}
`;
}

export function controllerSource(surface, entry, routes) {
  const pascal = pascalTokenOf(entry);
  return `${BANNER}
/**
 * Controller of \`${entry.dir}\`.
 *
 * Section 3: this root's primary presentation pattern is controllers. The
 * controller owns the state transition and calls the service; it must not build an
 * SDK client or compose a request.
 */

import { ${pascal}Service } from '../../services/${pascal}Service';
import {
  apply${pascal}Failure,
  apply${pascal}Result,
  create${pascal}State,
  type ${pascal}State,
} from '../../state/${pascal}State';

/** Drives one \`${kebabTokenOf(entry)}\` screen. */
export class ${pascal}Controller {
  private state: ${pascal}State = create${pascal}State();
  private readonly service: ${pascal}Service;

  constructor(service: ${pascal}Service) {
    this.service = service;
  }

  /** Current state, for a screen that renders without subscribing. */
  current(): ${pascal}State {
    return this.state;
  }

  /** Applies a resolved list of record identifiers. */
  loaded(items: string[]): ${pascal}State {
    this.state = apply${pascal}Result(this.state, items);
    return this.state;
  }

  /**
   * Applies a failure.
   *
   * Takes a locale key rather than a message so the same failure renders in the
   * active locale, and so no backend detail can reach the screen through it.
   */
  failed(errorKey: string): ${pascal}State {
    this.state = apply${pascal}Failure(this.state, errorKey);
    return this.state;
  }

  /** Reads the injected SDK origin through the service. */
  baseUrl(): string {
    return this.service.baseUrl();
  }
}
`;
}

export function pageSource(surface, entry, routes) {
  const pascal = pascalTokenOf(entry);
  const constSymbol = constSymbolOf(entry);
  return `${BANNER}
/**
 * Page of the \`${kebabTokenOf(entry)}\` capability.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 11 requires loading, success,
 * empty, validation-error, permission-denied, offline and unknown-error coverage;
 * the screen delegates every one of them to the shared \`ScreenStateView\` so no
 * page re-implements a state and none can silently omit one.
 *
 * PENDING PLATFORM WIRING: the device locale comes from the HarmonyOS
 * localization kit (\`@kit.LocalizationKit\`). That call needs the DevEco toolchain
 * to compile, so it is not shipped as unverified code here; the locale is passed
 * down from the root page instead.
 */
import { ScreenStateView, type ScreenState } from '@sdkwork/${commonsDir(surface)}';

import { type ${pascal}ViewModel } from '../presentation/viewModels/${pascal}ViewModel';

/** Route ids this page can be mounted for. */
export const ${constSymbol}_PAGE_ROUTE_IDS: string[] = [
${routes.map((route) => `  '${routeId(route)}',`).join('\n')}
];

@Component
export struct ${pascal}Page {
  locale: string = 'en-US';
  offline: boolean = false;
  permissionDenied: boolean = false;
  viewModel: ${pascal}ViewModel = { titleKey: '', loading: true };

  /**
   * Which state to render.
   *
   * Ordered so a permission denial is reported ahead of a transient network
   * failure: telling a user to retry a request they are not allowed to make is
   * worse than saying nothing.
   */
  private screenState(): ScreenState {
    if (this.permissionDenied) return 'permission-denied';
    if (this.offline) return 'offline';
    if (this.viewModel.errorKey !== undefined) return 'error';
    if (this.viewModel.loading) return 'loading';
    return 'success';
  }

  build() {
    Column() {
      ScreenStateView({
        status: this.screenState(),
        message: this.viewModel.titleKey,
        retryLabel: '',
      })
    }
    .width('100%')
    .height('100%')
  }
}
`;
}

export function summaryCardSource(surface, entry) {
  const pascal = pascalTokenOf(entry);
  return `${BANNER}
/**
 * Summary card of \`${entry.dir}\`.
 *
 * Section 4: \`components/\` owns reusable or domain-specific UI. This component
 * reads design tokens from \`commons\` rather than literals so one token change
 * moves every card in the root.
 */
import { DesignTokens } from '@sdkwork/${commonsDir(surface)}';

@Component
export struct ${pascal}SummaryCard {
  label: string = '';
  value: string = '';

  build() {
    Column() {
      Text(this.label)
        .fontSize(DesignTokens.fontSizeCaption)
        .fontColor(DesignTokens.colorTextSecondary)
      Text(this.value)
        .fontSize(DesignTokens.fontSizeTitle)
        .fontColor(DesignTokens.colorTextPrimary)
    }
    .padding(DesignTokens.spacingMd)
    .width('100%')
  }
}
`;
}

/**
 * Host port declaration of one capability package.
 *
 * Section 7: a feature package depends on host adapter *interfaces*, never on
 * HarmonyOS system APIs or an ability context. The port is declared empty until
 * the capability needs one, so the boundary exists before the first use rather
 * than being retrofitted around a direct platform call.
 */
export function capabilityHostPortSource(surface, entry) {
  const pascal = pascalTokenOf(entry);
  return `${BANNER}
/**
 * Host adapter needs of \`${entry.dir}\`.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 7. A feature package
 * depends on host adapter interfaces declared in the tier core; it must not call
 * HarmonyOS system APIs, hold an ability context, or handle a raw want.
 *
 * The capability currently needs no platform adapter beyond \`secureStorage\`, which
 * the session store reaches through the core's host registry. The type below
 * exists so a future need is added here instead of inline in a page.
 */

/** Host capabilities this package is allowed to consume. */
export const ${constSymbolOf(entry)}_HOST_CAPABILITIES: string[] = [];
`;
}

// ---------------------------------------------------------------------------
// commons, shell, host, core
// ---------------------------------------------------------------------------

export function designTokensSource() {
  return `${BANNER}
/**
 * Domain-neutral design tokens.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 3 gives \`commons\` theme
 * adapters and design tokens; \`APP_HARMONY_NATIVE_UI_SPEC.md\` keeps shared UI
 * primitives domain-neutral. A screen that writes a literal colour instead of one
 * of these tokens is the drift this module exists to prevent.
 */
export class DesignTokens {
  static readonly colorTextPrimary: string = '#182431';

  static readonly colorTextSecondary: string = '#666666';

  static readonly colorBackground: string = '#FFFFFF';

  static readonly colorDivider: string = '#E5E5E5';

  static readonly spacingSm: number = 8;

  static readonly spacingMd: number = 16;

  static readonly spacingLg: number = 24;

  static readonly fontSizeCaption: number = 12;

  static readonly fontSizeBody: number = 16;

  static readonly fontSizeTitle: number = 20;
}
`;
}

export function screenStateSource() {
  return `${BANNER}
/**
 * Screen state vocabulary of this root.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 11 requires UI coverage for
 * loading, success, empty, validation-error, permission-denied, offline and
 * unknown-error. A closed union means a page cannot invent a state the shared view
 * does not render, and a new state cannot be added without updating both.
 */
export type ScreenState =
  | 'loading'
  | 'success'
  | 'empty'
  | 'validation-error'
  | 'permission-denied'
  | 'offline'
  | 'unknown-error'
  | 'error';
`;
}

export function screenStateViewSource() {
  return `${BANNER}
/**
 * Shared screen-state view.
 *
 * Every page routes its state through this component so loading, empty,
 * permission-denied, offline and error render identically across capabilities.
 * The message is a locale key resolved by \`I18nHelpers\`, never a backend string:
 * a server detail is not user-safe copy.
 */
import { ScreenState, } from '../state/ScreenState';
import { resolveMessage } from '../i18n/I18nHelpers';
import { DesignTokens } from '../theme/DesignTokens';

@Component
export struct ScreenStateView {
  status: ScreenState = 'loading';
  message: string = '';
  retryLabel: string = '';

  build() {
    Column() {
      Text(resolveMessage(this.message))
        .fontSize(DesignTokens.fontSizeBody)
        .fontColor(
          this.status === 'error' || this.status === 'unknown-error'
            ? DesignTokens.colorTextSecondary
            : DesignTokens.colorTextPrimary,
        )
    }
    .padding(DesignTokens.spacingMd)
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
`;
}

export function i18nHelpersSource() {
  return `${BANNER}
/**
 * Locale helpers of \`commons\`.
 *
 * \`I18N_SPEC.md\` section 4 retires a custom locale request header in favour of
 * \`Accept-Language\`; nothing here may reintroduce one. This module owns locale
 * normalization and message lookup only — the loader that reads fragments lives in
 * \`l10n/FragmentBundle\`, outside the authored locale tree of any package.
 */

/** Default locale of this root. */
export const IAM_HARMONY_DEFAULT_LOCALE: string = 'en-US';

/** Locales this root ships fragments for. */
export const IAM_HARMONY_SUPPORTED_LOCALES: string[] = ['en-US', 'zh-CN'];

/**
 * The message shown when no locale key resolves.
 *
 * A literal rather than a key: a resolver that falls back to a key would render
 * the key itself, which reads as a defect to a user and hides the missing
 * translation from whoever is looking.
 */
export const IAM_HARMONY_UNKNOWN_ERROR: string = 'An unexpected error occurred.';

/** Normalizes a device locale onto a supported locale. */
export function normalizeLocale(locale: string | undefined): string {
  const value: string = locale === undefined ? '' : locale.trim().replace('_', '-');
  const exact: string | undefined = IAM_HARMONY_SUPPORTED_LOCALES.find(
    (candidate: string) => candidate === value,
  );
  if (exact !== undefined) return exact;
  const language: string = value.split('-')[0].toLowerCase();
  const prefix: string | undefined = IAM_HARMONY_SUPPORTED_LOCALES.find(
    (candidate: string) => candidate.split('-')[0].toLowerCase() === language,
  );
  return prefix === undefined ? IAM_HARMONY_DEFAULT_LOCALE : prefix;
}

/**
 * Resolves a locale key through a fragment map.
 *
 * Returns the key itself only when the key is non-empty and unresolved is a
 * programming error; an empty key returns the shared unknown-error copy instead,
 * because an empty string renders as a blank screen with no explanation.
 */
export function resolveMessage(
  key: string,
  fragments: Record<string, string> = {},
): string {
  const normalized: string = key.trim();
  if (normalized.length === 0) return IAM_HARMONY_UNKNOWN_ERROR;
  const found: string | undefined = fragments[normalized];
  return found === undefined ? normalized : found;
}

/**
 * Turns any thrown value into a user-safe message.
 *
 * Section 7 requires adapters to expose stable user-safe errors; the same rule
 * applies to anything that reaches a screen.
 */
export function resolveErrorMessage(error: unknown): string {
  const message: string = error instanceof Error ? error.message : '';
  return message.trim().length > 0 ? message : IAM_HARMONY_UNKNOWN_ERROR;
}
`;
}

/**
 * `src/main/ets/l10n/FragmentBundle.ets` — the locale fragment loader.
 *
 * Outside `lib`-equivalent `i18n/` on purpose: `I18N_SPEC.md` section 199 reserves
 * the authored locale tree for `<locale>/<domain>/<capability>/<fragment>` plus one
 * thin boundary file, and this module is infrastructure rather than locale source.
 * Naming it `index` to slip past the layout check would satisfy the letter of the
 * rule while emptying it.
 */
export function fragmentBundleSource(surface, entry) {
  return `${BANNER}
/**
 * Locale fragment loader of \`commons\`.
 *
 * Fragments are authored per capability package under
 * \`src/main/ets/i18n/<locale>/iam/<capability>/*.json\`, so the root needs one
 * place that turns a locale plus a set of already-imported modules into one lookup
 * table. It lives outside the authored locale tree because it is infrastructure,
 * not message copy: \`I18N_SPEC.md\` section 199 reserves
 * \`<locale>/<domain>/<capability>/<fragment>\` plus one thin boundary file for
 * authored copy.
 *
 * Registration is by \`(locale, capability)\` rather than by a merged key prefix, so
 * two packages cannot silently overwrite each other's keys.
 */

/** One package's fragments for one locale. */
export interface LocaleFragmentRegistration {
  readonly locale: string;
  readonly capability: string;
  readonly messages: Record<string, string>;
}

let registrations: LocaleFragmentRegistration[] = [];

export function registerLocaleFragments(registration: LocaleFragmentRegistration): void {
  registrations = registrations.filter(
    (entry: LocaleFragmentRegistration) =>
      !(entry.locale === registration.locale && entry.capability === registration.capability),
  );
  registrations.push(registration);
}

export function resetLocaleFragments(): void {
  registrations = [];
}

export function registeredCapabilities(locale: string): string[] {
  return registrations
    .filter((entry: LocaleFragmentRegistration) => entry.locale === locale)
    .map((entry: LocaleFragmentRegistration) => entry.capability)
    .sort();
}

/**
 * Merges every registered fragment of one locale.
 *
 * Later registrations win per key, and the capability name is carried in the
 * registration rather than in the key, so a key collision shows up as a
 * capability conflict a reviewer can see instead of an opaque overwrite.
 */
export function localeMessages(locale: string): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const registration of registrations) {
    if (registration.locale !== locale) continue;
    for (const key of Object.keys(registration.messages)) {
      merged[key] = registration.messages[key];
    }
  }
  return merged;
}
`;
}

/** `src/main/ets/navigation/ShellRoutes.ets` — the shell's registration shape. */
export function shellRoutesSource(surface, tier) {
  const coreDir = coreDirOf(surface, tier);
  const name = tier === 'app' ? 'IamHarmony' : `IamHarmony${pascalFromDir(tier)}`;
  const constName = upperSnake(name);
  return `${BANNER}
/**
 * Navigation registration shape owned by the \`${tier}\` shell.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 5 places the shell above the
 * capability packages, so a capability consumes the shell's public export rather
 * than re-declaring the navigator's contract. The shell owns the shape and the
 * validation; a capability only projects its own contributions onto it.
 */
import {
  type RouteAuth,
  type HarmonyRoutePresentation,
} from '@sdkwork/${coreDir}';

/** One route the navigator can mount. */
export interface ${name}RouteRegistration {
  readonly id: string;
  readonly pagePath: string;
  readonly titleKey: string;
  readonly auth: RouteAuth;
  readonly harnessLayoutGroup?: 'main' | 'stack';
  readonly harmonyNative: HarmonyRoutePresentation;
}

/**
 * Route id the navigator opens for an authentication state.
 *
 * The login screen is the only public entry; every other route is reachable only
 * after the auth gate has passed (\`IAM_LOGIN_INTEGRATION_SPEC.md\`).
 */
export function resolve${name}EntryRouteId(
  registrations: ${name}RouteRegistration[],
  authenticated: boolean,
): string | undefined {
  const candidates: ${name}RouteRegistration[] = registrations.filter(
    (entry: ${name}RouteRegistration) => (authenticated ? entry.auth === 'required' : entry.auth === 'public'),
  );
  const ordered: ${name}RouteRegistration[] = candidates.sort(
    (left: ${name}RouteRegistration, right: ${name}RouteRegistration) => left.id.localeCompare(right.id),
  );
  return ordered.length === 0 ? undefined : ordered[0].id;
}

/**
 * Validates that every registration names a page path.
 *
 * A registration without a page path is a route the navigator cannot mount, and
 * section 8 wants that to fail where the registry is built instead of at the tap
 * that never navigates.
 */
export function validate${name}Registrations(
  registrations: ${name}RouteRegistration[],
): string[] {
  const issues: string[] = [];
  for (const entry of registrations) {
    if (entry.pagePath.trim().length === 0) {
      issues.push(entry.id + ' has no page path');
    }
    if (entry.titleKey.trim().length === 0) {
      issues.push(entry.id + ' has no title key');
    }
  }
  const ids: string[] = registrations.map((entry: ${name}RouteRegistration) => entry.id);
  const unique: string[] = Array.from(new Set(ids));
  if (unique.length !== ids.length) {
    issues.push('duplicate route id in the ${tier} tier registry');
  }
  return issues;
}
`;
}

export function routeStackSource(surface, tier) {
  const name = tier === 'app' ? 'IamHarmony' : `IamHarmony${pascalFromDir(tier)}`;
  return `${BANNER}
/**
 * Push/pop stack of the \`${tier}\` shell.
 *
 * The navigator keeps a stack rather than an index so a route can be replaced
 * without losing the entry it was pushed from, and so a back action is always
 * defined even when the current route is the first one pushed.
 */
import { type ${name}RouteRegistration } from './ShellRoutes';

let stack: ${name}RouteRegistration[] = [];

export function push${name}Route(route: ${name}RouteRegistration): void {
  stack = stack.concat([route]);
}

/**
 * Pops the top route.
 *
 * Returns the new top rather than the popped route: every caller is a screen that
 * needs to know what to render next, and returning the removed entry invites a
 * caller to navigate back to the route it just left.
 */
export function pop${name}Route(): ${name}RouteRegistration | undefined {
  const next: ${name}RouteRegistration[] = stack.slice(0, Math.max(stack.length - 1, 0));
  stack = next;
  return next.length === 0 ? undefined : next[next.length - 1];
}

export function current${name}Route(): ${name}RouteRegistration | undefined {
  return stack.length === 0 ? undefined : stack[stack.length - 1];
}

export function reset${name}RouteStack(): void {
  stack = [];
}
`;
}

export function authGateSource(surface, tier) {
  const name = tier === 'app' ? 'IamHarmony' : `IamHarmony${pascalFromDir(tier)}`;
  const coreDir = coreDirOf(surface, tier);
  // The session symbols belong to the tier core, and the core names them after its
  // own directory (`coreSessionSource` uses `pascalFromDir(coreDir)`), not after the
  // shell. Deriving the prefix from `${'$'}{name}` here produced
  // `isIAM_HARMONY_CONSOLE_SessionComplete` for an export that is actually
  // `isSdkworkIamHarmonyMobileConsoleCoreSessionComplete`.
  const coreSymbol = pascalFromDir(coreDir);
  return `${BANNER}
/**
 * Authentication gate of the \`${tier}\` shell.
 *
 * \`IAM_LOGIN_INTEGRATION_SPEC.md\` and \`APP_SDK_INTEGRATION_SPEC.md\`: a protected
 * route is never mounted before the session is complete, and a logout or refresh
 * failure clears the session, the token manager and the realtime bridges together.
 */
import { is${coreSymbol}SessionComplete, read${coreSymbol}Session } from '@sdkwork/${coreDir}';

/** Whether a protected route may be mounted. */
export function ${camel(name)}AllowsRoute(auth: 'public' | 'required'): boolean {
  if (auth === 'public') return true;
  return is${coreSymbol}SessionComplete(read${coreSymbol}Session());
}
`;
}

export function hostAdaptersSource(surface, entry) {
  const caps = [
    'secureStorage',
    'networkStatus',
    'appLifecycle',
    'deepLinks',
    'filePicker',
    'pushNotifications',
    'clipboard',
    'deviceInfo',
  ];
  return `${BANNER}
/**
 * HarmonyOS platform adapters.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 7. Every adapter
 * returns a typed result and a stable user-safe error
 * (\`unsupported\`, \`permission-denied\`, \`unavailable\`, \`cancelled\`,
 * \`invalid-state\`) instead of throwing a platform error, and no feature package
 * may reach a HarmonyOS system API directly.
 *
 * Every adapter reports \`unsupported\` in this slice. That is a truthful statement
 * about what is implemented, not a stub: no HarmonyOS SDK/DevEco toolchain is
 * present in this repository, so a platform call could not be compiled or tested
 * here. Feature code already handles the error value, so implementing one adapter
 * is a change to this file alone.
 */
import {
  type AppLifecycleAdapter,
  type ClipboardAdapter,
  type DeepLinkAdapter,
  type DeviceInfoAdapter,
  type FilePickerAdapter,
  type HostAdapterResult,
  type NetworkStatusAdapter,
  type PushNotificationsAdapter,
  type SecureStorageAdapter,
} from '@sdkwork/${coreDirOf(surface, 'app')}';

function unsupported<T>(): HostAdapterResult<T> {
  return { ok: false, error: 'unsupported' };
}

const secureStorageAdapter: SecureStorageAdapter = {
  get: (key: string) => Promise.resolve(unsupported<string>()),
  set: (key: string, value: string) => Promise.resolve(unsupported<void>()),
  remove: (key: string) => Promise.resolve(unsupported<void>()),
  clear: () => Promise.resolve(unsupported<void>()),
};

const networkStatusAdapter: NetworkStatusAdapter = {
  isOnline: () => Promise.resolve(unsupported<boolean>()),
};

const appLifecycleAdapter: AppLifecycleAdapter = {
  currentState: () => Promise.resolve(unsupported<string>()),
};

const filePickerAdapter: FilePickerAdapter = {
  pickImage: () => Promise.resolve(unsupported<string>()),
  pickFile: () => Promise.resolve(unsupported<string>()),
};

const deepLinkAdapter: DeepLinkAdapter = {
  currentRouteId: () => Promise.resolve(unsupported<string>()),
  registerHandler: (handler: (routeId: string) => void) => Promise.resolve(unsupported<void>()),
};

const pushNotificationsAdapter: PushNotificationsAdapter = {
  requestPermission: () => Promise.resolve(unsupported<boolean>()),
  currentToken: () => Promise.resolve(unsupported<string>()),
};

const clipboardAdapter: ClipboardAdapter = {
  readText: () => Promise.resolve(unsupported<string>()),
  writeText: (value: string) => Promise.resolve(unsupported<void>()),
};

const deviceInfoAdapter: DeviceInfoAdapter = {
  model: () => Promise.resolve(unsupported<string>()),
  osVersion: () => Promise.resolve(unsupported<string>()),
};

/**
 * Typed facade over the adapters this root implements.
 *
 * Declared as named properties rather than as a \`Record<string, Object>\` because the
 * bootstrap has to call an adapter method: on an untyped record that call is a type
 * error, and the workaround — casting at the call site — is exactly how a platform
 * call migrates out of the host boundary.
 *
 * The set is narrower than the seventeen categories section 7 lists. Those are the
 * standard categories, not a checklist a slice must implement: an adapter is
 * declared here when this root can answer for it, and every one of them reports
 * \`unsupported\` until the HarmonyOS toolchain and a concrete implementation land.
 */
export interface IamHarmonyHostAdapters {
  readonly secureStorage: SecureStorageAdapter;
  readonly networkStatus: NetworkStatusAdapter;
  readonly appLifecycle: AppLifecycleAdapter;
  readonly deepLinks: DeepLinkAdapter;
  readonly filePicker: FilePickerAdapter;
  readonly pushNotifications: PushNotificationsAdapter;
  readonly clipboard: ClipboardAdapter;
  readonly deviceInfo: DeviceInfoAdapter;
}

/** Every adapter this package implements, by capability name. */
export const iamHarmonyHostAdapters: IamHarmonyHostAdapters = {
  'secureStorage': secureStorageAdapter,
  'networkStatus': networkStatusAdapter,
  'appLifecycle': appLifecycleAdapter,
  'deepLinks': deepLinkAdapter,
  'filePicker': filePickerAdapter,
  'pushNotifications': pushNotificationsAdapter,
  'clipboard': clipboardAdapter,
  'deviceInfo': deviceInfoAdapter,
};

/**
 * The capability set advertised to feature code.
 *
 * Every entry reports \`unsupported\` today, so the registry marks each one
 * unavailable and a feature asks before it calls. Registering them anyway is what
 * makes "not implemented yet" distinguishable from "not registered", which is the
 * difference between a screen rendering its unavailable state and a screen throwing.
 */
export const ${upperSnake('IamHarmonyHost')}_CAPABILITIES: string[] = [
${caps.map((capability) => `  '${capability}',`).join('\n')}
];
`;
}

export function adapterRegistrySource(surface) {
  return `${BANNER}
/**
 * Host adapter registry.
 *
 * Section 7: the registry is readable as static metadata so a feature can ask "is
 * this capability available on this host?" during render without constructing an
 * adapter or touching the platform. An adapter that reports \`unsupported\` is
 * registered and honestly reports itself unavailable, which is what lets a screen
 * render a permission-denied or unavailable state instead of crashing.
 *
 * Declared here rather than reusing the app core's contracts so this module has no
 * import at all: a registry read during render must not be able to fail because a
 * package it only nominally depends on did not resolve.
 */

/** One registered adapter. */
export interface HostAdapterRegistration {
  readonly name: string;
  readonly available: boolean;
}

let registrations: HostAdapterRegistration[] = [];

export function registerHostAdapters(entries: HostAdapterRegistration[]): void {
  registrations = entries;
}

export function listHostAdapters(): HostAdapterRegistration[] {
  return registrations;
}

export function hasHostCapability(name: string): boolean {
  return registrations.some((entry: HostAdapterRegistration) => entry.name === name && entry.available);
}
`;
}

// ---------------------------------------------------------------------------
// tier cores
// ---------------------------------------------------------------------------

export function coreCompositionSource(surface, tier) {
  return `${BANNER}
/**
 * Cross-architecture composition entry of the \`${tier}\` core.
 *
 * Authority: \`APP_COMPOSITION_SPEC.md\`. Feature packages resolve runtime
 * composition metadata through this core package public export only, never through
 * another package's private source path.
 */
export * from '../main/ets/composition/DependencyManifest';
export * from '../main/ets/composition/ModuleRegistry';
export * from '../main/ets/composition/RouteRegistry';
`;
}

export function coreDependencyManifestSource(surface, tier) {
  const dir = coreDirOf(surface, tier);
  return `${BANNER}
/**
 * Composition metadata pointer of \`${dir}\`.
 *
 * \`APP_COMPOSITION_SPEC.md\` resolves composition metadata through the core package
 * export, so the path is relative to the package root that owns
 * \`specs/component.spec.json\`.
 */
export const ${upperSnake(pascalFromDir(dir))}_COMPONENT_SPEC_PATH: string =
  '../../../specs/component.spec.json';
`;
}

/**
 * Route composition of one tier, owned by that tier's shell.
 *
 * Owner: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 5 — the allowed flow is
 * `core, commons -> shell, console-core, admin-core -> console-shell, admin-shell ->
 * capabilities -> entry -> host`, and "cyclic ohpm/hvigor dependencies are forbidden".
 * `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 4 gives the shell "route
 * contribution assembly" and section 5 states the rule — "shell packages compose route
 * contributions and layout" — while forbidding `core` and `commons` from depending on a
 * capability package.
 *
 * That combination fixes the composition site as the shell. The edge is acyclic because
 * section 5's list of what a capability may depend on (core public contracts, `commons`,
 * generated SDK ports, appbase wrappers, approved shared contracts, local host adapter
 * contracts) does not include the shell.
 *
 * The identities are still authored once, in the tier core's `RouteRegistry.ets`; each
 * capability narrows that registry to its slice and this file only joins the slices.
 */
export function shellRouteCompositionSource(surface, tier, packages) {
  const name = tier === 'app' ? 'IamHarmony' : `IamHarmony${pascalFromDir(tier)}`;
  const core = coreDirOf(surface, tier);
  const coreSymbol = camel(pascalFromDir(core));
  const owned = packages.filter(
    (entry) => entry.role === 'capability' && tierOfEntry(entry) === tier,
  );
  const imports = owned
    .map((entry) => `import { ${camelSymbolOf(entry)}RouteContributions } from '@sdkwork/${entry.dir}';`)
    .join('\n');
  const spread = owned.map((entry) => `  ...${camelSymbolOf(entry)}RouteContributions,`).join('\n');
  return `${BANNER}
/**
 * Route composition of the \`${tier}\` tier.
 *
 * Joins the route contributions of this tier's own capability packages, so the app,
 * console and admin compositions stay independent even though one root ships all three.
 * Ids come from \`${core}\`, which owns the
 * registry, so this file adds no identities of its own.
 */
import { type RouteContribution } from '@sdkwork/${core}';
${imports}

/** Every route the \`${tier}\` tier contributes. */
export function ${camel(name)}RouteContributions(): RouteContribution[] {
  return [
${spread}
  ];
}

/** Route ids of the \`${tier}\` tier, in composition order. */
export function ${camel(name)}RouteIds(): string[] {
  return ${camel(name)}RouteContributions().map((entry: RouteContribution) => entry.id);
}
`;
}

export function coreModuleRegistrySource(surface, tier, packages) {
  const dir = coreDirOf(surface, tier);
  const symbol = pascalFromDir(dir);
  const owned = packages.filter(
    (entry) => entry.role === 'capability' && tierOfEntry(entry) === tier,
  );
  const entries = owned
    .map((entry) => {
      const prefix = `${entry.surface === 'backend-admin' ? 'admin' : entry.surface}.${APP_CODE}.${entry.capability}.`;
      return `  { id: '${kebabTokenOf(entry)}', routeIdPrefix: '${prefix}' },`;
    })
    .join('\n');
  return `${BANNER}
/**
 * Module registry of the \`${tier}\` core.
 *
 * The root bootstrap reads this registry to learn which capability modules exist
 * and which route id prefix each one owns.
 *
 * Section 5 forbids a core from depending on a capability package, so this module
 * holds static descriptors only: it must not import a capability to count its
 * routes, because that would create the ohpm cycle section 5 forbids. The
 * bootstrap, which is allowed to depend on both, resolves counts by calling the
 * capability package directly.
 */

export interface ${symbol}ModuleRegistration {
  readonly id: string;
  readonly routeIdPrefix: string;
}

export const ${camel(symbol)}ModuleRegistrations: ${symbol}ModuleRegistration[] = [
${entries}
];

export function list${symbol}Modules(): ${symbol}ModuleRegistration[] {
  return ${camel(symbol)}ModuleRegistrations;
}

export function has${symbol}Module(moduleId: string): boolean {
  return ${camel(symbol)}ModuleRegistrations.some(
    (entry: ${symbol}ModuleRegistration) => entry.id === moduleId,
  );
}
`;
}

export function coreSdkInventorySource(surface, tier) {
  const dir = coreDirOf(surface, tier);
  const symbol = pascalFromDir(dir);
  const sdks = tier === 'admin'
    ? ['sdkwork-iam-sdk', 'sdkwork-iam-backend-sdk', 'sdkwork-base-data-backend-sdk']
    : ['sdkwork-iam-sdk', 'sdkwork-iam-app-sdk'];
  return `${BANNER}
/**
 * SDK packages consumed by \`${dir}\`.
 *
 * Authority: \`specs/component.spec.json#contracts.sdkDependencies\`. The inventory is
 * declared rather than derived so a reviewer can see which generated SDK family
 * this tier is entitled to consume: the admin tier consumes \`/backend/v3/api\` and
 * the app and console tiers consume \`/app/v3/api\`.
 */
export const ${upperSnake(symbol)}_SDK_INVENTORY: string[] = [
${sdks.map((sdk) => `  '${sdk}',`).join('\n')}
];

export function list${symbol}SdkInventory(): string[] {
  return ${upperSnake(symbol)}_SDK_INVENTORY;
}
`;
}

export function coreHostRegistrySource(surface, tier) {
  const dir = coreDirOf(surface, tier);
  const symbol = pascalFromDir(dir);
  const capabilities = [
    'secureStorage',
    'networkStatus',
    'appLifecycle',
    'deepLinks',
    'filePicker',
    'pushNotifications',
    'clipboard',
    'deviceInfo',
  ];
  return `${BANNER}
/**
 * Host adapter capability registry of \`${dir}\`.
 *
 * Section 7: renderer and feature code route through the declared capability set;
 * a direct platform branch on a HarmonyOS global is forbidden. The registry is
 * static metadata so a feature can ask "is clipboard available on this host?"
 * during render without touching the platform.
 */
export const ${camel(symbol)}HostCapabilities: string[] = [
${capabilities.map((capability) => `  '${capability}',`).join('\n')}
];

export function has${symbol}HostCapability(capability: string): boolean {
  return ${camel(symbol)}HostCapabilities.includes(capability);
}
`;
}

export function coreHostAdapterContractsSource(surface, tier = 'app') {
  return `${BANNER}
/**
 * Host adapter contracts owned by the ${tier} core and implemented by the host package.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 7. Every tier core
 * carries this subpath because app-composition.mjs fixes CORE_EXPORT_SUBPATHS to
 * include './host'; the interfaces are tier-independent because section 7 defines
 * one adapter vocabulary for the platform and the host package implements it once.
 * Adapters expose typed methods and stable user-safe errors only; feature packages
 * depend on these interfaces and never call HarmonyOS system APIs directly, hold
 * an ability context, or handle a raw want.
 */

/** Stable, user-safe adapter failure. */
export type HostAdapterError =
  | 'unsupported'
  | 'permission-denied'
  | 'unavailable'
  | 'cancelled'
  | 'invalid-state';

/** Result of one adapter call. */
export interface HostAdapterResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: HostAdapterError;
}

export interface SecureStorageAdapter {
  get(key: string): Promise<HostAdapterResult<string>>;
  set(key: string, value: string): Promise<HostAdapterResult<void>>;
  remove(key: string): Promise<HostAdapterResult<void>>;
  clear(): Promise<HostAdapterResult<void>>;
}

export interface NetworkStatusAdapter {
  isOnline(): Promise<HostAdapterResult<boolean>>;
}

export interface AppLifecycleAdapter {
  currentState(): Promise<HostAdapterResult<string>>;
}

/**
 * Files and media picking.
 *
 * The adapter returns a local handle only; Drive storage lifecycle stays with the
 * Drive app SDK per section 7, so this contract deliberately has no upload method.
 */
export interface FilePickerAdapter {
  pickImage(): Promise<HostAdapterResult<string>>;
  pickFile(): Promise<HostAdapterResult<string>>;
}

/**
 * Deep-link or want intake.
 *
 * Section 7 requires scheme, host, path, state, nonce and expiry validation before
 * a sensitive flow completes, so the adapter reports an already-validated route id
 * rather than a raw want.
 */
export interface DeepLinkAdapter {
  currentRouteId(): Promise<HostAdapterResult<string>>;
  registerHandler(handler: (routeId: string) => void): Promise<HostAdapterResult<void>>;
}

/**
 * Push notification token facts.
 *
 * Section 7: token registration is an app-api workflow. The adapter only obtains
 * the platform token fact and the permission state.
 */
export interface PushNotificationsAdapter {
  requestPermission(): Promise<HostAdapterResult<boolean>>;
  currentToken(): Promise<HostAdapterResult<string>>;
}

export interface ClipboardAdapter {
  readText(): Promise<HostAdapterResult<string>>;
  writeText(value: string): Promise<HostAdapterResult<void>>;
}

export interface DeviceInfoAdapter {
  model(): Promise<HostAdapterResult<string>>;
  osVersion(): Promise<HostAdapterResult<string>>;
}
`;
}

export function coreSessionSource(surface, tier) {
  const dir = coreDirOf(surface, tier);
  const symbol = pascalFromDir(dir);
  return `${BANNER}
/**
 * Session and context store of \`${dir}\`.
 *
 * Authority: \`APP_SDK_INTEGRATION_SPEC.md\`. Logout, refresh failure, tenant switch
 * and account switch must clear this store together with the global token-manager
 * equivalent, secure platform storage and the realtime bridges
 * (\`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 6).
 */

export interface ${symbol}Session {
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

let currentSession: ${symbol}Session | undefined = undefined;

export function read${symbol}Session(): ${symbol}Session | undefined {
  return currentSession;
}

export function write${symbol}Session(session: ${symbol}Session | undefined): void {
  currentSession = session;
}

/**
 * Commits a session read from the IAM exchange.
 *
 * Returns the stored value so a caller can assert what it actually got rather than
 * what it hoped to send.
 */
export function commit${symbol}Session(session: ${symbol}Session): ${symbol}Session {
  currentSession = session;
  return session;
}

export function clear${symbol}Session(): void {
  currentSession = undefined;
}

export function resolve${symbol}AccessToken(
  session: ${symbol}Session | undefined,
): string | undefined {
  const value: string | undefined = session === undefined ? undefined : session.accessToken;
  const normalized: string = value === undefined ? '' : value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

export function resolve${symbol}AuthToken(
  session: ${symbol}Session | undefined,
): string | undefined {
  const value: string | undefined = session === undefined ? undefined : session.authToken;
  const normalized: string = value === undefined ? '' : value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * A session is complete only when both tokens are present.
 *
 * The dual-token contract is what makes a cold launch able to refresh: a session
 * with only an access token cannot survive its first expiry.
 */
export function is${symbol}SessionComplete(session: ${symbol}Session | undefined): boolean {
  return resolve${symbol}AccessToken(session) !== undefined
    && resolve${symbol}AuthToken(session) !== undefined;
}
`;
}

export function coreTokenManagerSource(surface) {
  // The session store names every symbol after the tier core that owns it
  // (`pascalFromDir(coreDir)`), so the manager must import those names rather than
  // a hand-written prefix. `src/main/ets/session/SessionStore.ets` is generated by
  // `coreSessionSource` from the same derivation.
  const sessionSymbol = pascalFromDir(surface.coreDir);
  return `${BANNER}
/**
 * Global token-manager equivalent.
 *
 * Section 6 requires one shared instance across the appbase app SDK, every
 * authenticated app-api SDK client and any explicit backend-admin client. A second
 * manager is how a logout clears one credential set while another stays live, so
 * this module is the only place a token is held.
 *
 * The manager stores nothing itself: it delegates to the session store so there is
 * one credential record rather than two that must agree.
 *
 * The session store sits in a sibling directory, so the specifier is
 * \`'../session/SessionStore'\` and not \`'./SessionStore'\`: the latter named a file
 * under \`sdk/\` that this generator never writes.
 */
import {
  clear${sessionSymbol}Session,
  read${sessionSymbol}Session,
  resolve${sessionSymbol}AccessToken,
  is${sessionSymbol}SessionComplete,
} from '../session/SessionStore';

/** Tokens the runtime applies to every constructed client. */
export interface IamHarmonyTokenSet {
  readonly accessToken?: string;
  readonly authToken?: string;
}

let authenticated: boolean = false;

/**
 * Marks the runtime authenticated.
 *
 * Separate from holding a token because a refresh failure leaves the manager
 * holding a token that is known to be dead; authentication state and credential
 * presence are different facts and one must not be inferred from the other.
 */
export function markIamHarmonyAuthenticated(value: boolean): void {
  authenticated = value;
}

export function isIamHarmonyAuthenticated(): boolean {
  return authenticated;
}

/** The token set the SDK clients should be configured with. */
export function currentIamHarmonyTokenSet(): IamHarmonyTokenSet {
  const session = read${sessionSymbol}Session();
  return {
    accessToken: resolve${sessionSymbol}AccessToken(session),
    authToken: session === undefined ? undefined : session.authToken,
  };
}

/** Whether a refresh can be attempted at all. */
export function canIamHarmonyRefresh(): boolean {
  return is${sessionSymbol}SessionComplete(read${sessionSymbol}Session());
}

/**
 * Clears the manager and the session store together.
 *
 * Section 6 pairs them because a caller that clears only one leaves a token the
 * next request will still send.
 */
export function clearIamHarmonyTokens(): void {
  authenticated = false;
  clear${sessionSymbol}Session();
}
`;
}

/**
 * `src/main/ets/sdk/AppSdkClient.ets` — the injected SDK port and base-URL boundary.
 */
export function coreAppSdkClientSource(surface, tier) {
  const dir = coreDirOf(surface, tier);
  const isAdmin = tier === 'admin';
  const surfaceApi = isAdmin ? 'backend' : 'app';
  const packageName = isAdmin ? 'sdkwork-iam-backend-sdk' : 'sdkwork-iam-app-sdk';
  // Credential source. Only the `app` tier ships `TokenManager.ets`; section 3
  // gives the console and admin tiers the session store and the SDK factory but not
  // the app-tier token manager, so those tiers read the session record directly.
  // Importing `./TokenManager` here would be a dangling module specifier in a tier
  // that never emits it.
  const sessionSymbol = pascalFromDir(dir);
  const credentialImport = tier === 'app'
    ? "import { currentIamHarmonyTokenSet, type IamHarmonyTokenSet } from './TokenManager';"
    : `import { read${sessionSymbol}Session, resolve${sessionSymbol}AccessToken } from '../session/SessionStore';`;
  const credentialBlock = tier === 'app'
    ? `  const tokens: IamHarmonyTokenSet = currentIamHarmonyTokenSet();
  return {
    baseUrl: assertIamHarmonyOrigin(baseUrl),
    accessToken: tokens.accessToken,
    authToken: tokens.authToken,
    platform: IAM_HARMONY_PLATFORM,
  };`
    : `  const session = read${sessionSymbol}Session();
  return {
    baseUrl: assertIamHarmonyOrigin(baseUrl),
    accessToken: resolve${sessionSymbol}AccessToken(session),
    authToken: session === undefined ? undefined : session.authToken,
    platform: IAM_HARMONY_PLATFORM,
  };`;
  return `${BANNER}
/**
 * ${isAdmin ? 'Backend-admin' : 'App'} API SDK port and factory contract of \`${dir}\`.
 *
 * Authority: \`APP_SDK_INTEGRATION_SPEC.md\` and
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 6. This tier consumes
 * \`/${surfaceApi}/v3/api\` through a generated ArkTS client adapted for the Harmony
 * runtime; this file owns the port contract, the base-URL normalization and the
 * credential boundary, while concrete transport construction stays in the root
 * bootstrap.
 *
 * PREREQUISITE: the SDK generation chain emits TypeScript, Dart, Kotlin, Swift,
 * C#, Go, Java, Python and Rust targets of \`${packageName}\`; no ArkTS target
 * exists yet (see \`sdks/README.md\`). This module therefore declares the port and
 * the adapter seam instead of vendoring a transport copy. Feature packages must
 * never fill the gap with raw request APIs or manual auth headers.
 *
 * The base URL stays an origin exactly as every other IAM client root materializes
 * it: \`ENVIRONMENT_SPEC.md\` section 5.1.4.1 assigns canonical API path prefixing
 * to the generated transport, so this module must not pre-strip or pre-append
 * \`/${surfaceApi}/v3/api\`.
 */
${credentialImport}

/** Configuration handed to the generated ${isAdmin ? 'backend' : 'app'} SDK client. */
export interface IamHarmonySdkClientConfig {
  readonly baseUrl: string;
  readonly accessToken?: string;
  readonly authToken?: string;
  readonly platform: string;
}

/**
 * Injected ${isAdmin ? 'backend-admin' : 'app-api'} surface.
 *
 * Structurally satisfied by the generated \`${packageName}\` client once an ArkTS
 * target lands; feature services depend on this port, never on the generated module.
 */
export interface IamHarmonySdkClient {
  readonly baseUrl: string;
  readonly platform: string;
}

/** HarmonyOS platform tag reported to the backend. */
export const IAM_HARMONY_PLATFORM: string = 'harmony-native';

/**
 * Validates one origin, or a semicolon-joined origin family, for SDK construction.
 *
 * Rejects rather than rewrites: a document that already carries the prefix would
 * produce \`/${surfaceApi}/v3/api/${surfaceApi}/v3/api\` at request time, and
 * silently trimming it would hide a configuration error that should be fixed at
 * its source.
 *
 * A family is accepted and returned unchanged. A cloud document declares the
 * complete registered origin family (\`ENVIRONMENT_SPEC.md\` section 5.1.0.1), and
 * that section assigns member selection to the SDK factory; collapsing it here
 * would remove the information the factory needs.
 */
export function assertIamHarmonyOrigin(origin: string): string {
  const segments: string[] = origin.trim().split(';');
  const normalized: string[] = [];
  for (const raw of segments) {
    const member: string = raw.trim().replace(/\\/+$/u, '');
    if (member.length === 0) {
      throw new Error('IAM Harmony SDK base URL is required before SDK bootstrap');
    }
    if (member.endsWith('/${surfaceApi}/v3/api')) {
      throw new Error(
        'IAM Harmony SDK base URL must be an origin without /${surfaceApi}/v3/api (ENVIRONMENT_SPEC.md section 5.1.4.1)',
      );
    }
    normalized.push(member);
  }
  return normalized.join(';');
}

/** Builds the client config, resolving credentials from this tier's credential store. */
export function createIamHarmonySdkClientConfig(baseUrl: string): IamHarmonySdkClientConfig {
${credentialBlock}
}

let client: IamHarmonySdkClient | undefined = undefined;

/**
 * Constructs the client, or reuses the registered one.
 *
 * Idempotent on purpose: the root page and the bootstrap both ask for the client,
 * and a second construction would silently drop the credentials the first one
 * installed.
 */
export function getIamHarmonySdkClient(baseUrl: string): IamHarmonySdkClient {
  const existing: IamHarmonySdkClient | undefined = client;
  if (existing !== undefined) return existing;
  const config: IamHarmonySdkClientConfig = createIamHarmonySdkClientConfig(baseUrl);
  const created: IamHarmonySdkClient = { baseUrl: config.baseUrl, platform: config.platform };
  client = created;
  return created;
}

export function resetIamHarmonySdkClient(): void {
  client = undefined;
}
`;
}

/** `src/main/ets/sdk/SdkInventory.ets` — subpath mirror of the core inventory. */
export function coreSdkSubpathSource(surface, tier) {
  return `${BANNER}
/**
 * Cross-architecture SDK inventory projection.
 *
 * Kept as a separate composition surface from \`sdk/AppSdkClient\` so composition
 * consumers can read the inventory without importing the SDK port contracts.
 */
export * from '../composition/SdkInventory';
`;
}

export function coreRuntimeEnvSource(surface) {
  return `${BANNER}
/**
 * Runtime environment access of the app core.
 *
 * Authority: \`ENVIRONMENT_SPEC.md\` sections 5.1.2 and 5.1.3. A native HarmonyOS
 * root materializes exactly one non-secret runtime document per profile under
 * \`config/app/\` and packages all of them into the HAP, so selection happens at
 * runtime and an unknown profile id fails instead of silently falling back to
 * development endpoints.
 *
 * Section 5.1.4.1 assigns canonical API path prefixing to the generated SDK
 * transport, so every origin here is bare.
 */

/** Required identity keys of one runtime document. */
export interface IamHarmonyRuntimeEnvDocument {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly application: {
    readonly publicHttpUrl: string;
    readonly publicWebsocketUrl: string;
  };
  readonly appbase: {
    readonly appApiBaseUrl: string;
    readonly loginUrl: string;
  };
  readonly platform: {
    readonly apiGatewayHttpUrl: string;
  };
}

/** A validated environment ready for SDK construction. */
export interface IamHarmonyEnvironment {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly applicationPublicHttpUrl: string;
  readonly applicationPublicWebsocketUrl: string;
  readonly appbaseAppApiBaseUrl: string;
  readonly appbaseLoginUrl: string;
  readonly platformApiGatewayHttpUrl: string;
}

/** Runtime target every document in this root must declare. */
export const IAM_HARMONY_RUNTIME_TARGET: string = 'harmony-native';

function requireNonEmpty(value: string | undefined, key: string): string {
  const normalized: string = value === undefined ? '' : value.trim();
  if (normalized.length === 0) {
    throw new Error('Harmony runtime config is missing ' + key);
  }
  return normalized;
}

const CANONICAL_API_PREFIXES: string[] = ['/app/v3/api', '/backend/v3/api'];

/**
 * Validates one origin, or a semicolon-joined origin family, and strips trailing
 * slashes.
 *
 * A \`cloud\` profile materializes the registered origin family
 * (\`ENVIRONMENT_SPEC.md\` section 5.1.0.1) because this application registers
 * sixteen base domains, so a single-origin assumption would reject every cloud
 * document in the root. The family form is accepted and preserved rather than
 * folded to its primary member: section 5.1.0.1 assigns member selection to the
 * SDK factory, and a validator that truncated here would make that impossible.
 */
export function normalizeIamHarmonyOrigin(
  value: string,
  key: string,
  schemes: string[],
): string {
  const segments: string[] = requireNonEmpty(value, key).split(';');
  const normalized: string[] = [];
  for (const raw of segments) {
    const origin: string = raw.trim().replace(/\\/+$/u, '');
    if (origin.length === 0) {
      throw new Error('Harmony runtime config ' + key + ' contains an empty origin');
    }
    const match: RegExpMatchArray | null = origin.match(/^([a-z][a-z0-9+.-]*):\\/\\/([^/\\s]+)$/u);
    if (match === null) {
      throw new Error('Harmony runtime config ' + key + ' must be an absolute origin, found ' + origin);
    }
    if (!schemes.includes(match[1].toLowerCase())) {
      throw new Error(
        'Harmony runtime config ' + key + ' must use ' + schemes.join('/') + ', found ' + match[1],
      );
    }
    for (const prefix of CANONICAL_API_PREFIXES) {
      if (origin.endsWith(prefix)) {
        throw new Error(
          'Harmony runtime config ' + key + ' must be an origin without ' + prefix
          + ' (ENVIRONMENT_SPEC.md section 5.1.4.1)',
        );
      }
    }
    normalized.push(origin);
  }
  return normalized.join(';');
}

/**
 * Validates and normalizes one runtime document.
 *
 * Identity coherence is checked here as well as by the generator: the generator
 * guards the tracked JSON, this guards whatever document bootstrap is handed at
 * runtime, and the two must not be able to disagree.
 */
export function createIamHarmonyEnvironment(
  document: IamHarmonyRuntimeEnvDocument,
): IamHarmonyEnvironment {
  const environment: string = requireNonEmpty(document.environment, 'environment');
  const deploymentProfile: string = requireNonEmpty(document.deploymentProfile, 'deploymentProfile');
  const profileId: string = requireNonEmpty(document.profileId, 'profileId');
  const runtimeTarget: string = requireNonEmpty(document.runtimeTarget, 'runtimeTarget');
  if (runtimeTarget !== IAM_HARMONY_RUNTIME_TARGET) {
    throw new Error(
      'Harmony runtime config runtimeTarget must be ' + IAM_HARMONY_RUNTIME_TARGET
      + ', found ' + runtimeTarget,
    );
  }
  const expectedProfileId: string = deploymentProfile + '.' + environment;
  if (profileId !== expectedProfileId) {
    throw new Error(
      'Harmony runtime config profileId ' + profileId + ' does not match ' + expectedProfileId,
    );
  }
  if (document.application === undefined || document.appbase === undefined
    || document.platform === undefined) {
    throw new Error('Harmony runtime config requires application, appbase and platform groups');
  }
  return {
    environment,
    deploymentProfile,
    profileId,
    runtimeTarget,
    applicationPublicHttpUrl: normalizeIamHarmonyOrigin(
      document.application.publicHttpUrl, 'application.publicHttpUrl', ['http', 'https'],
    ),
    applicationPublicWebsocketUrl: normalizeIamHarmonyOrigin(
      document.application.publicWebsocketUrl, 'application.publicWebsocketUrl', ['ws', 'wss'],
    ),
    appbaseAppApiBaseUrl: normalizeIamHarmonyOrigin(
      document.appbase.appApiBaseUrl, 'appbase.appApiBaseUrl', ['http', 'https'],
    ),
    appbaseLoginUrl: normalizeIamHarmonyOrigin(
      document.appbase.loginUrl, 'appbase.loginUrl', ['http', 'https'],
    ),
    platformApiGatewayHttpUrl: normalizeIamHarmonyOrigin(
      document.platform.apiGatewayHttpUrl, 'platform.apiGatewayHttpUrl', ['http', 'https'],
    ),
  };
}
`;
}

// ---------------------------------------------------------------------------
// root runtime documents and config examples
// ---------------------------------------------------------------------------

/**
 * One tracked runtime document.
 *
 * Shape follows `ENVIRONMENT_SPEC.md` section 5.1.2 (required identity keys plus
 * the application ingress and the platform surface this SDK inventory needs) in the
 * nested form the native HarmonyOS row of section 5.1.3 materializes. Every
 * endpoint comes from `resolveRuntimeDocuments`; this function only stamps the
 * runtime target and the non-secret binding metadata on top.
 *
 * `metadata` is written to the tracked JSON but deliberately **not** projected into
 * `generated/RuntimeConfig.ets`: `IamHarmonyRuntimeEnvDocument` declares no
 * `metadata` field, and ArkTS rejects an object literal carrying a property the
 * target type does not declare.
 */
export function harmonyRuntimeEnvDocument(surface, resolved) {
  return {
    ...resolved,
    runtimeTarget: surface.runtimeTarget,
    metadata: {
      profileBinding: 'runtime-configurable',
      applicationCode: APP_CODE,
      namespace: surface.rootName,
    },
  };
}

/**
 * `entry/src/main/ets/generated/RuntimeConfig.ets`.
 *
 * A HAP cannot read the tracked JSON at runtime, so the ten documents are projected
 * into this module and selection happens in `bootstrap/Environment.ets`. The
 * projection is literal rather than a computed import because ArkTS resolves
 * imports at build time.
 *
 * The projection is written field by field rather than by `JSON.stringify` of the
 * tracked document, because the two are not the same object: the tracked document
 * carries `metadata`, which the contract interface does not declare.
 */
export function runtimeConfigSource(surface, documents) {
  const entries = documents
    .map((document) =>
      [
        '  {',
        `    environment: ${JSON.stringify(document.environment)},`,
        `    deploymentProfile: ${JSON.stringify(document.deploymentProfile)},`,
        `    profileId: ${JSON.stringify(document.profileId)},`,
        `    runtimeTarget: ${JSON.stringify(document.runtimeTarget)},`,
        '    application: {',
        `      publicHttpUrl: ${JSON.stringify(document.application.publicHttpUrl)},`,
        `      publicWebsocketUrl: ${JSON.stringify(document.application.publicWebsocketUrl)},`,
        '    },',
        '    appbase: {',
        `      appApiBaseUrl: ${JSON.stringify(document.appbase.appApiBaseUrl)},`,
        `      loginUrl: ${JSON.stringify(document.appbase.loginUrl)},`,
        '    },',
        '    platform: {',
        `      apiGatewayHttpUrl: ${JSON.stringify(document.platform.apiGatewayHttpUrl)},`,
        '    },',
        '  },',
      ].join('\n'),
    )
    .join('\n');
  return `${BANNER}
/**
 * GENERATED FILE - DO NOT EDIT.
 *
 * Source: \`config/app/runtime-env.<profile-id>.json\`, itself derived from
 * \`etc/sdkwork.deployment.config.json\` and \`etc/topology/<profile-id>.env\`.
 * Generator: \`scripts/materialize-client-app-surfaces.mjs\`.
 *
 * \`ENVIRONMENT_SPEC.md\` section 5.1.3 requires a native HarmonyOS root to package
 * one selected non-secret runtime resource. A HAP cannot read the tracked JSON at
 * runtime, so the ten documents are projected into this module and the selection
 * happens in \`bootstrap/Environment.ets\`.
 */
import { type IamHarmonyRuntimeEnvDocument } from '../bootstrap/EnvironmentContract';

export const IAM_HARMONY_DEFAULT_PROFILE_ID: string = 'standalone.development';

/** Every tracked runtime document, ordered by profile id. */
export const IAM_HARMONY_RUNTIME_ENV_DOCUMENTS: IamHarmonyRuntimeEnvDocument[] = [
${entries}
];
`;
}

const APP_CODE_PREFIX = 'com.sdkwork';

/**
 * `config/host/harmony.<environment>.example.json`.
 *
 * Section 9: host config owns bundle id, module ids, device types, permissions,
 * app links, push/signing/distribution references and nothing else. In particular
 * section 276 forbids business route constants here, so the deep-link entries name
 * only the application's own scheme and an empty path prefix — the template's
 * `/app/communication` is an IM business route and is exactly what that rule
 * excludes.
 */
export function hostConfigExample(surface, environment) {
  return {
    environment,
    bundleName: `${APP_CODE_PREFIX}.${APP_CODE}.mobile`,
    vendor: 'SDKWork',
    moduleName: 'entry',
    deviceTypes: ['phone', 'tablet'],
    permissions: [
      'ohos.permission.INTERNET',
      'ohos.permission.GET_NETWORK_INFO',
    ],
    signingReference: '<deveco-signing-profile-name>',
    pushEnvironment: environment === 'production' ? 'production' : 'development',
    distribution: {
      appGallery: { appIdPlaceholder: '<appgallery-app-id>' },
      privateDistribution: { channelPlaceholder: '<private-distribution-channel>' },
    },
    wants: [
      {
        scheme: `sdkwork-${APP_CODE}`,
        host: 'app',
        pathPrefix: '',
      },
    ],
  };
}

/**
 * `config/server/<application-code>.<deployment-profile>.<environment>.toml.example`
 * and the matching `config/container/` template.
 *
 * Section 2 lists both directories unconditionally for a Harmony root, and the
 * template's single `sdkwork-im.development.toml.example` uses the retired
 * `<application-code>.<environment>` form. Enumerating every profile id keeps one
 * template per canonical profile, which is what the section-2 pattern names.
 */
export function operatorProfileExample(surface, kind, profileId) {
  const [deploymentProfile, environment] = profileId.split('.');
  return `# ${kind === 'server' ? 'Server' : 'Container'} profile template for the ${displayNameFor(surface, { dir: surface.rootName })} surface.
# Shared deployment authority lives at ../../../etc/sdkwork.deployment.config.json.
# This file is a safe example: it carries no credential, token or private endpoint.
[runtime]
target = "${surface.runtimeTarget}"
environment = "${environment}"
deployment_profile = "${deploymentProfile}"
profile_id = "${profileId}"
`;
}

// ---------------------------------------------------------------------------
// root documents
// ---------------------------------------------------------------------------

export function rootOhPackage(surface, packages) {
  const dependencies = {};
  for (const entry of packages) dependencies[`@sdkwork/${entry.dir}`] = `file:./packages/${entry.dir}`;
  return {
    modelVersion: '5.0.0',
    name: surface.rootName,
    version: '0.1.0',
    description: surface.description,
    main: '',
    author: 'SDKWork',
    license: 'Apache-2.0',
    dependencies,
    devDependencies: { '@ohos/hypium': '1.0.19' },
  };
}

/**
 * Entry module `oh-package.json5`.
 *
 * Regenerated rather than mirrored because the template's copy names the template
 * application's five packages; this root's entry declares all of its own.
 */
export function entryOhPackage(surface, packages) {
  const dependencies = {};
  for (const entry of packages) dependencies[`@sdkwork/${entry.dir}`] = `file:../packages/${entry.dir}`;
  return {
    name: 'entry',
    version: '0.1.0',
    description: `${displayNameFor(surface, { dir: surface.rootName })} entry and composition module`,
    main: '',
    author: 'SDKWork',
    license: 'Apache-2.0',
    dependencies,
  };
}

export function appScopeJson(surface) {
  return {
    app: {
      bundleName: `${APP_CODE_PREFIX}.${APP_CODE}.mobile`,
      vendor: 'SDKWork',
      versionCode: 1000000,
      versionName: '0.1.0',
      label: '$string:app_name',
      minAPIVersion: 12,
      targetAPIVersion: 12,
      apiReleaseType: 'Release',
    },
  };
}

export function rootBuildProfile() {
  return {
    app: {
      signingConfigs: [],
      products: [
        {
          name: 'default',
          signingConfig: 'default',
          compatibleSdkVersion: '5.0.0(12)',
          runtimeOS: 'HarmonyOS',
        },
      ],
      buildModeSet: [{ name: 'debug' }, { name: 'release' }],
    },
    modules: [
      {
        name: 'entry',
        srcPath: './entry',
        targets: [{ name: 'default', applyToProducts: ['default'] }],
      },
    ],
  };
}

/**
 * Root `package.json` — the static verification surface.
 *
 * \`check-pnpm-script-standard.mjs\` classifies a root that owns
 * \`etc/sdkwork.deployment.config.json\` as a *delegated* application surface and
 * requires \`dev\`, \`dev:standalone\`, \`dev:cloud\` and \`stop\`; the template root
 * declares none of them and fails that gate, which is why this manifest is
 * authored here instead of mirrored.
 *
 * The private hooks are split the same way \`sdkwork-iam-flutter-mobile\` splits them.
 * \`_sdkwork:build\` and \`_sdkwork:clean\` carry the real HarmonyOS toolchain commands
 * (\`hvigorw assembleHap\`, \`hvigorw clean\`), exactly as the Flutter root carries
 * \`flutter build appbundle\` and \`flutter clean\`. Declaring them is not a claim that
 * the toolchain is installed: section 317 makes DevEco Studio or a compatible SDK a
 * documented prerequisite.
 *
 * \`_sdkwork:test\` and \`_sdkwork:check\` are the toolchain-free half that this
 * machine can actually run, so neither of them lies about having produced an
 * artifact:
 *   - \`_sdkwork:test\` runs the two root contract suites (\`node --test tests/*.test.mjs\`),
 *     the same shape \`sdkwork-iam-h5\` and \`sdkwork-iam-mini-program\` use. The
 *     on-device suite is reachable as \`pnpm test:device\` (\`hvigorw test\`).
 *   - \`_sdkwork:check\` runs the two platform gates plus
 *     \`tools/check-arkts-imports.mjs\`, which resolves every import in the generated
 *     ArkTS graph against the files on disk. That script is the substitute for
 *     \`hvigorw\`-driven type checking, not a replacement for it.
 *
 * \`build:app\` exposes \`hvigorw assembleApp\` separately: a signed \`.app\` needs the
 * signing material the host config deliberately does not carry, so it must not be
 * the default \`build\`.
 */
export function rootPackageJson(surface) {
  return {
    name: `@sdkwork/${surface.rootName}`,
    private: true,
    version: '0.1.0',
    type: 'module',
    packageManager: 'pnpm@10.33.0',
    sdkwork: {
      role: 'harmony-native-app-root',
      toolchain: 'ohpm',
      note: 'This package manager owns the verification surface (gates, toolchain-free static checks); ohpm and hvigor own the application build.',
    },
    scripts: {
      dev: 'pnpm dev:standalone',
      'dev:standalone': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile standalone',
      'dev:cloud': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile cloud',
      'dev:harmony-native': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target harmony-native --deployment-profile standalone',
      'dev:harmony-native:cloud': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target harmony-native --deployment-profile cloud',
      stop: 'pnpm exec sdkwork-app stop --root ../..',
      build: 'pnpm exec sdkwork-app build',
      test: 'pnpm exec sdkwork-app test',
      check: 'pnpm exec sdkwork-app check',
      verify: 'pnpm exec sdkwork-app verify',
      clean: 'pnpm exec sdkwork-app clean',
      'test:config':
        'node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root . && node ../../../sdkwork-specs/tools/check-source-config-standard.mjs --root .',
      'check:arkts-imports': 'node ../../../sdkwork-iam/tools/check-arkts-imports.mjs --root .',
      'test:device': 'hvigorw test',
      'build:app': 'hvigorw assembleApp',
      '_sdkwork:build': 'hvigorw assembleHap',
      '_sdkwork:test': 'node --test tests/*.test.mjs',
      '_sdkwork:check': 'pnpm run test:config && pnpm run check:arkts-imports',
      '_sdkwork:verify': 'pnpm run _sdkwork:check && pnpm run _sdkwork:test',
      '_sdkwork:clean': 'hvigorw clean',
    },
    devDependencies: { '@sdkwork/app-topology': 'workspace:*' },
  };
}

export function rootComponentSpec(surface, packages) {
  const canonical = [
    { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy, route identity, and dependency direction.' },
    { file: surface.architectureSpec, purpose: 'HarmonyOS client root architecture standard.' },
    { file: surface.uiSpec, purpose: 'Harmony package UI rules.' },
    { file: 'APP_COMPOSITION_SPEC.md', purpose: 'Native-authority application composition.' },
    { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'Generated ArkTS SDK integration and token manager wiring.' },
    { file: 'I18N_SPEC.md', purpose: 'Harmony ArkTS locale fragment layout.' },
    { file: 'SOURCE_CONFIG_SPEC.md', purpose: 'Source configuration authority and component deployment descriptors.' },
    { file: 'TEST_SPEC.md', purpose: 'Contract, frontend, SDK, security, and documentation verification rules.' },
  ].map((entry) => ({ ...entry, path: `../../../../sdkwork-specs/${entry.file}` }));

  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: surface.rootName,
      displayName: displayNameFor(surface, { dir: surface.rootName }),
      version: '0.1.0',
      type: surface.componentType,
      root: `${APP_ID}/apps/${surface.rootName}`,
      domain: APP_CODE,
      declaredDomain: APP_CODE,
      capability: APP_CODE,
      status: 'standardizing',
      surface: 'app',
      languages: surface.languages,
      generated: false,
      private: true,
      manifests: [surface.manifest, 'sdkwork.app.config.json'],
    },
    canonicalSpecs: canonical,
    contracts: {
      publicExports: [],
      runtimeEntrypoints: [],
      sdkClients: [],
      events: [],
      configKeys: [],
      routeManifest: null,
      routeRegistry: `packages/${surface.coreDir}/src/main/ets/composition/RouteRegistry.ets`,
      packageCount: packages.length,
      layerRole: 'runtime-composition',
      providedPorts: [],
      requiredPorts: [],
    },
    integration: {
      authority: 'Root SDKWork specs remain authoritative. Local specs may extend but must not contradict them.',
      dependencyPolicy: 'Consumers integrate through public package exports, declared runtime entrypoints, generated SDK clients, or documented adapters only.',
      sdkPolicy: 'Generated ArkTS SDK clients are constructed by the bootstrap and injected through the tier core; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'ArkTS packages follow ohpm and hvigor while preserving the same component contract.',
      presentationPattern: 'controllers',
    },
    verification: {
      commands: [
        'ohpm install && hvigorw assembleHap && hvigorw test',
        'node ../../../sdkwork-specs/tools/check-frontend-composition.mjs --root .',
      ],
    },
  };
}

export function packageComponentSpec(surface, entry, routeIds) {
  const isCore = isCoreRole(entry);
  const permissionComposition = permissionCompositionFor(entry);
  const publicExports = isCore
    ? ['src/main/ets/Index.ets', 'src/composition/index.ets']
    : ['src/main/ets/Index.ets'];
  const providedName = entry.capability ? `${entry.dir}-surface` : `${entry.dir}-composition`;
  const canonical = [
    { file: 'COMPONENT_SPEC.md', purpose: 'Local component specs directory and manifest rules.' },
    { file: 'MODULE_SPEC.md', purpose: 'Reusable package contract and dependency direction.' },
    { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy and dependency direction.' },
    { file: surface.architectureSpec, purpose: 'HarmonyOS client root architecture standard.' },
    { file: surface.uiSpec, purpose: 'Harmony package UI rules.' },
    { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'Generated ArkTS SDK integration and token manager wiring.' },
  ].map((item) => ({ ...item, path: `../../../../../../sdkwork-specs/${item.file}` }));

  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: entry.name,
      displayName: displayNameFor(surface, entry),
      version: '0.1.0',
      type: 'arkts-package',
      root: `${APP_ID}/apps/${surface.rootName}/packages/${entry.dir}`,
      domain: APP_CODE,
      declaredDomain: APP_CODE,
      capability: entry.capability ?? entry.role,
      status: 'standardizing',
      surface: entry.surface,
      languages: surface.languages,
      generated: false,
      private: true,
      manifests: ['oh-package.json5', 'build-profile.json5'],
    },
    canonicalSpecs: canonical,
    contracts: {
      publicExports,
      runtimeEntrypoints: [],
      sdkClients: [],
      events: [],
      configKeys: [],
      routeManifest: entry.role === 'capability' ? 'src/main/ets/routes/RouteContributions.ets' : null,
      sdkDependencies: entry.sdkDependencies,
      layerRole: entry.layerRole,
      providedPorts: [{ name: providedName, export: publicExports[0] }],
      requiredPorts: [],
      ...(routeIds.length > 0 ? { routeIds } : {}),
      ...(permissionComposition === null ? {} : { permissionComposition }),
    },
    integration: {
      authority: 'Root SDKWork specs remain authoritative. Local specs may extend but must not contradict them.',
      dependencyPolicy: 'Consumers integrate through public package exports, declared runtime entrypoints, generated SDK clients, or documented adapters only.',
      sdkPolicy: 'Generated ArkTS SDK clients are constructed by the bootstrap and injected through the tier core; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'ArkTS packages follow ohpm and hvigor while preserving the same component contract.',
    },
    verification: {
      commands: ['hvigorw assembleHap && hvigorw test'],
    },
  };
}

// ---------------------------------------------------------------------------
// root entry module: manifests, resources, bootstrap, pages
// ---------------------------------------------------------------------------

/** Application label shown under the launcher icon. */
const APP_LABEL = 'SDKWork IAM';

/**
 * `entry/src/main/module.json5`.
 *
 * Identity-free by construction: the module id, the ability list and the requested
 * permissions are the same for every Harmony entry module, and the bundle/module
 * identity lives in `AppScope/app.json5` and `config/host/`. Section 276 keeps
 * business route constants out of host and platform metadata, so no route, page or
 * capability name appears here.
 */
export function entryModuleJson() {
  return {
    module: {
      name: 'entry',
      type: 'entry',
      description: '$string:module_desc',
      mainElement: 'EntryAbility',
      deviceTypes: ['phone', 'tablet'],
      deliveryWithInstall: true,
      installationFree: false,
      pages: '$profile:main_pages',
      abilities: [
        {
          name: 'EntryAbility',
          srcEntry: './ets/entryability/EntryAbility.ets',
          description: '$string:EntryAbility_desc',
          label: '$string:EntryAbility_label',
          startWindowBackground: '$color:start_window_background',
          exported: true,
          skills: [
            {
              entities: ['entity.system.home'],
              actions: ['action.system.home'],
            },
          ],
        },
      ],
      requestPermissions: [
        { name: 'ohos.permission.INTERNET' },
        { name: 'ohos.permission.GET_NETWORK_INFO' },
      ],
    },
  };
}

/** `entry/src/main/resources/base/element/string.json`. */
export function entryStringResources() {
  return {
    string: [
      { name: 'module_desc', value: `${APP_LABEL} HarmonyOS entry module` },
      { name: 'EntryAbility_desc', value: APP_LABEL },
      { name: 'EntryAbility_label', value: APP_LABEL },
    ],
  };
}

/** `entry/src/main/resources/base/element/color.json`. */
export function entryColorResources() {
  return {
    color: [{ name: 'start_window_background', value: '#FFFFFF' }],
  };
}

/** `entry/src/main/resources/base/profile/main_pages.json`. */
export function entryMainPagesProfile() {
  return { src: ['pages/Index'] };
}

/**
 * `entry/src/main/ets/bootstrap/EnvironmentContract.ets`.
 *
 * A re-export, not a second declaration. The document interface, the validated
 * environment interface and the runtime-target constant are all owned by the app
 * core, which is where the validator that consumes them lives; a copy here would be
 * a second declaration of the same shape, and the two would disagree the first time
 * a field was added to one of them.
 *
 * The module still exists because `generated/RuntimeConfig.ets` and
 * `bootstrap/Environment.ets` both need the contract, and `HARMONY_APP_MOBILE_
 * ARCHITECTURE_SPEC.md` section 5 forbids a cycle: routing both through one module
 * that imports nothing but the core keeps that graph acyclic by inspection.
 */
export function environmentContractSource(surface) {
  const coreDir = surface.coreDir;
  return `${BANNER}
/**
 * Runtime environment document contract of \`${surface.rootName}\`.
 *
 * Authority: \`ENVIRONMENT_SPEC.md\` sections 5.1.2 (required identity keys) and
 * 5.1.3 (native HarmonyOS materializes
 * \`config/app/runtime-env.<profile-id>.json\`).
 *
 * The types are re-exported from \`${coreDir}\` rather than redeclared here. The core
 * owns both the declaration and the validator, so a copy in the entry module could
 * only ever be a second source of truth for the same shape.
 *
 * This module exists anyway because \`generated/RuntimeConfig.ets\` and
 * \`bootstrap/Environment.ets\` both need the contract, and
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 5 forbids cyclic dependencies:
 * both reach the core through this module instead of each importing it directly.
 */
export {
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
} from '@sdkwork/${coreDir}';
`;
}

/**
 * `entry/src/main/ets/bootstrap/Environment.ets` — document selection.
 *
 * The entry module owns *which* document this build runs, the app core owns whether
 * a document is valid. Splitting it that way means the ten documents are validated
 * once, by the module that also typed them, instead of by a second implementation in
 * the entry module that could accept a document the core would reject.
 */
export function bootstrapEnvironmentSource(surface) {
  const coreDir = surface.coreDir;
  return `${BANNER}
/**
 * HarmonyOS runtime environment resolution.
 *
 * Authority: \`ENVIRONMENT_SPEC.md\` sections 5.1.2, 5.1.3 and 5.1.4.2. The HAP
 * packages all ten non-secret runtime documents; this module selects one and hands
 * it to the core's validator.
 *
 * Selection is by value rather than by build-time code generation: one artifact can
 * then be validated against every profile, and an unknown profile id fails loudly
 * instead of silently falling back to development endpoints in a production build.
 *
 * This module reads no file and no \`process.env\`: the ten documents are projected
 * into \`generated/RuntimeConfig.ets\`, and selection happens here.
 */
import { createIamHarmonyEnvironment } from '@sdkwork/${coreDir}';

import {
  IAM_HARMONY_DEFAULT_PROFILE_ID,
  IAM_HARMONY_RUNTIME_ENV_DOCUMENTS,
} from '../generated/RuntimeConfig';
import {
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
} from './EnvironmentContract';

export {
  IAM_HARMONY_DEFAULT_PROFILE_ID,
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
};

/** Lists the profile ids packaged into this build, in stable order. */
export function listIamHarmonyProfileIds(): string[] {
  return IAM_HARMONY_RUNTIME_ENV_DOCUMENTS.map(
    (document: IamHarmonyRuntimeEnvDocument) => document.profileId,
  );
}

/** Selects a tracked runtime document, or fails naming the packaged profiles. */
export function selectIamHarmonyRuntimeEnvDocument(
  profileId: string = IAM_HARMONY_DEFAULT_PROFILE_ID,
): IamHarmonyRuntimeEnvDocument {
  const requested: string = profileId.trim();
  if (requested.length === 0) {
    throw new Error('Harmony runtime config requires a profile id');
  }
  const found: IamHarmonyRuntimeEnvDocument | undefined = IAM_HARMONY_RUNTIME_ENV_DOCUMENTS.find(
    (document: IamHarmonyRuntimeEnvDocument) => document.profileId === requested,
  );
  if (found === undefined) {
    throw new Error(
      'Harmony runtime config has no profile ' + requested
      + '; packaged profiles: ' + listIamHarmonyProfileIds().join(', '),
    );
  }
  return found;
}

/** Selects and validates in one step. */
export function resolveIamHarmonyEnvironment(
  profileId: string = IAM_HARMONY_DEFAULT_PROFILE_ID,
): IamHarmonyEnvironment {
  return createIamHarmonyEnvironment(selectIamHarmonyRuntimeEnvDocument(profileId));
}
`;
}

/**
 * `entry/src/main/ets/bootstrap/SdkClients.ets`.
 *
 * The report is deliberately limited to facts this module can observe. It does not
 * count registered capability ports: no ArkTS target of \`sdkwork-iam-app-sdk\` or
 * \`sdkwork-iam-backend-sdk\` exists yet (see \`sdks/README.md\`), so every capability
 * port is unregistered and a count would be a constant wearing the clothes of a
 * measurement.
 */
export function bootstrapSdkClientsSource(surface) {
  const coreDir = surface.coreDir;
  return `${BANNER}
/**
 * SDK client construction for the ${APP_LABEL} HarmonyOS root.
 *
 * Authority: \`APP_SDK_INTEGRATION_SPEC.md\` and
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 6. Concrete clients are
 * constructed here and nowhere else; capability packages receive theirs through the
 * injected port each declares and must not construct one themselves.
 *
 * PREREQUISITE, stated rather than hidden: the SDK generation chain emits
 * TypeScript, Dart, Kotlin, Swift, C#, Go, Java, Python and Rust targets of
 * \`sdkwork-iam-app-sdk\` and \`sdkwork-iam-backend-sdk\`; no ArkTS target exists yet
 * (see \`sdks/README.md\`). What this module can construct today is the core's typed
 * port over the configured origin, which is what the capability services resolve.
 * Registering a real transport is a change to this file and to each
 * \`services/<Capability>SdkPort.ets\`, and nothing else.
 */
import {
  IAM_HARMONY_PLATFORM,
  getIamHarmonySdkClient,
  resetIamHarmonySdkClient,
  type IamHarmonySdkClient,
} from '@sdkwork/${coreDir}';

import { type IamHarmonyEnvironment } from './EnvironmentContract';

/**
 * SDK wiring state.
 *
 * Returned rather than logged so the root page can render it and a test can assert
 * it. "The SDK target has not landed" and "the bootstrap forgot to configure it" are
 * different defects and need different fixes; a report that conflated them would
 * make the second look like the first.
 */
export interface IamHarmonySdkWiringReport {
  readonly appClientInitialized: boolean;
  readonly baseUrl: string;
  readonly platform: string;
}

export class IamHarmonySdkClients {
  private environment: IamHarmonyEnvironment | null = null;
  private appClient: IamHarmonySdkClient | null = null;

  /**
   * Constructs the client for one environment.
   *
   * No access token is passed: bootstrap runs before login, and the core's token
   * manager is the one place a credential is read from at request time
   * (\`core/sdk/TokenManager.ets\`), so threading a token through here would create a
   * second path for a credential to reach a request.
   */
  initialize(environment: IamHarmonyEnvironment): void {
    this.appClient = getIamHarmonySdkClient(environment.appbaseAppApiBaseUrl);
    this.environment = environment;
  }

  /**
   * Rebuilds the client after a credential change.
   *
   * The environment is remembered rather than re-supplied: login happens in the
   * session route, which has no business knowing the runtime environment, and
   * re-deriving it there is how a client ends up pointed at a profile other than the
   * one bootstrap validated.
   */
  reinitialize(): void {
    const environment: IamHarmonyEnvironment | null = this.environment;
    if (environment === null) {
      throw new Error('IAM Harmony SDK clients must be initialized before a session can be applied');
    }
    this.reset();
    this.initialize(environment);
  }

  /** The app-api client, or a failure naming the missing bootstrap call. */
  appApiClient(): IamHarmonySdkClient {
    const client: IamHarmonySdkClient | null = this.appClient;
    if (client === null) {
      throw new Error('IAM app SDK client must be initialized by bootstrap before use');
    }
    return client;
  }

  describe(): IamHarmonySdkWiringReport {
    const client: IamHarmonySdkClient | null = this.appClient;
    return {
      appClientInitialized: client !== null,
      baseUrl: client === null ? '' : client.baseUrl,
      platform: IAM_HARMONY_PLATFORM,
    };
  }

  /**
   * Tears the client down.
   *
   * Logout and refresh failure must clear this together with the session store and
   * the token manager (section 6); leaving a configured base URL alive across an
   * account switch points the next session at the previous environment.
   */
  reset(): void {
    resetIamHarmonySdkClient();
    this.appClient = null;
  }
}

let sdkClients: IamHarmonySdkClients | null = null;

export function createIamHarmonySdkClients(): IamHarmonySdkClients {
  sdkClients = new IamHarmonySdkClients();
  return sdkClients;
}

export function getIamHarmonySdkClients(): IamHarmonySdkClients {
  const existing: IamHarmonySdkClients | null = sdkClients;
  return existing === null ? createIamHarmonySdkClients() : existing;
}
`;
}

/**
 * `entry/src/main/ets/bootstrap/IamRuntime.ets`.
 *
 * Delegates to the core rather than keeping its own flag: a second boolean in this
 * module would be a second source of truth for "is the user signed in", and the two
 * would drift the first time a caller updated only one.
 */
export function bootstrapIamRuntimeSource(surface) {
  const coreDir = surface.coreDir;
  const coreSymbol = pascalFromDir(coreDir);
  return `${BANNER}
/**
 * IAM runtime wiring for the ${APP_LABEL} HarmonyOS root.
 *
 * Authority: \`APP_SDK_INTEGRATION_SPEC.md\`, \`IAM_LOGIN_INTEGRATION_SPEC.md\` and
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 6. Logout and refresh failure
 * must clear the token manager, the session store and the SDK clients together;
 * clearing any one of them alone leaves a credential the next request still sends.
 *
 * The exchange of an authorization code for a session is \`sdkwork-iam-app-sdk\`'s
 * job and needs an ArkTS target that does not exist yet (see \`sdks/README.md\`).
 * What this module owns is the commit and the teardown around it, so the session
 * route never has to know which stores have to be cleared together.
 */
import {
  clear${coreSymbol}Session,
  clearIamHarmonyTokens,
  commit${coreSymbol}Session,
  is${coreSymbol}SessionComplete,
  markIamHarmonyAuthenticated,
  read${coreSymbol}Session,
  type ${coreSymbol}Session,
} from '@sdkwork/${coreDir}';

import { getIamHarmonySdkClients } from './SdkClients';

export interface IamHarmonyIamRuntime {
  isAuthenticated(): boolean;
  /** Signed-in account id, for anything that has to render who is acting. */
  currentUserId(): string | undefined;
  commitSession(session: ${coreSymbol}Session): ${coreSymbol}Session;
  clearOnLogout(): void;
}

/**
 * Reads whether a usable session is present.
 *
 * Consults the session store rather than a flag: a session can be restored from
 * secure storage before any exchange ran in this process, and reporting
 * "unauthenticated" then would bounce a signed-in user back to the login route on
 * every cold launch.
 */
function hasUsableSession(): boolean {
  return is${coreSymbol}SessionComplete(read${coreSymbol}Session());
}

export function createIamHarmonyIamRuntime(): IamHarmonyIamRuntime {
  return {
    isAuthenticated(): boolean {
      return hasUsableSession();
    },

    currentUserId(): string | undefined {
      const session: ${coreSymbol}Session | undefined = read${coreSymbol}Session();
      return session === undefined ? undefined : session.userId;
    },

    /**
     * Commits an exchanged session and rebuilds the SDK clients in one tick.
     *
     * Rebuilding here is what makes the post-login redirect unable to observe an
     * authenticated session store next to an unauthenticated SDK client.
     */
    commitSession(session: ${coreSymbol}Session): ${coreSymbol}Session {
      const committed: ${coreSymbol}Session = commit${coreSymbol}Session(session);
      markIamHarmonyAuthenticated(true);
      getIamHarmonySdkClients().reinitialize();
      return committed;
    },

    clearOnLogout(): void {
      clearIamHarmonyTokens();
      clear${coreSymbol}Session();
      markIamHarmonyAuthenticated(false);
      getIamHarmonySdkClients().reset();
    },
  };
}

let iamRuntime: IamHarmonyIamRuntime | null = null;

export function getIamHarmonyIamRuntime(): IamHarmonyIamRuntime {
  const existing: IamHarmonyIamRuntime | null = iamRuntime;
  if (existing === null) {
    iamRuntime = createIamHarmonyIamRuntime();
  }
  return iamRuntime;
}

export function resetIamHarmonyIamRuntime(): void {
  iamRuntime = null;
}
`;
}

/**
 * `entry/src/main/ets/bootstrap/HostAdapters.ets` — registration only.
 *
 * The adapters themselves live in the host package; this module is the one place the
 * bootstrap calls into it, which is what keeps a platform call from spreading into
 * feature code (\`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 7).
 */
export function bootstrapHostAdaptersSource(surface) {
  const hostDir = surface.hostDir;
  return `${BANNER}
/**
 * Host adapter registration.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 7. Feature packages
 * depend on the typed interfaces and never call HarmonyOS system APIs, a global
 * ability context, a raw want, or an SDK singleton global.
 *
 * The ability context is deliberately not a parameter. No adapter in this slice is
 * context-backed, and accepting an unused context would advertise an integration
 * that does not exist; the single call site to change when one is needed is this
 * function.
 */
import {
  IAM_HARMONY_HOST_CAPABILITIES,
  iamHarmonyHostAdapters,
  listHostAdapters,
  registerHostAdapters,
  type HostAdapterRegistration,
  type IamHarmonyHostAdapters,
} from '@sdkwork/${hostDir}';

/** Registers every adapter this host package exposes. */
export function registerIamHarmonyHostAdapters(): IamHarmonyHostAdapters {
  const entries: HostAdapterRegistration[] = IAM_HARMONY_HOST_CAPABILITIES.map(
    (name: string) => ({ name, available: false }),
  );
  registerHostAdapters(entries);
  return iamHarmonyHostAdapters;
}

/** The registered adapters, registering them on first use. */
export function getIamHarmonyHostAdapters(): IamHarmonyHostAdapters {
  if (listHostAdapters().length === 0) {
    registerIamHarmonyHostAdapters();
  }
  return iamHarmonyHostAdapters;
}

/**
 * Reports whether the device should be treated as offline.
 *
 * \`ok: false\` means the adapter cannot tell, which is **not** the same as offline.
 * Treating "cannot tell" as offline would render the offline state on every cold
 * launch, and section 11 requires that state to be meaningful rather than permanent.
 */
export async function readIamHarmonyOffline(): Promise<boolean> {
  const result = await getIamHarmonyHostAdapters().networkStatus.isOnline();
  if (!result.ok) {
    return false;
  }
  return result.value === false;
}
`;
}

/**
 * `entry/src/main/ets/bootstrap/Runtime.ets` — the composition entry.
 *
 * The only module allowed to depend on both a shell and a capability package, which
 * is what makes it the right place to assemble the route registry (section 5).
 */
export function bootstrapRuntimeSource(surface) {
  const commons = commonsDir(surface);
  const shellDir = `${surface.packageDirPrefix}shell`;
  const shellSymbol = 'IamHarmony';
  return `${BANNER}
/**
 * Root composition entry.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` sections 1 and 6. This
 * module assembles the environment, the SDK client, the IAM runtime, the host
 * adapters and the route registry. It owns no product business logic.
 *
 * It is also the one layer allowed to depend on both the shell and the capability
 * packages (section 5), which is why the route registry is assembled here rather
 * than inside the core: a core that imported a capability to count its routes would
 * create the very cycle section 5 forbids.
 */
import {
  IAM_HARMONY_DEFAULT_LOCALE,
  IAM_HARMONY_UNKNOWN_ERROR,
  resolveErrorMessage,
} from '@sdkwork/${commons}';
import { type ${shellSymbol}RouteRegistration } from '@sdkwork/${shellDir}';

import { IAM_HARMONY_DEFAULT_PROFILE_ID } from '../generated/RuntimeConfig';
import { resolveIamHarmonyEnvironment, type IamHarmonyEnvironment } from './Environment';
import { registerIamHarmonyHostAdapters } from './HostAdapters';
import { getIamHarmonyIamRuntime, type IamHarmonyIamRuntime } from './IamRuntime';
import { createIamHarmonyRoutes } from './Routes';
import {
  createIamHarmonySdkClients,
  type IamHarmonySdkClients,
  type IamHarmonySdkWiringReport,
} from './SdkClients';

export interface IamHarmonyBootstrapOptions {
  /**
   * Runtime profile to bind.
   *
   * Defaults to the root's development profile. A production build supplies its own
   * id; an unknown id fails instead of silently falling back to development
   * endpoints, which is the failure mode a fallback would produce in the field.
   */
  readonly profileId?: string;
}

export interface IamHarmonyAppRuntime {
  readonly environment: IamHarmonyEnvironment;
  readonly routes: ${shellSymbol}RouteRegistration[];
  readonly routeCount: number;
  readonly iam: IamHarmonyIamRuntime;
  readonly sdk: IamHarmonySdkClients;
  readonly sdkWiring: IamHarmonySdkWiringReport;
}

let runtime: IamHarmonyAppRuntime | null = null;
let bootstrapError: string | null = null;

/**
 * Builds the application runtime.
 *
 * Throws on a configuration defect. The caller is \`EntryAbility\`, which records the
 * message so the root page can render it; swallowing it here would produce an app
 * that launches into a blank screen with no explanation.
 */
export function bootstrapIamHarmonyApp(
  options: IamHarmonyBootstrapOptions = {},
): IamHarmonyAppRuntime {
  const profileId: string = options.profileId ?? IAM_HARMONY_DEFAULT_PROFILE_ID;
  const environment: IamHarmonyEnvironment = resolveIamHarmonyEnvironment(profileId);

  const sdk: IamHarmonySdkClients = createIamHarmonySdkClients();
  sdk.initialize(environment);

  const routes: ${shellSymbol}RouteRegistration[] = createIamHarmonyRoutes();
  registerIamHarmonyHostAdapters();

  const assembled: IamHarmonyAppRuntime = {
    environment,
    routes,
    routeCount: routes.length,
    iam: getIamHarmonyIamRuntime(),
    sdk,
    sdkWiring: sdk.describe(),
  };
  runtime = assembled;
  bootstrapError = null;
  return assembled;
}

export function getIamHarmonyAppRuntime(): IamHarmonyAppRuntime | null {
  return runtime;
}

/** Records a bootstrap failure so the root page can render it. */
export function recordIamHarmonyBootstrapFailure(error: unknown): string {
  const message: string = resolveErrorMessage(error);
  bootstrapError = message.length > 0 ? message : IAM_HARMONY_UNKNOWN_ERROR;
  return bootstrapError;
}

export function getIamHarmonyBootstrapError(): string | null {
  return bootstrapError;
}

export function resetIamHarmonyAppRuntime(): void {
  runtime = null;
  bootstrapError = null;
}

/**
 * Resolves the display locale.
 *
 * PENDING PLATFORM WIRING: the device locale comes from the HarmonyOS localization
 * kit (\`@kit.LocalizationKit\`, \`i18n.System.getSystemLanguage()\`). That call needs
 * the DevEco toolchain to compile, so it is not shipped as unverified code here;
 * until it is wired, every screen renders the default locale's fragment, which is a
 * real two-locale catalog rather than a stub.
 */
export function resolveIamHarmonyAppLocale(): string {
  return IAM_HARMONY_DEFAULT_LOCALE;
}
`;
}

/**
 * `entry/src/main/ets/bootstrap/Routes.ets` — registry assembly.
 *
 * Every tier's contributions are projected onto the app shell's registration shape:
 * the navigator belongs to the app shell, and the console and admin tiers contribute
 * into it rather than each mounting a navigator of their own. The projection is
 * written field by field instead of relying on structural assignability, because a
 * field added to one shape and not the other is exactly the drift this table exists
 * to prevent.
 */
export function bootstrapRoutesSource(surface) {
  const commons = commonsDir(surface);
  const tiers = [
    { tier: 'app', core: surface.coreDir, shell: `${surface.packageDirPrefix}shell` },
    { tier: 'console', core: surface.consoleCoreDir, shell: `${surface.packageDirPrefix}console-shell` },
    { tier: 'admin', core: surface.adminCoreDir, shell: `${surface.packageDirPrefix}admin-shell` },
  ].map((tier) => ({
    ...tier,
    shellName: tier.tier === 'app' ? 'IamHarmony' : `IamHarmony${pascalFromDir(tier.tier)}`,
  }));
  const registryImports = tiers
    .map((tier) => `import { ${camel(tier.shellName)}RouteContributions } from '@sdkwork/${tier.shell}';`)
    .join('\n');
  const validatorImports = tiers
    .map((tier) => `import { validate${tier.shellName}Registrations } from '@sdkwork/${tier.shell}';`)
    .join('\n');
  const moduleImports = tiers
    .map((tier) => `import { list${pascalFromDir(tier.core)}Modules } from '@sdkwork/${tier.core}';`)
    .join('\n');
  const spread = tiers
    .map(
      (tier) => `    .concat(${camel(tier.shellName)}RouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)))`,
    )
    .join('\n');
  const moduleLists = tiers
    .map((tier) => `list${pascalFromDir(tier.core)}Modules()`)
    .join('\n    .concat(')
    .concat(')');
  // Each tier's own shell validator runs over that tier's slice, so a defect is
  // attributed to the tier that owns it; the app shell's validator then runs over
  // the concatenation, which is the only place a cross-tier id collision shows up.
  const tierChecks = tiers
    .map((tier) => {
      const camelName = camel(tier.shellName);
      return `  const ${tier.tier}Issues: string[] = validate${tier.shellName}Registrations(
    ${camelName}RouteContributions().map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution)),
  );
  if (${tier.tier}Issues.length > 0) {
    throw new Error('Harmony ${tier.tier} route registry is invalid: ' + ${tier.tier}Issues.join('; '));
  }`;
    })
    .join('\n');
  return `${BANNER}
/**
 * Route and page registry assembly.
 *
 * Authority: \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 8 and
 * \`APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` section 7. Route ids follow
 * \`<surface>.<domain>.<capability>.<screen>\` and stay aligned with the PC, H5,
 * Flutter and mini program roots; a physical Harmony page path may differ per
 * platform.
 *
 * Validation throws instead of returning issues: a duplicate route id, or a screen
 * without a page path, means a shipped feature a user cannot reach, and a warning
 * during bootstrap is a warning nobody reads.
 */
import { type RouteContribution } from '@sdkwork/${surface.coreDir}';
${registryImports}
${validatorImports}
${moduleImports}
import {
  validateIamHarmonyRegistrations,
  type IamHarmonyRouteRegistration,
} from '@sdkwork/${tiers[0].shell}';

/** Projects one tier's contribution onto the navigator's registration shape. */
export function toIamHarmonyRouteRegistration(
  contribution: RouteContribution,
): IamHarmonyRouteRegistration {
  return {
    id: contribution.id,
    pagePath: contribution.pagePath,
    titleKey: contribution.titleKey,
    auth: contribution.auth,
    harmonyNative: contribution.harmonyNative,
  };
}

/** Assembles and validates the route registry of every tier this root ships. */
export function createIamHarmonyRoutes(): IamHarmonyRouteRegistration[] {
${tierChecks}
  const routes: IamHarmonyRouteRegistration[] = ${camel(tiers[0].shellName)}RouteContributions()
    .map((contribution: RouteContribution) => toIamHarmonyRouteRegistration(contribution))
${spread}
    ;
  const issues: string[] = validateIamHarmonyRegistrations(routes);
  if (issues.length > 0) {
    throw new Error('Harmony route registry is invalid: ' + issues.join('; '));
  }
  assertIamHarmonyModuleCoverage(routes);
  return routes;
}

/**
 * Checks every route against the tier module registries.
 *
 * A core cannot import a capability package to count its routes (section 5 forbids
 * the cycle), so it declares route-id prefixes instead. That makes this check the
 * thing that keeps the registry honest: without it, a capability could ship routes
 * under a prefix no core has ever heard of and nothing would notice.
 */
export function assertIamHarmonyModuleCoverage(
  routes: IamHarmonyRouteRegistration[],
): void {
  const modules = ${moduleLists};
  for (const route of routes) {
    const owned: boolean = modules.some(
      (entry) => route.id.startsWith(entry.routeIdPrefix),
    );
    if (!owned) {
      throw new Error(
        'Harmony route ' + route.id + ' is not owned by any registered module prefix',
      );
    }
  }
}
`;
}

/** `entry/src/main/ets/entryability/EntryAbility.ets`. */
export function entryAbilitySource(surface) {
  return `${BANNER}
import { AbilityConstant, UIAbility, Want } from '@kit.AbilityKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';

import { bootstrapIamHarmonyApp, recordIamHarmonyBootstrapFailure } from '../bootstrap/Runtime';

const DOMAIN: number = 0x0000;
const TAG: string = 'SdkworkIamEntry';

/**
 * HarmonyOS entry ability.
 *
 * This module stays thin by contract (\`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\`
 * section 1): it runs the composition bootstrap and loads the root page, nothing
 * else. Business pages live in capability packages.
 *
 * A failed bootstrap is logged and recorded rather than rethrown. Rethrowing from
 * \`onCreate\` kills the ability before any window exists, so the user sees the
 * launcher for a moment and then nothing — with no way to learn why. Recording it
 * lets the root page render the reason.
 */
export default class EntryAbility extends UIAbility {
  onCreate(want: Want, launchParam: AbilityConstant.LaunchParam): void {
    hilog.info(DOMAIN, TAG, 'onCreate');
    try {
      const runtime = bootstrapIamHarmonyApp();
      hilog.info(
        DOMAIN,
        TAG,
        'bootstrap completed for profile %{public}s with %{public}d route(s)',
        runtime.environment.profileId,
        runtime.routeCount,
      );
      hilog.info(
        DOMAIN,
        TAG,
        'sdk wiring: appClient=%{public}s platform=%{public}s',
        String(runtime.sdkWiring.appClientInitialized),
        runtime.sdkWiring.platform,
      );
    } catch (error) {
      const message: string = recordIamHarmonyBootstrapFailure(error);
      hilog.error(DOMAIN, TAG, 'bootstrap failed: %{public}s', message);
    }
  }

  onDestroy(): void {
    hilog.info(DOMAIN, TAG, 'onDestroy');
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    windowStage.loadContent('pages/Index', (err) => {
      if (err.code) {
        hilog.error(DOMAIN, TAG, 'loadContent failed: %{public}s', JSON.stringify(err));
        return;
      }
      hilog.info(DOMAIN, TAG, 'loadContent succeeded');
    });
  }

  onWindowStageDestroy(): void {
    hilog.info(DOMAIN, TAG, 'onWindowStageDestroy');
  }

  onForeground(): void {
    hilog.info(DOMAIN, TAG, 'onForeground');
  }

  onBackground(): void {
    hilog.info(DOMAIN, TAG, 'onBackground');
  }
}
`;
}

/**
 * `entry/src/main/ets/pages/__generated__/RoutePageMap.ets`.
 *
 * Section 2 names \`entry/src/main/ets/pages/__generated__/\` as the projection target
 * once route and page generation exists, which it does here: every route this root
 * ships is declared by a capability package, so the mount table is derived from the
 * same model that emits the contributions instead of being hand-maintained in the
 * root page. Section 1 keeps \`entry/\` thin — this module is a lookup, not a
 * workflow.
 */
export function routePageMapSource(surface, packages) {
  const commons = commonsDir(surface);
  const capabilityEntries = packages.filter((entry) => entry.role === 'capability');
  const imports = capabilityEntries
    .map((entry) => `import { ${pascalTokenOf(entry)}Page } from '@sdkwork/${entry.dir}';`)
    .join('\n');
  const ids = [];
  const branches = [];
  for (const entry of capabilityEntries) {
    for (const route of routesOfPackage(entry)) {
      const id = routeId(route);
      ids.push(id);
      branches.push([id, pascalTokenOf(entry)]);
    }
  }
  const conditions = branches
    .map(([id, page], index) => {
      const keyword = index === 0 ? 'if' : '} else if';
      return `      ${keyword} (this.routeId === '${id}') {\n        ${page}Page({\n          locale: this.locale,\n          offline: this.offline,\n          permissionDenied: this.permissionDenied,\n        })\n      `;
    })
    .join('');
  return `${BANNER}
/**
 * Generated route-to-page projection of this root.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 2 names
 * \`entry/src/main/ets/pages/__generated__/\` as the projection target once route and
 * page generation exists. It does: every route this root ships is declared by a
 * capability package, so this table is derived from the same model that emits those
 * contributions, and an id added there appears here without anyone editing the root
 * page.
 *
 * The page components stay in their packages. Nothing in this file renders UI of its
 * own beyond delegating, which is what section 1 means by keeping \`entry/\` thin.
 */
import { ScreenStateView } from '@sdkwork/${commons}';

${imports}

/** Route ids this projection can mount, in declaration order. */
export const IAM_HARMONY_ROUTE_PAGE_IDS: string[] = [
${ids.map((id) => `  '${id}',`).join('\n')}
];

/**
 * Mounts the page of one route id.
 *
 * An unknown id renders the shared unknown-error state rather than nothing: an empty
 * branch would present as a blank screen, and a blank screen is the one failure a
 * user cannot report.
 */
@Component
export struct IamHarmonyRoutePageMap {
  routeId: string = '';
  locale: string = 'en-US';
  offline: boolean = false;
  permissionDenied: boolean = false;

  build() {
    Column() {
      ${conditions}} else {
        ScreenStateView({
          status: 'unknown-error',
          message: '',
          retryLabel: '',
        })
      }
    }
    .width('100%')
    .height('100%')
  }
}
`;
}

/** `entry/src/main/ets/pages/Index.ets` — the navigator's mount point. */
export function entryIndexPageSource(surface) {
  const commons = commonsDir(surface);
  const shellDir = `${surface.packageDirPrefix}shell`;
  return `${BANNER}
/**
 * Root page.
 *
 * \`HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md\` section 1 keeps \`entry/\` thin: page
 * registry and composition only. This page resolves the registry bootstrap
 * validated, evaluates the shell's auth gate, and hands the result to the generated
 * route-to-page projection. It holds no business state of its own.
 */
import { IAM_HARMONY_DEFAULT_LOCALE, ScreenStateView } from '@sdkwork/${commons}';
import { resolveIamHarmonyEntryRouteId } from '@sdkwork/${shellDir}';

import { readIamHarmonyOffline } from '../bootstrap/HostAdapters';
import {
  getIamHarmonyAppRuntime,
  getIamHarmonyBootstrapError,
  resolveIamHarmonyAppLocale,
} from '../bootstrap/Runtime';
import { IamHarmonyRoutePageMap } from './__generated__/RoutePageMap';

const BOOTSTRAP_FAILED_MESSAGE: string = 'The application runtime failed to start.';

@Entry
@Component
struct Index {
  @State locale: string = IAM_HARMONY_DEFAULT_LOCALE;
  @State routeId: string = '';
  @State offline: boolean = false;
  /**
   * Route-permission denial.
   *
   * Left false in this slice: the shell decides authentication, and no permission
   * facts are resolved yet, so claiming a denial would be inventing a decision the
   * runtime never made. Every capability page already renders the state, so wiring a
   * real permission source is a change to this field alone.
   */
  @State permissionDenied: boolean = false;
  @State failureMessage: string = '';

  aboutToAppear(): void {
    const runtime = getIamHarmonyAppRuntime();
    if (runtime === null) {
      const recorded: string | null = getIamHarmonyBootstrapError();
      this.failureMessage = recorded ?? BOOTSTRAP_FAILED_MESSAGE;
      return;
    }
    this.locale = resolveIamHarmonyAppLocale();
    const entryRouteId: string | undefined = resolveIamHarmonyEntryRouteId(
      runtime.routes,
      runtime.iam.isAuthenticated(),
    );
    this.routeId = entryRouteId ?? '';
    readIamHarmonyOffline().then((offline: boolean) => {
      this.offline = offline;
    });
  }

  build() {
    Column() {
      if (this.failureMessage.length > 0) {
        ScreenStateView({
          status: 'error',
          message: this.failureMessage,
          retryLabel: '',
        })
      } else {
        IamHarmonyRoutePageMap({
          routeId: this.routeId,
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
      }
    }
    .width('100%')
    .height('100%')
  }
}
`;
}

/**
 * `entry/src/ohosTest/ets/test/Ability.test.ets` — the on-device contract test.
 *
 * Redundant with the repository-level suite on purpose: a source scan proves a value
 * is written down, this proves the built module actually produces it, and only one of
 * the two can run on the machine that generates this root.
 */
export function ohosTestSource(surface, packages) {
  const routeCount = packages
    .filter((entry) => entry.role === 'capability')
    .reduce((total, entry) => total + routesOfPackage(entry).length, 0);
  return `${BANNER}
import { describe, expect, it } from '@ohos/hypium';

import { listIamHarmonyProfileIds, resolveIamHarmonyEnvironment } from '../../../main/ets/bootstrap/Environment';
import { createIamHarmonyRoutes } from '../../../main/ets/bootstrap/Routes';
import { IAM_HARMONY_DEFAULT_PROFILE_ID } from '../../../main/ets/generated/RuntimeConfig';

/**
 * HarmonyOS on-device contract test.
 *
 * Runs under \`hvigor test\` with the HarmonyOS SDK available, which is the only
 * environment where these modules can be evaluated at all. It asserts the same
 * properties the repository-level \`node --test\` suite asserts by reading source,
 * because a source scan proves a value is written down while this proves the built
 * module actually produces it.
 *
 * The import depth is three levels up, not four: this file sits at
 * \`entry/src/ohosTest/ets/test/\`, so \`../../../main/ets\` resolves to
 * \`entry/src/main/ets\`.
 */
export default function iamHarmonyContractTest() {
  describe('SdkworkIamHarmonyContract', () => {
    it('packages all ten runtime profiles', 0, () => {
      expect(listIamHarmonyProfileIds().length).assertEqual(10);
    });

    it('resolves the default profile as harmony-native', 0, () => {
      const environment = resolveIamHarmonyEnvironment(IAM_HARMONY_DEFAULT_PROFILE_ID);
      expect(environment.runtimeTarget).assertEqual('harmony-native');
      expect(environment.profileId).assertEqual(IAM_HARMONY_DEFAULT_PROFILE_ID);
    });

    it('keeps every sdk base url free of the canonical api prefix', 0, () => {
      for (const profileId of listIamHarmonyProfileIds()) {
        const environment = resolveIamHarmonyEnvironment(profileId);
        expect(environment.appbaseAppApiBaseUrl.indexOf('/app/v3/api')).assertEqual(-1);
        expect(environment.platformApiGatewayHttpUrl.indexOf('/backend/v3/api')).assertEqual(-1);
      }
    });

    it('registers a validated route registry', 0, () => {
      const routes = createIamHarmonyRoutes();
      expect(routes.length).assertEqual(${routeCount});
    });
  });
}
`;
}


export { appManifest, deploymentIndex };
