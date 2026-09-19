/**
 * Data model for the SDKWork IAM client application roots.
 *
 * Authority:
 * - `sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` (cross-client root,
 *   package taxonomy, route identity, config alignment)
 * - `sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`
 * - `sdkwork-specs/MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md`
 * - `sdkwork-specs/HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md`
 * - `sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`
 *
 * The capability inventory below is derived from `apps/sdkwork-iam-pc/packages`
 * and from `specs/IAM_SURFACE_COMPLETENESS.yaml`; it is not invented here.
 */

export const APP_CODE = 'iam';
export const APP_ID = 'sdkwork-iam';
export const DOMAIN = 'iam';

export const ENVIRONMENTS = ['development', 'test', 'staging', 'demo', 'production'];
export const DEPLOYMENT_PROFILES = ['standalone', 'cloud'];

/** Canonical profile ids: `<deploymentProfile>.<environment>`. */
export const PROFILE_IDS = DEPLOYMENT_PROFILES.flatMap((profile) =>
  ENVIRONMENTS.map((environment) => `${profile}.${environment}`),
);

/** Environment-only alias used by build commands (`development` -> `dev`). */
export const ENVIRONMENT_ALIASES = {
  development: 'dev',
  test: 'test',
  staging: 'staging',
  demo: 'demo',
  production: 'prod',
};

/**
 * Fold a composite package token into one surface's package-name style.
 *
 * `APPLICATION_SPEC.md` names the families explicitly:
 * `sdkwork-<code>-h5-<capability>` for H5, `sdkwork_<code>_flutter_mobile_<capability>`
 * for Flutter (section 42) and `sdkwork-<code>-harmony-mobile-<capability>` for
 * Harmony (section 50). A Dart package name is lower_snake_case, so
 * `account-binding` and `user-center` cannot survive verbatim: the Flutter surface
 * folds every hyphen, which is what the authored IAM packages already do
 * (`sdkwork_iam_flutter_mobile_account_binding`). Building the name by
 * concatenation alone would have emitted `..._account-binding`, an invalid Dart
 * package directory.
 */
function foldToken(surface, token) {
  const separator = surface.tokenSeparator;
  // Throwing beats defaulting: `token.replaceAll('-', undefined)` substitutes the
  // literal text "undefined", so a surface that forgets this field would silently
  // emit `sdkwork-iam-h5-adminundefinedpermission` and every downstream path
  // would be wrong by one missing token.
  if (separator !== '-' && separator !== '_') {
    throw new Error(`surface ${surface.key} declares an unsupported tokenSeparator: ${String(separator)}`);
  }
  return separator === '-' ? token : token.replaceAll('-', separator);
}

/** Surfaces are the four client roots this generator materializes. */
export const SURFACES = [
  {
    key: 'h5',
    architecture: 'h5',
    rootName: 'sdkwork-iam-h5',
    segment: 'h5',
    dartSegment: null,
    packageDirPrefix: 'sdkwork-iam-h5-',
    packageNamePrefix: '@sdkwork/iam-h5-',
    coreDir: 'sdkwork-iam-h5-core',
    coreName: '@sdkwork/iam-h5-core',
    consoleCoreDir: 'sdkwork-iam-h5-console-core',
    consoleCoreName: '@sdkwork/iam-h5-console-core',
    adminCoreDir: 'sdkwork-iam-h5-admin-core',
    adminCoreName: '@sdkwork/iam-h5-admin-core',
    hostDir: 'sdkwork-iam-h5-capacitor',
    hostName: '@sdkwork/iam-h5-capacitor',
    hostKind: 'capacitor',
    tokenSeparator: '-',
    packageManifest: 'package.json',
    manifestPackageManager: 'pnpm',
    languages: ['typescript', 'react'],
    componentType: 'h5-app-root',
    appType: 'APP_REACT',
    description:
      'SDKWork IAM H5 mobile client for authentication, user center, account binding, and approved management surfaces.',
    versionSource: 'package.json',
    runtimeFamily: 'mobile',
    runtimeFramework: 'react-h5',
    platform: 'H5',
    runtimeTarget: 'browser',
    // Ground truth: apps/sdkwork-im-h5/config/browser/runtime-env.<profile>.json
    // plus root `.env.<profile>` files materialized by
    // `pnpm workflow:materialize-client-env`.
    runtimeEnvDir: 'config/browser',
    runtimeEnvFileBase: 'runtime-env',
    materializationFormat: 'json',
    materializationCommand: 'pnpm workflow:materialize-client-env',
    rootEnvFiles: true,
    bootDir: 'src/bootstrap',
    sourceRoot: 'src',
    manifest: 'package.json',
    published: true,
    architectureSpec: 'APP_H5_ARCHITECTURE_SPEC.md',
    uiSpec: 'APP_MOBILE_REACT_UI_SPEC.md',
    manifestUrlBase: 'sdkwork-iam-h5',
    containerImage: 'registry.sdkwork.com/apps/sdkwork-iam-h5',
    publishPlatforms: ['H5', 'WEB'],
    deliveryModes: ['WEB_URL'],
  },
  {
    key: 'mp',
    architecture: 'mini-program',
    rootName: 'sdkwork-iam-mini-program',
    segment: 'mp',
    dartSegment: null,
    packageDirPrefix: 'sdkwork-iam-mp-',
    packageNamePrefix: '@sdkwork/iam-mp-',
    coreDir: 'sdkwork-iam-mp-core',
    coreName: '@sdkwork/iam-mp-core',
    consoleCoreDir: 'sdkwork-iam-mp-console-core',
    consoleCoreName: '@sdkwork/iam-mp-console-core',
    adminCoreDir: 'sdkwork-iam-mp-admin-core',
    adminCoreName: '@sdkwork/iam-mp-admin-core',
    hostDir: 'sdkwork-iam-mp-host',
    hostName: '@sdkwork/iam-mp-host',
    hostKind: 'mp-host',
    tokenSeparator: '-',
    packageManifest: 'package.json',
    manifestPackageManager: 'pnpm',
    languages: ['typescript', 'javascript'],
    componentType: 'mini-program-app-root',
    // The `check-app-manifest-standard` APP_TYPES closure has no native mini
    // program value; `APP_UNIAPP` is the only honest member left. The reason is
    // recorded in `metadata.appTypeNote` so it is never mistaken for a claim
    // that this root is a uni-app project.
    appType: 'APP_UNIAPP',
    description:
      'SDKWork IAM WeChat mini program client for authentication, user center, account binding, and approved management surfaces.',
    appTypeNote:
      'APP_MANIFEST_SPEC PlusProjectType has no native mini program member; APP_UNIAPP is the closest closed-set value. This root is a native WeChat mini program (mp-weixin), not a uni-app project.',
    versionSource: 'package.json',
    runtimeFamily: 'mini-program',
    runtimeFramework: 'mp-weixin',
    platform: 'MP_WEIXIN',
    runtimeTarget: 'mini-program',
    // Ground truth: apps/sdkwork-im-mini-program/config/mini-program/runtime-env.<profile>.json
    runtimeEnvDir: 'config/mini-program',
    runtimeEnvFileBase: 'runtime-env',
    materializationFormat: 'mini-program-json',
    materializationCommand: 'pnpm workflow:materialize-client-env',
    rootEnvFiles: false,
    bootDir: 'src/bootstrap',
    sourceRoot: 'src',
    manifest: 'package.json',
    published: true,
    architectureSpec: 'MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md',
    uiSpec: 'APP_MINI_PROGRAM_UI_SPEC.md',
    manifestUrlBase: 'sdkwork-iam-mini-program',
    containerImage: 'registry.sdkwork.com/apps/sdkwork-iam-mini-program',
    publishPlatforms: ['MP_WEIXIN'],
    deliveryModes: ['WEB_URL'],
  },
  {
    key: 'harmony',
    architecture: 'harmony-mobile',
    rootName: 'sdkwork-iam-harmony-mobile',
    segment: 'harmony-mobile',
    dartSegment: null,
    packageDirPrefix: 'sdkwork-iam-harmony-mobile-',
    // `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 111 lets an ohpm id use
    // an approved registry scope but requires it to preserve the
    // `sdkwork-<application-code>-harmony-mobile-*` identity in package metadata.
    // The scope therefore wraps the full directory identity rather than
    // shortening it: `@sdkwork/sdkwork-iam-harmony-mobile-core`. Dropping the
    // leading `sdkwork-` inside the scope would read as `@sdkwork/iam-harmony-*`,
    // which no longer names an SDKWork Harmony package.
    packageNamePrefix: '@sdkwork/sdkwork-iam-harmony-mobile-',
    coreDir: 'sdkwork-iam-harmony-mobile-core',
    coreName: '@sdkwork/sdkwork-iam-harmony-mobile-core',
    consoleCoreDir: 'sdkwork-iam-harmony-mobile-console-core',
    consoleCoreName: '@sdkwork/sdkwork-iam-harmony-mobile-console-core',
    adminCoreDir: 'sdkwork-iam-harmony-mobile-admin-core',
    adminCoreName: '@sdkwork/sdkwork-iam-harmony-mobile-admin-core',
    hostDir: 'sdkwork-iam-harmony-mobile-host',
    hostName: '@sdkwork/sdkwork-iam-harmony-mobile-host',
    hostKind: 'harmony-host',
    regeneratedExtra: [
      // The entry module's ohpm manifest lists the template application's
      // packages; this root's entry declares all 26 of its own.
      /^entry\/oh-package\.json5$/u,
      // Operator profile templates named after the template application, in the
      // retired `<application-code>.<environment>` form. `HARMONY_APP_MOBILE_
      // ARCHITECTURE_SPEC.md` section 2 requires
      // `<application-code>.<deployment-profile>.<environment>.toml.example`.
      /^config\/container\//u,
      /^config\/server\//u,
      // Host config carries the template application's deep-link business path
      // (`/app/communication`). Section 276 forbids business route constants in
      // host config, so this root emits its own secret-free template.
      /^config\/host\//u,
    ],
    tokenSeparator: '-',
    packageManifest: 'oh-package.json5',
    manifestPackageManager: 'ohpm',
    languages: ['arkts'],
    componentType: 'harmony-mobile-app-root',
    appType: 'APP_HARMONY',
    // Native mobile store identity. `apps/sdkwork-im-harmony-mobile/sdkwork.app.config.json`
    // and `apps/sdkwork-im-flutter-mobile/sdkwork.app.config.json` both declare
    // `com.sdkwork.im.mobile` for `packageName` and `bundleId`, and the Harmony host
    // config repeats it as `bundleName`. The H5 and mini program roots declare
    // `null`, so this is a property of the native mobile architectures rather than
    // of every client root.
    bundleName: 'com.sdkwork.iam.mobile',
    description:
      'SDKWork IAM native HarmonyOS mobile client for authentication, user center, account binding, and approved management surfaces.',
    versionSource: 'oh-package.json5',
    runtimeFamily: 'mobile',
    runtimeFramework: 'harmony-native',
    platform: 'APP_HARMONY',
    runtimeTarget: 'harmony-native',
    // Ground truth: apps/sdkwork-im-harmony-mobile/config/app/runtime-env.<profile>.json.
    // `materialize-client-env.mjs` has no harmony surface format, so the documents
    // are authored/checked in and validated by a local test instead of generated.
    runtimeEnvDir: 'config/app',
    runtimeEnvFileBase: 'runtime-env',
    materializationFormat: 'json',
    materializationCommand: null,
    materializationDeferredReason:
      'sdkwork-specs/tools/materialize-client-env.mjs implements only the vite, flutter, mini-program, and none surface formats. No Harmony surface format exists yet, so this root derives its runtime documents from etc/sdkwork.deployment.config.json and etc/topology/<profile-id>.env through scripts/lib/client-app-surfaces/emit-arkts.mjs and validates them with tests/harmony-runtime-config.test.mjs. Declaring a command for the workspace materializer here would be a false signal.',
    rootEnvFiles: false,
    bootDir: 'entry/src/main/ets/bootstrap',
    sourceRoot: 'entry/src/main/ets',
    manifest: 'oh-package.json5',
    published: true,
    architectureSpec: 'HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md',
    uiSpec: 'APP_HARMONY_NATIVE_UI_SPEC.md',
    manifestUrlBase: 'sdkwork-iam-harmony-mobile',
    containerImage: 'registry.sdkwork.com/apps/sdkwork-iam-harmony-mobile',
    publishPlatforms: ['APP_HARMONY'],
    deliveryModes: ['APP_GALLERY', 'DIRECT_DOWNLOAD'],
  },
  {
    key: 'flutter',
    architecture: 'flutter-mobile',
    rootName: 'sdkwork-iam-flutter-mobile',
    segment: 'flutter_mobile',
    dartSegment: 'flutter_mobile',
    packageDirPrefix: 'sdkwork_iam_flutter_mobile_',
    packageNamePrefix: 'sdkwork_iam_flutter_mobile_',
    coreDir: 'sdkwork_iam_flutter_mobile_core',
    coreName: 'sdkwork_iam_flutter_mobile_core',
    consoleCoreDir: 'sdkwork_iam_flutter_mobile_console_core',
    consoleCoreName: 'sdkwork_iam_flutter_mobile_console_core',
    adminCoreDir: 'sdkwork_iam_flutter_mobile_admin_core',
    adminCoreName: 'sdkwork_iam_flutter_mobile_admin_core',
    // `tools/check-client-host-packages.mjs` CANONICAL_HOST['flutter-mobile']
    // is `null`: a Flutter root must not carry a host package, and a half-wired
    // `config/host/` directory is a defect rather than a partial state.
    hostDir: null,
    hostName: null,
    hostKind: null,
    // Dart package names are lower_snake_case (FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC
    // section 99), so composite tokens fold every hyphen.
    tokenSeparator: '_',
    packageManifest: 'pubspec.yaml',
    manifestPackageManager: 'flutter',
    languages: ['dart'],
    componentType: 'flutter-mobile-app-root',
    appType: 'APP_FLUTTER',
    // Same native mobile store identity as the Harmony surface; see the note there.
    bundleName: 'com.sdkwork.iam.mobile',
    description:
      'SDKWork IAM Flutter mobile client for authentication, user center, account binding, and approved management surfaces.',
    versionSource: 'pubspec.yaml',
    runtimeFamily: 'mobile',
    runtimeFramework: 'flutter',
    platform: 'APP',
    runtimeTarget: 'flutter-mobile',
    // Ground truth: apps/sdkwork-im-flutter-mobile/env/sdkwork.<profile>.json
    // materialized with the `dart-define-json` format.
    runtimeEnvDir: 'env',
    runtimeEnvFileBase: 'sdkwork',
    materializationFormat: 'dart-define-json',
    materializationCommand: 'pnpm workflow:materialize-client-env',
    rootEnvFiles: false,
    bootDir: 'lib/bootstrap',
    sourceRoot: 'lib',
    manifest: 'pubspec.yaml',
    published: true,
    architectureSpec: 'FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md',
    uiSpec: 'APP_FLUTTER_UI_SPEC.md',
    manifestUrlBase: 'sdkwork-iam-flutter-mobile',
    containerImage: 'registry.sdkwork.com/apps/sdkwork-iam-flutter-mobile',
    publishPlatforms: ['APP_IOS', 'APP_ANDROID'],
    deliveryModes: ['APP_STORE', 'DIRECT_DOWNLOAD'],
  },
];

export function surfaceByKey(key) {
  const found = SURFACES.find((surface) => surface.key === key);
  if (!found) throw new Error(`unknown surface: ${key}`);
  return found;
}

/**
 * Known-good sibling roots that own the gate-passing structural skeleton for
 * each client architecture. `apps/sdkwork-iam-*` reuses that skeleton instead of
 * re-deriving it, because the skeleton is exactly the part the SDKWork gates
 * validate (config layout, `.env` materialization wiring, deployment descriptor,
 * pnpm lifecycle scripts, platform toolchain files).
 *
 * Only structural files are mirrored. Everything that carries application
 * identity, business content, routes, SDK wiring or package inventory is
 * regenerated from this model — see `REGENERATED_PATH_PATTERNS`.
 */
export const TEMPLATE_REPO = 'sdkwork-im';
export const TEMPLATE_APPS_DIR = 'apps';

/** `surface.key` -> template root directory name in the template repository. */
export const TEMPLATE_ROOT_NAMES = {
  h5: 'sdkwork-im-h5',
  mp: 'sdkwork-im-mini-program',
  harmony: 'sdkwork-im-harmony-mobile',
  flutter: 'sdkwork-im-flutter-mobile',
};

/**
 * Paths that must never be mirrored: they are either identity-bearing
 * (`package.json`, app manifest, component spec), business content (im screens,
 * services, ports, routes), generated runtime bundles, or per-profile runtime
 * documents that this generator re-emits from the IAM model.
 *
 * Anything not matched here is considered structural skeleton and is copied with
 * identity-token substitution.
 */
export const REGENERATED_PATH_PATTERNS = [
  // The authored package family is generated from this model, never mirrored:
  // the template roots carry another application's capabilities.
  /^packages\//u,
  // identity + contracts, always re-emitted from the model
  /^package\.json$/u,
  /^sdkwork\.app\.config\.json$/u,
  /^specs\//u,
  /^etc\/sdkwork\.deployment\.config\.json$/u,
  /^(?:README|AGENTS|CLAUDE|CODEX|GEMINI)\.md$/u,
  // runtime documents (10 profiles per surface) are model-derived
  /^config\/[^/]+\/runtime-env\.[^/]+\.json$/u,
  /^env\/sdkwork\.[^/]+\.json$/u,
  /^public\/runtime-env\.json$/u,
  /^\.env\.(?:standalone|cloud)\.[^/]+$/u,
  // application sources: bootstrap, shell, routes, screens, runtime bundles
  /^src\//u,
  /^lib\//u,
  /^entry\/src\//u,
  // entry documents and build wiring that name the application
  /^index\.html$/u,
  /^vite\.config\.ts$/u,
  /^project\.config\.json$/u,
  /^project\.private\.config\.json\.example$/u,
  /^server\.ts$/u,
  /^AppScope\/app\.json5$/u,
  /^build-profile\.json5$/u,
  /^oh-package\.json5$/u,
  // template-owned verification and helper scripts reference im capabilities
  /^tests\//u,
  /^scripts\//u,
  // template-local scratch/debug files that must not travel
  /^vc-minify-test\.mjs$/u,
  // Files the emitter owns end-to-end. Mirroring them as well makes every run
  // write each file twice with different content, so a re-run reports churn
  // instead of `updated=0` and the tree passes through a wrong intermediate
  // state.
  /^\.gitignore$/u,
  /^\.sdkwork\/(?:.*\/)?README\.md$/u,
  /^etc\/README\.md$/u,
  /^docs\/README\.md$/u,
  /^sdks\/README\.md$/u,
  /^scripts\/README\.md$/u,
  /^config\/README\.md$/u,
  /^config\/host\/README\.md$/u,
  /^tsconfig\.json$/u,
  // Dart equivalents of the entries above. The template root's `pubspec.yaml`
  // and `analysis_options.yaml` describe *the template application*, and the
  // emitter re-emits both from the IAM model, so mirroring them as well made
  // every run write each file twice with different content.
  /^pubspec\.yaml$/u,
  /^analysis_options\.yaml$/u,
  // Another application's resolved dependency graph and its local path
  // overrides. `pubspec.lock` is a resolution result for a different dependency
  // set, so carrying it over would ship a lock that disagrees with this root's
  // `pubspec.yaml`; `pubspec_overrides.yaml` pins a path that only the template
  // root depends on. Both are regenerated by `flutter pub get`, never mirrored.
  /^pubspec\.lock$/u,
  /^pubspec_overrides\.yaml$/u,
  // Dart's test directory is spelled `test/`, not `tests/` above. The template's
  // tests exercise the template application's own packages, so mirroring them
  // leaves a root whose `flutter test` imports packages that do not exist here.
  /^test\//u,
];

/**
 * Paths regenerated for one surface only.
 *
 * The template roots do not agree on which files the emitter owns. A Harmony
 * template carries `config/container/*.toml.example` and
 * `config/server/*.toml.example` named after the template application in the
 * retired `<application-code>.<environment>` form, plus `config/host/harmony.*`
 * files whose `wants[].pathPrefix` names a business route of the template
 * application. File names are not covered by `IDENTITY_TOKENS` — substitution
 * rewrites content only — so mirroring them would ship
 * `sdkwork-im.development.toml.example` and an IM deep-link path into an IAM
 * root. The H5 template uses empty `.gitkeep` placeholders instead, which is
 * why these cannot become global patterns.
 *
 * @param {string} relativePath template-root-relative POSIX path
 * @param {object|null} surface surface descriptor; `null` applies the global set only
 * @returns {boolean} `true` when the path must be regenerated, not mirrored
 */
export function isRegeneratedPath(relativePath, surface = null) {
  const posix = relativePath.replaceAll('\\', '/').replace(/^\.\//u, '');
  if (REGENERATED_PATH_PATTERNS.some((pattern) => pattern.test(posix))) return true;
  return (surface?.regeneratedExtra ?? []).some((pattern) => pattern.test(posix));
}

/**
 * Identity tokens rewritten while mirroring structural files. Order matters:
 * the longest, most specific form is replaced first so a shorter token can never
 * truncate it. Bare `im` is deliberately absent — it would corrupt ordinary words
 * such as `time`, `image` or `implements`.
 *
 * The reverse-DNS prefix has to be listed twice. The dotted rule needs a
 * trailing dot to stay unambiguous, so a host field that ends the string — the
 * Windows `CompanyName` value is the bare `com.sdkwork.im` — is not reached by
 * it at all. The dedicated longer form therefore has to precede the dotted one.
 */
export const IDENTITY_TOKENS = [
  ['sdkwork-im-mini-program', 'sdkwork-iam-mini-program'],
  ['sdkwork-im-harmony-mobile', 'sdkwork-iam-harmony-mobile'],
  ['sdkwork-im-flutter-mobile', 'sdkwork-iam-flutter-mobile'],
  ['sdkwork-im-h5', 'sdkwork-iam-h5'],
  ['@sdkwork/im-', '@sdkwork/iam-'],
  ['sdkwork_im_', 'sdkwork_iam_'],
  ['SDKWORK_IM_', 'SDKWORK_IAM_'],
  ['com.sdkwork.im', 'com.sdkwork.iam'],
  ['sdkwork.im.', 'sdkwork.iam.'],
  // Display names are title-cased by the platform project templates, so the
  // all-caps rules below alone leave `Sdkwork Im Flutter Mobile` in the iOS
  // `CFBundleDisplayName`.
  ['Sdkwork Im', 'Sdkwork Iam'],
  ['Sdkwork IM', 'Sdkwork IAM'],
  ['SDKWork IM', 'SDKWork IAM'],
  // Compact and camelCase forms that the dotted, dashed and underscored rules
  // above cannot reach. The Flutter template's host config uses
  // `com.sdkwork.im.sdkworkImFlutterMobile` for the Android `applicationId` and
  // the iOS bundle id — the dotted rule rewrites the prefix but leaves
  // `sdkworkImFlutterMobile` — and its deep-link scheme is the bare `sdkworkim`.
  // Neither collides with an ordinary word.
  ['sdkworkIm', 'sdkworkIam'],
  ['sdkworkim', 'sdkworkiam'],
  ['sdkwork-im', 'sdkwork-iam'],
];

/** Apply `IDENTITY_TOKENS` to one text blob. */
export function substituteIdentityTokens(text) {
  let result = text;
  for (const [from, to] of IDENTITY_TOKENS) {
    result = result.split(from).join(to);
  }
  return result;
}

/**
 * Surface-visible route contributions. `id` follows
 * `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` §7 —
 * `<surface>.<domain>.<capability>.<screen>`.
 *
 * The screen inventory is the PC React route tree in
 * `apps/sdkwork-iam-pc/packages/**\/src/routes/*-routes.ts`; the PC root does not
 * implement §7 route identity itself, so it is the screen authority only.
 */
export const ROUTES = [
  // ---- app surface (app-api / generated app SDK) ----
  {
    surface: 'app',
    capability: 'auth',
    screen: 'login',
    path: '/auth/login',
    titleKey: 'iam.auth.login.title',
    auth: 'public',
    permissionHint: null,
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'page',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'auth',
    screen: 'register',
    path: '/auth/register',
    titleKey: 'iam.auth.register.title',
    auth: 'public',
    permissionHint: null,
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'page',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'auth',
    screen: 'forgot-password',
    path: '/auth/forgot-password',
    titleKey: 'iam.auth.forgotPassword.title',
    auth: 'public',
    permissionHint: null,
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'page',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'auth',
    screen: 'oauth-callback',
    path: '/auth/oauth/callback',
    titleKey: 'iam.auth.oauthCallback.title',
    auth: 'public',
    permissionHint: null,
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'page',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'auth',
    screen: 'context-selection',
    path: '/auth/login/context',
    titleKey: 'iam.auth.contextSelection.title',
    auth: 'required',
    permissionHint: null,
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'user-center',
    screen: 'profile',
    path: '/user/profile',
    titleKey: 'iam.userCenter.profile.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'user-center',
    screen: 'password',
    path: '/user/password',
    titleKey: 'iam.userCenter.password.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'account-binding',
    screen: 'list',
    path: '/user/account-binding',
    titleKey: 'iam.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.self',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'user',
    screen: 'list',
    path: '/user/directory',
    titleKey: 'iam.user.list.title',
    auth: 'required',
    permissionHint: 'iam.users.read',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'tenant',
    screen: 'overview',
    path: '/tenant',
    titleKey: 'iam.tenant.overview.title',
    auth: 'required',
    permissionHint: 'iam.tenants.read',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'organization',
    screen: 'directory',
    path: '/organizations',
    titleKey: 'iam.organization.directory.title',
    auth: 'required',
    permissionHint: 'iam.organizations.read',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'app',
    capability: 'oauth',
    screen: 'providers',
    path: '/oauth/providers',
    titleKey: 'iam.oauth.providers.title',
    auth: 'required',
    permissionHint: 'iam.oauth.read',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },

  // ---- console surface (app-api, user-facing management) ----
  {
    surface: 'console',
    capability: 'tenant',
    screen: 'overview',
    path: '/console/iam/tenant',
    titleKey: 'iam.console.tenant.overview.title',
    auth: 'required',
    permissionHint: 'iam.tenant_console',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'console',
    capability: 'organization',
    screen: 'directory',
    path: '/console/iam/organizations',
    titleKey: 'iam.console.organization.directory.title',
    auth: 'required',
    permissionHint: 'iam.organization_console',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'console',
    capability: 'account-binding',
    screen: 'list',
    path: '/console/iam/account-binding',
    titleKey: 'iam.console.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.account_binding_console',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'console',
    capability: 'user-center',
    screen: 'profile',
    path: '/console/iam/user',
    titleKey: 'iam.console.userCenter.profile.title',
    auth: 'required',
    permissionHint: 'iam.user_console',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },

  // ---- admin surface (backend-api / generated backend SDK, approved only) ----
  {
    surface: 'admin',
    capability: 'oauth',
    screen: 'providers',
    path: '/admin/iam/oauth',
    titleKey: 'iam.admin.oauth.providers.title',
    auth: 'required',
    permissionHint: 'iam.oauth',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'tenant',
    screen: 'list',
    path: '/admin/iam/tenants',
    titleKey: 'iam.admin.tenant.list.title',
    auth: 'required',
    permissionHint: 'iam.tenants',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'organization',
    screen: 'tree',
    path: '/admin/iam/organizations',
    titleKey: 'iam.admin.organization.tree.title',
    auth: 'required',
    permissionHint: 'iam.organizations',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'permission',
    screen: 'roles',
    path: '/admin/iam/roles',
    titleKey: 'iam.admin.permission.roles.title',
    auth: 'required',
    permissionHint: 'iam.roles',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'permission',
    screen: 'permissions',
    path: '/admin/iam/permissions',
    titleKey: 'iam.admin.permission.permissions.title',
    auth: 'required',
    permissionHint: 'iam.permissions',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'permission',
    screen: 'policies',
    path: '/admin/iam/policies',
    titleKey: 'iam.admin.permission.policies.title',
    auth: 'required',
    permissionHint: 'iam.policies',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'permission',
    screen: 'authorizations',
    path: '/admin/iam/authorizations',
    titleKey: 'iam.admin.permission.authorizations.title',
    auth: 'required',
    permissionHint: 'iam.role_bindings',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'account-binding',
    screen: 'list',
    path: '/admin/iam/account-binding',
    titleKey: 'iam.admin.accountBinding.list.title',
    auth: 'required',
    permissionHint: 'iam.account_binding',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'user',
    screen: 'list',
    path: '/admin/iam/users',
    titleKey: 'iam.admin.user.list.title',
    auth: 'required',
    permissionHint: 'iam.users',
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
  {
    surface: 'admin',
    capability: 'audit',
    screen: 'events',
    path: '/admin/iam/audit',
    titleKey: 'iam.admin.audit.events.title',
    auth: 'required',
    permissionHint: 'iam.audit_events',
    additionalPermissionHints: ['iam.security_events'],
    presentation: {
      pc: 'page',
      h5Mobile: 'stack',
      flutterMobile: 'route',
      miniProgram: 'subpackagePage',
      harmonyNative: 'page',
    },
  },
];

/** Route id for one contribution. */
export function routeId(route) {
  return `${route.surface}.${DOMAIN}.${route.capability}.${route.screen}`;
}

/**
 * Capability packages per surface family. A capability keeps one package per
 * surface (`app`, `console`, `admin`), so the same domain capability can be
 * implemented without mixing API boundaries.
 */
const APP_CAPABILITIES = ['auth', 'user-center', 'account-binding', 'user', 'tenant', 'organization', 'oauth'];
const CONSOLE_CAPABILITIES = ['tenant', 'organization', 'account-binding', 'user-center'];
const ADMIN_CAPABILITIES = [
  'oauth',
  'tenant',
  'organization',
  'permission',
  'account-binding',
  'user',
  'audit',
];

const ADMIN_SDKS = [
  {
    workspace: 'sdkwork-iam-backend-sdk',
    surface: 'backend-api',
    credentialMode: 'authenticated-backend-admin',
  },
];

const APP_SDKS = [
  {
    workspace: 'sdkwork-iam-app-sdk',
    surface: 'app-api',
    credentialMode: 'authenticated-app-api',
  },
];

/** Build the ordered package list for one client root. */
export function packagesForSurface(surface) {
  const packages = [];
  const push = (entry) => packages.push(entry);

  push({
    kind: 'infra',
    role: 'core',
    surface: 'app',
    capability: null,
    dir: surface.coreDir,
    name: surface.coreName,
    layerRole: 'frontend-core',
    sdkDependencies: APP_SDKS,
  });
  push({
    kind: 'infra',
    role: 'commons',
    surface: 'app',
    capability: null,
    dir: `${surface.packageDirPrefix}commons`,
    name: `${surface.packageNamePrefix}commons`,
    layerRole: 'frontend-commons',
    sdkDependencies: [],
  });
  push({
    kind: 'infra',
    role: 'shell',
    surface: 'app',
    capability: null,
    dir: `${surface.packageDirPrefix}shell`,
    name: `${surface.packageNamePrefix}shell`,
    layerRole: 'frontend-shell',
    sdkDependencies: [],
  });
  if (surface.hostDir) {
    push({
      kind: 'infra',
      role: 'host',
      surface: 'app',
      capability: null,
      dir: surface.hostDir,
      name: surface.hostName,
      layerRole: 'frontend-host',
      sdkDependencies: [],
    });
  }
  push({
    kind: 'infra',
    role: 'console-core',
    surface: 'console',
    capability: null,
    dir: surface.consoleCoreDir,
    name: surface.consoleCoreName,
    layerRole: 'frontend-core',
    sdkDependencies: APP_SDKS,
  });
  push({
    kind: 'infra',
    role: 'console-shell',
    surface: 'console',
    capability: null,
    dir: `${surface.packageDirPrefix}${foldToken(surface, 'console-shell')}`,
    name: `${surface.packageNamePrefix}${foldToken(surface, 'console-shell')}`,
    layerRole: 'frontend-shell',
    sdkDependencies: [],
  });
  push({
    kind: 'infra',
    role: 'admin-core',
    surface: 'backend-admin',
    capability: null,
    dir: surface.adminCoreDir,
    name: surface.adminCoreName,
    layerRole: 'frontend-core',
    sdkDependencies: ADMIN_SDKS,
  });
  push({
    kind: 'infra',
    role: 'admin-shell',
    surface: 'backend-admin',
    capability: null,
    dir: `${surface.packageDirPrefix}${foldToken(surface, 'admin-shell')}`,
    name: `${surface.packageNamePrefix}${foldToken(surface, 'admin-shell')}`,
    layerRole: 'frontend-shell',
    sdkDependencies: [],
  });

  for (const capability of APP_CAPABILITIES) {
    push({
      kind: 'capability',
      role: 'capability',
      surface: 'app',
      capability,
      dir: `${surface.packageDirPrefix}${foldToken(surface, capability)}`,
      name: `${surface.packageNamePrefix}${foldToken(surface, capability)}`,
      layerRole: 'frontend-feature',
      sdkDependencies: APP_SDKS,
    });
  }
  for (const capability of CONSOLE_CAPABILITIES) {
    push({
      kind: 'capability',
      role: 'capability',
      surface: 'console',
      capability,
      dir: `${surface.packageDirPrefix}${foldToken(surface, `console-${capability}`)}`,
      name: `${surface.packageNamePrefix}${foldToken(surface, `console-${capability}`)}`,
      layerRole: 'frontend-feature',
      sdkDependencies: APP_SDKS,
    });
  }
  for (const capability of ADMIN_CAPABILITIES) {
    push({
      kind: 'capability',
      role: 'capability',
      surface: 'backend-admin',
      capability,
      dir: `${surface.packageDirPrefix}${foldToken(surface, `admin-${capability}`)}`,
      name: `${surface.packageNamePrefix}${foldToken(surface, `admin-${capability}`)}`,
      layerRole: 'frontend-feature',
      sdkDependencies: ADMIN_SDKS,
    });
  }

  return packages;
}

/** Routes owned by one package. */
export function routesOfPackage(entry) {
  return ROUTES.filter((route) => {
    if (entry.role !== 'capability') return false;
    if (route.capability !== entry.capability) return false;
    if (route.surface === 'app') return entry.surface === 'app';
    if (route.surface === 'console') return entry.surface === 'console';
    return entry.surface === 'backend-admin';
  });
}

/**
 * Package-surface token -> route-surface token.
 *
 * Package taxonomy names the operator family `backend-admin` (§4), while route
 * identity names its surface `admin` (§7). The two vocabularies are both
 * normative, so the mapping lives in one place.
 */
export const ROUTE_SURFACE_BY_PACKAGE_SURFACE = {
  app: 'app',
  console: 'console',
  'backend-admin': 'admin',
};

/** Route tier for one package surface. */
export function routeSurfaceOf(packageSurface) {
  const found = ROUTE_SURFACE_BY_PACKAGE_SURFACE[packageSurface];
  if (!found) throw new Error(`unknown package surface: ${packageSurface}`);
  return found;
}

/** Route tiers in registry order. */
export const ROUTE_TIERS = ['app', 'console', 'admin'];

/** Routes for one route tier. */
export function routesOfTier(tier) {
  return ROUTES.filter((route) => route.surface === tier);
}

/**
 * Permission module catalogs every IAM client root inherits.
 *
 * Authority: `APP_PERMISSION_COMPOSITION_SPEC.md` section 4. Both IAM HTTP SDK families
 * (`sdkwork-iam-app-sdk` on `app-api` and `sdkwork-iam-backend-sdk` on `backend-api`)
 * resolve to the same owning module — the IAM kernel — so a single reference satisfies
 * section 4's "each HTTP `contracts.sdkDependencies[]` entry MUST have a matching
 * `moduleCatalogRefs[]` entry with `inheritPermissions = true`" for every tier.
 *
 * `manifestRef` is relative to the directory that owns `specs/component.spec.json`, which is
 * the tier core at `apps/<root>/packages/<core>/`, so four `..` segments reach the repository
 * root on every client architecture. Section 4 names the wrong guesses explicitly: the nested
 * `specs/` directory, the application root and the repository root all resolve it to the wrong
 * file, so the path is not recomputed per platform.
 */
export const IAM_PERMISSION_MODULES = [
  {
    moduleId: 'iam-kernel',
    manifestRef: '../../../../iam/modules/iam-kernel/iam.module.manifest.json',
    inheritPermissions: true,
    inheritRoles: false,
  },
];

/**
 * `contracts.permissionComposition` of one package, or `null` when it needs none.
 *
 * Section 4 requires the section only from a root whose core declares HTTP
 * `sdkDependencies`, so `commons`, `shell` and the capability packages get `null`: an empty
 * `moduleCatalogRefs` there would claim an inheritance that does not exist.
 */
export function permissionCompositionFor(entry) {
  if (entry.sdkDependencies.length === 0) return null;
  return {
    inheritanceMode: 'module-catalog-with-overrides',
    applicationModule: { manifestRef: IAM_PERMISSION_MODULES[0].manifestRef },
    moduleCatalogRefs: IAM_PERMISSION_MODULES.map((module) => ({ ...module })),
    bootstrapAccessTokenScope: {
      inheritFrom: 'sdkwork.app.config.json#backend.accessTokenPermissionScope',
      supplement: [],
      overrideReplace: false,
    },
    routePermissionHints: {
      inheritFromOpenApi: true,
      inheritFromModuleManifests: true,
      overrides: [],
    },
    consumerPolicy: {
      forbidLocalPermissionCatalogForDependencyDomains: true,
      allowExplicitOverridesOnly: true,
      allowFrontendHintsWithoutServerDuplication: true,
    },
  };
}

export const IAM_SDK_PACKAGES = {
  app: '@sdkwork/iam-app-sdk',
  backend: '@sdkwork/iam-backend-sdk',
  open: '@sdkwork/iam-open-sdk',
};
