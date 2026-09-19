/**
 * Emitters for the Flutter/Dart client root (`sdkwork-iam-flutter-mobile`).
 *
 * Shape authority:
 * - `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 2 (root layout), section 3
 *   (package taxonomy), section 4 (package internal shape), section 6 (SDK/IAM
 *   integration), section 8 (route alignment), section 9 (config), section 10
 *   (commands).
 * - `APP_FLUTTER_UI_SPEC.md` — package-local UI rules.
 * - `APPLICATION_SPEC.md` sections 42-43 — the `sdkwork_<code>_flutter_mobile_*`,
 *   `..._console_*` and `..._admin_*` family names.
 * - `apps/sdkwork-iam-flutter-mobile/packages/**` — the four packages that
 *   already exist in this root are the concrete authored baseline: pure Dart
 *   libraries (`sdk: '>=3.0.0 <4.0.0'`, `dev_dependencies: lints, test`), a
 *   `lib/<package>.dart` public boundary, `lib/src/**` internals and `test/**`.
 *   Core packages keep that pure-Dart style, because section 3 gives cores no
 *   screens or widgets; every other package is a Flutter package and declares the
 *   Flutter SDK.
 * - The generated Dart SDK families: `sdkwork_iam_app_sdk` publishes
 *   `SdkworkAppClient` and `sdkwork_iam_backend_sdk` publishes
 *   `SdkworkBackendClient`, both constructed through `.withBaseUrl(...)`.
 *
 * Language-neutral JSON payloads (`appManifest`, `deploymentIndex`,
 * `runtimeEnvDocument`) are imported from `emit-ts.mjs`, which owns them for the
 * first emitter. They are parameterised entirely by the surface descriptor, so
 * the same builders serve every client root.
 */

import { APP_ID, PROFILE_IDS, permissionCompositionFor, routeId, routesOfPackage, routesOfTier } from './model.mjs';
import { GENERATED_BANNER, toPosix } from './emit-common.mjs';
import { appManifest, deploymentIndex, displayNameFor, runtimeEnvDocument } from './emit-ts.mjs';

const BANNER = GENERATED_BANNER.replace('<!-- ', '// ').replace(' -->', '');

/** Dart package names of the generated SDK families this root consumes. */
const APP_SDK_PACKAGE = 'sdkwork_iam_app_sdk';
const BACKEND_SDK_PACKAGE = 'sdkwork_iam_backend_sdk';

/** Client class each generated Dart SDK family publishes. */
const APP_SDK_CLIENT = 'SdkworkAppClient';
const BACKEND_SDK_CLIENT = 'SdkworkBackendClient';

/**
 * `pubspec.yaml` path dependencies to the generated Dart SDK families.
 *
 * Relative to a package directory (`apps/<root>/packages/<package>/`): four ups
 * reach the repository root. The generated SDK layout is fixed by
 * `SDK_WORKSPACE_GENERATION_SPEC.md` — every family keeps its Dart output under
 * `<family>/<family>-dart/generated/server-openapi`.
 */
const APP_SDK_PATH = '../../../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-dart/generated/server-openapi';
const BACKEND_SDK_PATH = '../../../../sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-dart/generated/server-openapi';

/** Same two families, as seen from the application root (`apps/<root>/`). */
const ROOT_APP_SDK_PATH = '../../sdks/sdkwork-iam-app-sdk/sdkwork-iam-app-sdk-dart/generated/server-openapi';
const ROOT_BACKEND_SDK_PATH = '../../sdks/sdkwork-iam-backend-sdk/sdkwork-iam-backend-sdk-dart/generated/server-openapi';

const PUBLIC_DOC_LINE = 'Owner: `sdkwork-iam` maintainers.';

// ---------------------------------------------------------------------------
// naming
// ---------------------------------------------------------------------------

/** `sdkwork_iam_flutter_mobile_auth` -> `IamFlutterMobileAuth`. */
function pascalFromDir(dir) {
  return dir
    .replace(/^sdkwork_/u, '')
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join('');
}

function camel(value) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

/**
 * The capability/role token as it appears in Dart file names.
 *
 * `account-binding` -> `account_binding` for the app family, `console_account_binding`
 * for the console family and `admin_account_binding` for the admin family. The
 * console/admin infix is part of the token because section 3 gives those two
 * families their own cores, so an unprefixed `account_binding_controller.dart`
 * would be ambiguous once both tiers ship the same capability.
 */
function tokenOf(entry) {
  if (entry.role !== 'capability') return entry.role.replaceAll('-', '_');
  const base = entry.capability.replaceAll('-', '_');
  if (entry.surface === 'console') return `console_${base}`;
  if (entry.surface === 'backend-admin') return `admin_${base}`;
  return base;
}

function coreDirOf(surface, tier) {
  if (tier === 'app') return surface.coreDir;
  if (tier === 'console') return surface.consoleCoreDir;
  return surface.adminCoreDir;
}

function tierOfEntry(entry) {
  if (entry.role === 'console-core' || entry.role === 'console-shell' || entry.surface === 'console') return 'console';
  if (entry.role === 'admin-core' || entry.role === 'admin-shell' || entry.surface === 'backend-admin') return 'admin';
  return 'app';
}

/** A core package has no screens and no widgets, so it stays pure Dart. */
function isCoreRole(entry) {
  return entry.role === 'core' || entry.role === 'console-core' || entry.role === 'admin-core';
}

function usesFlutterSdk(entry) {
  return !isCoreRole(entry);
}

function commonsDir(surface) {
  return `${surface.packageDirPrefix}commons`;
}

// ---------------------------------------------------------------------------
// package manifests
// ---------------------------------------------------------------------------

function pathDependency(entry) {
  return `  ${entry.dir}:\n    path: ../${entry.dir}`;
}

/**
 * Direct dependencies of one package, following section 5's allowed flow.
 *
 * `core` and `commons` sit at the bottom; the tier cores depend on them; the tier
 * shells depend on their own tier core, `commons`, and the tier's capability
 * packages they compose; capability packages depend on their tier core plus
 * `commons`.
 *
 * The `shell -> capability` edge is the load-bearing one. Section 5 says "shell
 * packages compose route contributions and layout" and forbids `core` and `commons`
 * from depending on capability packages, so the composition cannot live lower down.
 * It is acyclic because section 5's list of what a capability may depend on — core
 * public contracts, `commons`, generated SDK ports, appbase wrappers, approved shared
 * contracts, local host adapter contracts — does not include the shell, and no emitter
 * here produces that edge.
 */
function dependenciesOf(surface, entry, packages = []) {
  const core = { dir: surface.coreDir };
  const consoleCore = { dir: surface.consoleCoreDir };
  const adminCore = { dir: surface.adminCoreDir };
  const commons = { dir: commonsDir(surface) };

  if (entry.role === 'core' || entry.role === 'commons') return [];
  if (entry.role === 'console-core' || entry.role === 'admin-core') return [core, commons];
  if (entry.role === 'shell') return [core, commons, ...tierCapabilityDependencies('app', packages)];
  if (entry.role === 'console-shell') return [consoleCore, commons, ...tierCapabilityDependencies('console', packages)];
  if (entry.role === 'admin-shell') return [adminCore, commons, ...tierCapabilityDependencies('admin', packages)];
  if (entry.surface === 'console') return [consoleCore, commons];
  if (entry.surface === 'backend-admin') return [adminCore, commons];
  return [core, commons];
}

/**
 * Capability packages of one tier, as dependency records.
 *
 * The records are `{ dir }` objects like every other branch of `dependenciesOf`
 * returns, because `pathDependency` reads `entry.dir` — handing it bare directory
 * strings emits `undefined: path: ../undefined` into the pubspec, which is invisible
 * until Dart tooling tries to resolve the path.
 *
 * The tier argument uses `tierOfEntry`'s vocabulary (`app` | `console` | `admin`) and
 * not `entry.surface`'s (`app` | `console` | `backend-admin`). Mixing the two is how
 * the admin tier's capabilities once dropped silently out of both the shell's declared
 * dependencies and its composition.
 */
function tierCapabilityDependencies(tier, packages) {
  return tierCapabilityEntries(tier, packages).map((entry) => ({ dir: entry.dir }));
}

/** Capability packages of one tier, in canonical package order. */
function tierCapabilityEntries(tier, packages) {
  return packages.filter((entry) => entry.role === 'capability' && tierOfEntry(entry) === tier);
}

/** Package directory of one tier's shell, resolved from the package list. */
function shellRoleOf(tier) {
  return tier === 'app' ? 'shell' : `${tier}-shell`;
}

/**
 * The tier's shell package.
 *
 * Resolved through the package list rather than by pasting the tier onto the prefix:
 * the Dart family joins segments with `_` (`sdkwork_iam_flutter_mobile_console_shell`)
 * while the ArkTS family uses `-`, so string concatenation would name a package that
 * does not exist on one of the two platforms.
 */
function shellEntryOf(packages, tier) {
  const shell = packages.find((entry) => entry.role === shellRoleOf(tier));
  if (shell === undefined) throw new Error(`no shell package registered for tier ${tier}`);
  return shell;
}

/**
 * Generated Dart SDK path dependencies owned by one package.
 *
 * Section 6 concentrates construction in the runtime/bootstrap and forbids feature
 * packages from building clients. Only the application root therefore declares the
 * generated SDK families, which is also what makes the rule checkable: a capability
 * package that *could* `import 'package:sdkwork_iam_app_sdk/...'` would be able to
 * bypass the injected client.
 */
function sdkDependenciesOf(entry) {
  return [];
}

/** Dart SDK constraint of a pure-Dart core package. */
const DART_SDK_CONSTRAINT = "  sdk: '>=3.0.0 <4.0.0'";

function packagePubspec(surface, entry, packages = []) {
  const usesFlutter = usesFlutterSdk(entry);
  const dependencies = dependenciesOf(surface, entry, packages).map(pathDependency);
  const body = [
    `name: ${entry.dir}`,
    `description: ${packageDescription(surface, entry)}`,
    'version: 0.1.0',
    'publish_to: none',
    '',
    'environment:',
    usesFlutter ? "  sdk: '>=3.5.0 <4.0.0'" : DART_SDK_CONSTRAINT,
  ];
  if (usesFlutter) body.push("  flutter: '>=3.24.0'");
  body.push('');
  body.push('dependencies:');
  if (usesFlutter) body.push('  flutter:\n    sdk: flutter');
  if (usesFlutter && entry.role === 'capability') {
    body.push('  flutter_localizations:\n    sdk: flutter');
    body.push('  intl: any');
  }
  body.push(...dependencies, ...sdkDependenciesOf(entry));
  body.push('');
  body.push('dev_dependencies:');
  if (usesFlutter) body.push('  flutter_test:\n    sdk: flutter');
  else body.push('  test: ^1.24.0');
  body.push('  lints: ^3.0.0');
  body.push('');
  if (usesFlutter) {
    body.push('flutter:');
    body.push('  uses-material-design: true');
    if (entry.role === 'capability') {
      const token = tokenOf(entry);
      // The locale fragments live under the layout I18N_SPEC.md mandates, which
      // `flutter gen-l10n` cannot span (it takes one `arb-dir`), so the fragments
      // are bundled as assets and read through the commons bundle loader instead.
      body.push('  assets:');
      body.push(`    - lib/src/i18n/en-US/iam/${token}/`);
      body.push(`    - lib/src/i18n/zh-CN/iam/${token}/`);
    }
    body.push('');
  }
  return body.join('\n');
}

function analysisOptions(usesFlutter) {
  return `include: package:${usesFlutter ? 'flutter_lints/flutter.yaml' : 'lints/recommended.yaml'}\n`;
}

/**
 * `config/app/runtime-env.<environment>.example.json` — the checked-in source
 * template of a runtime document.
 *
 * `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` section 100 gives `config/app/` the
 * non-secret runtime templates the Flutter bootstrap consumes, section 255
 * requires those to be safe checked-in templates, and section 316 has a static
 * check assert the directory exists. `env/sdkwork.<profile>.json` is the
 * materialized document a build reads through `--dart-define-from-file`; this file
 * is the template it is derived from, so the two share a key set and differ only in
 * their values.
 */
function configAppExample(surface, environment) {
  const origin = 'http://127.0.0.1:18089';
  return {
    SDKWORK_ENVIRONMENT: environment,
    SDKWORK_DEPLOYMENT_PROFILE: 'standalone',
    SDKWORK_PROFILE_ID: `standalone.${environment}`,
    SDKWORK_RUNTIME_TARGET: surface.runtimeTarget,
    SDKWORK_APP_ID: 'sdkwork-iam',
    SDKWORK_API_BASE_URL: origin,
    SDKWORK_APP_API_BASE_URL: origin,
    SDKWORK_OPEN_API_BASE_URL: origin,
    SDKWORK_IAM_ISSUER: origin,
    SDKWORK_FEATURE_APP_SURFACE: true,
    SDKWORK_FEATURE_CONSOLE_SURFACE: true,
    SDKWORK_FEATURE_ADMIN_SURFACE: true,
  };
}

// ---------------------------------------------------------------------------
// pubspec merge
// ---------------------------------------------------------------------------

/**
 * Split a pubspec document into its top-level blocks.
 *
 * Deliberately not a YAML parser: this repository has no YAML dependency, and a
 * hand-rolled parser that guesses at anchors, flow collections or multi-line
 * scalars would corrupt a manifest the first time one appeared. Only the shapes
 * pubspecs actually use here are understood — a top-level `key:` opening a block
 * of more-indented lines. Every other line is carried along inside the block it
 * already belongs to, so an unfamiliar construct survives verbatim instead of
 * being reinterpreted.
 */
function splitPubspecBlocks(text) {
  const preamble = [];
  const blocks = [];
  let current = null;
  for (const line of text.replace(/\r\n/gu, '\n').split('\n')) {
    const topLevel = /^([A-Za-z_][A-Za-z0-9_-]*):/u.exec(line);
    if (topLevel) {
      current = { key: topLevel[1], lines: [line] };
      blocks.push(current);
      continue;
    }
    if (current) current.lines.push(line);
    else preamble.push(line);
  }
  for (const block of blocks) trimTrailingBlanks(block.lines);
  trimTrailingBlanks(preamble);
  return { preamble, blocks };
}

function trimTrailingBlanks(lines) {
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
}

/** Nested `key:` entries of a block, each spanning until the next one. */
function pubspecChildren(block) {
  const children = [];
  let current = null;
  for (const line of block.lines.slice(1)) {
    const child = /^ {2}([A-Za-z_][A-Za-z0-9_-]*):/u.exec(line);
    if (child) {
      current = { key: child[1], lines: [line] };
      children.push(current);
      continue;
    }
    if (current) current.lines.push(line);
  }
  for (const entry of children) trimTrailingBlanks(entry.lines);
  return children;
}

/** Authored children first, then every generated child the authored file lacks. */
function unionPubspecChildren(authoredBlock, generatedBlock) {
  const authored = authoredBlock ? pubspecChildren(authoredBlock) : [];
  const generated = generatedBlock ? pubspecChildren(generatedBlock) : [];
  const lines = [];
  const seen = new Set();
  for (const child of authored) {
    seen.add(child.key);
    lines.push(...child.lines);
  }
  for (const child of generated) {
    if (seen.has(child.key)) continue;
    seen.add(child.key);
    lines.push(...child.lines);
  }
  return lines;
}

/**
 * Union an authored pubspec with the generated one.
 *
 * Used only for the packages that predate the generator. The authored document
 * stays authoritative for identity and prose — `name`, `description`, `version`,
 * `publish_to` — and for every dependency it already declares, because its
 * `dev_dependencies` decide which test runner the authored tests already import.
 * The generated document wins for `environment`, where the toolchain constraint
 * is the generator's call: an authored `sdk: '>=3.0.0 <4.0.0'` cannot be relied on
 * once the package imports Flutter, and pub would happily resolve it to a Dart
 * that the required Flutter release does not support.
 *
 * Anything the generated document declares that the authored one does not (the
 * `flutter:` section, `flutter_test`, a missing path dependency) is appended, so
 * the union is a superset of both and no authored decision is dropped.
 *
 * @param {string} authoredText
 * @param {string} generatedText
 * @returns {string}
 */
export function mergePubspecText(authoredText, generatedText) {
  const authored = splitPubspecBlocks(authoredText);
  const generated = splitPubspecBlocks(generatedText);
  const generatedByKey = new Map(generated.blocks.map((block) => [block.key, block]));

  const UNIONED = new Set(['dependencies', 'dev_dependencies']);
  const GENERATED_WINS = new Set(['environment']);

  const sections = [authored.preamble];
  const emitted = new Set();

  for (const block of authored.blocks) {
    emitted.add(block.key);
    const replacement = generatedByKey.get(block.key);
    if (UNIONED.has(block.key)) {
      const children = unionPubspecChildren(block, replacement);
      if (children.length > 0) sections.push([`${block.key}:`, ...children]);
      continue;
    }
    if (GENERATED_WINS.has(block.key) && replacement) {
      sections.push(replacement.lines);
      continue;
    }
    sections.push(block.lines);
  }

  for (const block of generated.blocks) {
    if (emitted.has(block.key)) continue;
    if (UNIONED.has(block.key)) {
      const children = unionPubspecChildren(null, block);
      if (children.length > 0) sections.push([`${block.key}:`, ...children]);
      continue;
    }
    sections.push(block.lines);
  }

  const rendered = sections.filter((section) => section.length > 0);
  return `${rendered.map((section) => section.join('\n')).join('\n\n')}\n`;
}

// ---------------------------------------------------------------------------
// package sources
// ---------------------------------------------------------------------------

function packageDescription(surface, entry) {
  if (entry.role === 'capability') return `${displayNameFor(surface, entry)} capability.`;
  return `${displayNameFor(surface, entry)} — ${entry.layerRole.replace(/^frontend-/u, '')} boundary.`;
}

/** Files the public boundary re-exports. */
function entryExports(entry) {
  if (entry.role === 'core') {
    return [
      'composition/composition.dart',
      'src/sdk/sdk_client_factory.dart',
      'src/session/token_manager.dart',
      'src/session/session_store.dart',
      'src/runtime/runtime_env.dart',
      'src/host/host_adapter.dart',
    ];
  }
  if (entry.role === 'console-core' || entry.role === 'admin-core') {
    return [
      'composition/composition.dart',
      'src/sdk/sdk_client_factory.dart',
      'src/session/session_store.dart',
    ];
  }
  if (entry.role === 'commons') {
    return [
      'src/theme/design_tokens.dart',
      'src/l10n/arb_bundle.dart',
      'src/widgets/sdkwork_scaffold.dart',
      'src/widgets/sdkwork_error_view.dart',
      'src/widgets/sdkwork_loading_view.dart',
    ];
  }
  if (entry.role === 'shell' || entry.role === 'console-shell' || entry.role === 'admin-shell') {
    return [
      'composition/route_composition.dart',
      'src/shell/app_shell.dart',
      'src/shell/router.dart',
    ];
  }
  const token = tokenOf(entry);
  return [
    'src/routes/route_manifest.dart',
    `src/controllers/${token}_controller.dart`,
    `src/services/${token}_service.dart`,
    `src/state/${token}_state.dart`,
    `src/models/${token}_view_model.dart`,
    `src/screens/${token}_screen.dart`,
    'src/i18n/manifest.dart',
  ];
}

/** `lib/<package>.dart` — the public export boundary (section 4). */
function entrySource(surface, entry) {
  const lines = [`library ${entry.dir};`, ''];
  for (const relative of entryExports(entry)) lines.push(`export '${relative}';`);
  lines.push('');
  return lines.join('\n');
}

/**
 * Static route identity registry of one tier (sections 4 and 7).
 *
 * Owner: `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 4 gives the route
 * registry to the tier's core package, and section 7 fixes the id shape as
 * `<surface>.<domain>.<capability>.<screen>`.
 *
 * The registry carries the identities inline and imports nothing, which is exactly
 * what its H5 (`packages/sdkwork-iam-h5-core/src/modules/index.ts`) and mini program
 * counterparts do. Aggregating the tier's capability packages here would be
 * `core -> capability -> core`; aggregating them in the tier shell instead would be
 * `shell -> capability`, the reverse of section 5's `core, commons -> shell ->
 * capabilities`. Both close a cycle the spec forbids, so the aggregation happens
 * nowhere and each capability package derives its own slice from this registry.
 */
function coreRouteRegistrySource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const tierRoutes = routesOfTier(tier);
  const entries = tierRoutes
    .map((route) =>
      [
        '  RouteContribution(',
        `    id: '${routeId(route)}',`,
        `    surface: '${route.surface}',`,
        `    capability: '${route.capability}',`,
        `    screen: '${route.screen}',`,
        `    path: '${route.path}',`,
        `    titleKey: '${route.titleKey}',`,
        `    auth: RouteAuth.${route.auth},`,
        `    presentation: '${route.presentation.flutterMobile}',`,
        route.permissionHint ? `    permissionHint: '${route.permissionHint}',` : null,
        route.additionalPermissionHints
          ? `    additionalPermissionHints: <String>[${route.additionalPermissionHints.map((hint) => `'${hint}'`).join(', ')}],`
          : null,
        '  ),',
      ]
        .filter((line) => line !== null)
        .join('\n'),
    )
    .join('\n');

  const tierTitle = tier === 'app' ? 'application' : tier;

  return `${BANNER}
/**
 * Canonical IAM route identity registry of the \`${tier}\` tier (${tierTitle} surface).
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 4 (the route registry
 * belongs to the tier's core package) and section 7 (route identity). \`id\` follows
 * \`<surface>.<domain>.<capability>.<screen>\` and is identical across every IAM
 * client root and every tier; only \`presentation\` is platform-specific.
 *
 * This registry holds the ${tierRoutes.length} \`${tier}\`-surface route(s) and imports no
 * other package. Section 5 orders the flow \`core, commons -> shell -> capabilities
 * -> entry -> host\`, so a registry that pulled in the capability packages would be
 * an upward edge and a cycle. Capability packages instead derive their own slice
 * through the helpers below, and the root bootstrap reads the registry directly.
 */

/// Authentication mode of a route contribution.
enum RouteAuth { public, required }

/// One route of this tier, keyed by its cross-client route id.
class RouteContribution {
  const RouteContribution({
    required this.id,
    required this.surface,
    required this.capability,
    required this.screen,
    required this.path,
    required this.titleKey,
    required this.auth,
    required this.presentation,
    this.permissionHint,
    this.additionalPermissionHints = const <String>[],
  });

  /// Cross-client route id, identical in every IAM client root.
  final String id;

  /// Route surface tier: \`app\`, \`console\` or \`admin\`.
  final String surface;

  /// Domain capability token.
  final String capability;

  /// Screen token within the capability.
  final String screen;

  /// Physical path for this platform. Physical paths may differ per platform.
  final String path;

  /// Locale key of the screen title.
  final String titleKey;

  /// Whether the route requires an authenticated session.
  final RouteAuth auth;

  /// Flutter presentation pattern (section 8).
  final String presentation;

  /// Primary permission hint, when the route is permission-gated.
  final String? permissionHint;

  /// Additional permission hints the route accepts.
  final List<String> additionalPermissionHints;
}

/// Every route of the \`${tier}\` surface, in canonical order.
const List<RouteContribution> ${camel(pascal)}RouteContributions = <RouteContribution>[
${entries}
];

/// Route ids of the \`${tier}\` surface, in registry order.
List<String> ${camel(pascal)}RouteIds() {
  return ${camel(pascal)}RouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}

/// Finds one route by its cross-client route id.
RouteContribution? find${pascal}Route(String id) {
  for (final RouteContribution contribution in ${camel(pascal)}RouteContributions) {
    if (contribution.id == id) return contribution;
  }
  return null;
}

/// Routes of one capability token, for that capability's own route manifest.
List<RouteContribution> ${camel(pascal)}RoutesByCapability(String capability) {
  return ${camel(pascal)}RouteContributions
      .where((RouteContribution contribution) => contribution.capability == capability)
      .toList(growable: false);
}
`;
}

/**
 * Route manifest of one capability package.
 *
 * The package exposes a *slice* of its tier core's registry rather than a second
 * copy of the route identities. Section 4 gives the registry to the core, and
 * section 5 leaves `capability -> core` as the only direction open to a capability,
 * so deriving is both the legal edge and the one that stops a route id from existing
 * twice in the root.
 */
function routeManifestSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  const core = coreDirOf(surface, tierOfEntry(entry));
  const corePascal = pascalFromDir(core);
  return `${BANNER}
/**
 * Route manifest of \`${entry.dir}\`.
 *
 * Owner: APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7. The identities live in
 * \`${core}\`, which
 * owns the \`${tierOfEntry(entry)}\` tier registry; this file only narrows them to the
 * \`${entry.capability}\` capability so the screens, the shell and the root bootstrap
 * still share one source of truth.
 */

import 'package:${core}/${core}.dart';

/// Routes of the \`${entry.capability}\` capability, taken from the tier registry.
final List<RouteContribution> ${camel(pascal)}RouteContributions =
    ${camel(corePascal)}RoutesByCapability('${entry.capability}');

/// Route ids \`${entry.dir}\` owns, in registry order.
List<String> ${camel(pascal)}RouteIds() {
  return ${camel(pascal)}RouteContributions
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
`;
}

function viewModelSource(surface, entry, routes) {
  const pascal = pascalFromDir(entry.dir);
  const routes_ = routes
    .map(
      (route) =>
        `  /// Route id of \`${route.path}\`.\n` +
        `  static const String ${camel(pascalFromDir(route.screen))}RouteId = '${routeId(route)}';`,
    )
    .join('\n\n');
  return `${BANNER}
/**
 * View models and route parameters of \`${entry.dir}\`.
 *
 * Section 4 gives this directory view models and route params only; API DTOs come
 * from the generated Dart SDK.
 */

/// Route identity owned by this package, for typed navigation calls.
class ${pascal}Routes {
  const ${pascal}Routes._();

${routes_}
}

/// Presentation state of the \`${tokenOf(entry)}\` capability.
class ${pascal}ViewModel {
  const ${pascal}ViewModel({
    required this.titleKey,
    this.loading = false,
    this.errorKey,
  });

  /// Locale key of the screen title.
  final String titleKey;

  /// True while the capability is fetching.
  final bool loading;

  /// Locale key of the last user-safe failure, or null after a success.
  final String? errorKey;
}
`;
}

function stateSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  return `${BANNER}
/**
 * Immutable presentation state of \`${entry.dir}\`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

/// State of the \`${tokenOf(entry)}\` capability.
class ${pascal}State {
  const ${pascal}State({
    this.loading = false,
    this.errorKey,
    this.items = const <String>[],
  });

  /// True while a request is in flight.
  final bool loading;

  /// Locale key of the last user-safe failure, or null.
  final String? errorKey;

  /// Identifiers of the records currently displayed.
  final List<String> items;

  /// Returns a copy with the named fields replaced.
  ${pascal}State copyWith({
    bool? loading,
    String? errorKey,
    List<String>? items,
  }) {
    return ${pascal}State(
      loading: loading ?? this.loading,
      errorKey: errorKey ?? this.errorKey,
      items: items ?? this.items,
    );
  }
}
`;
}

function serviceSource(surface, entry, routes) {
  const pascal = pascalFromDir(entry.dir);
  const apiPath = entry.surface === 'backend-admin' ? 'backend' : 'app';
  const routeLines = routes.map((route) => `  '${routeId(route)}': '${route.path}',`).join('\n');
  return `${BANNER}
/**
 * Use-case orchestration of \`${entry.dir}\`.
 *
 * Section 6: this package consumes \`/${apiPath}/v3/api\` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 */

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> ${camel(pascal)}RoutePaths = <String, String>{
${routeLines}
};

/// Validation and error mapping of the \`${tokenOf(entry)}\` capability.
class ${pascal}Service {
  const ${pascal}Service();

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in ${camel(pascal)}RoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }
}
`;
}

function controllerSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  const token = tokenOf(entry);
  return `${BANNER}
/**
 * Presentation logic of \`${entry.dir}\`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/${token}_service.dart';
import '../state/${token}_state.dart';

/// Presentation controller of the \`${token}\` capability.
class ${pascal}Controller {
  ${pascal}Controller({${pascal}Service? service})
      : _service = service ?? const ${pascal}Service();

  final ${pascal}Service _service;
  final List<void Function(${pascal}State)> _listeners = <void Function(${pascal}State)>[];

  ${pascal}State _state = const ${pascal}State();

  /// Current state.
  ${pascal}State get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(${pascal}State) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(${pascal}State next) {
    _state = next;
    for (final void Function(${pascal}State) listener
        in List<void Function(${pascal}State)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Replaces the displayed records.
  void setItems(List<String> items) {
    _emit(_state.copyWith(items: items, loading: false, errorKey: null));
  }

  /// Marks the capability as loading.
  void setLoading() {
    _emit(_state.copyWith(loading: true, errorKey: null));
  }

  /// Records a user-safe failure.
  void setError(String errorKey) {
    _emit(_state.copyWith(loading: false, errorKey: errorKey));
  }

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
`;
}

function screenSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  const token = tokenOf(entry);
  const commons = commonsDir(surface);
  const titleKey = routesOfPackage(entry)[0]?.titleKey ?? `iam.${entry.capability ?? entry.role}.title`;
  return `${BANNER}
/**
 * Route-level UI of the \`${token}\` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:${commons}/${commons}.dart';

import '../controllers/${token}_controller.dart';
import '../state/${token}_state.dart';

/// Entry screen of the \`${token}\` capability.
class ${pascal}Screen extends StatefulWidget {
  const ${pascal}Screen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = '${titleKey}';

  @override
  State<${pascal}Screen> createState() => _${pascal}ScreenState();
}

class _${pascal}ScreenState extends State<${pascal}Screen> {
  final ${pascal}Controller _controller = ${pascal}Controller();

  late final void Function() _unsubscribe;
  late ${pascal}State _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_state.errorKey != null) {
      return SdkworkScaffold(
        titleKey: ${pascal}Screen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: ${pascal}Screen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: ${pascal}Screen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
`;
}

function widgetSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  return `${BANNER}
/**
 * Reusable widget of the \`${entry.dir}\` capability.
 *
 * A domain-specific widget lives inside its capability package; domain-neutral
 * widgets live in \`${commonsDir(surface)}\` (section 3).
 */

import 'package:flutter/material.dart';

/// Compact summary card for one \`${tokenOf(entry)}\` record.
class ${pascal}SummaryCard extends StatelessWidget {
  const ${pascal}SummaryCard({super.key, required this.title, required this.subtitle});

  /// Primary line.
  final String title;

  /// Supporting line.
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
      ),
    );
  }
}
`;
}

/**
 * A package-local locale fragment in Flutter's `.arb` format.
 *
 * `I18N_SPEC.md` and section 4 require
 * `lib/src/i18n/<locale>/<domain>/<capability>/<fragment>`, and
 * `check-i18n-standard.mjs` accepts `.arb` (and `.json`) for that layout.
 */
function i18nFragment(surface, entry, locale) {
  const token = tokenOf(entry);
  const label = displayNameFor(surface, entry);
  const english = locale === 'en-US';
  const messages = {
    title: label,
    subtitle: english ? `${label} workspace` : `${label} 工作区`,
    loading: english ? 'Loading…' : '加载中…',
    empty: english ? 'Nothing to show yet.' : '暂无内容。',
    loadError: english ? 'Unable to load this view.' : '无法加载此视图。',
    retry: english ? 'Retry' : '重试',
  };
  const descriptions = {
    title: 'Title of the capability screen.',
    subtitle: 'Supporting line under the title.',
    loading: 'Shown while the capability loads its first page.',
    empty: 'Empty state shown when the capability has no records.',
    loadError: 'User-safe error shown when loading fails.',
    retry: 'Label of the retry action.',
  };
  const payload = { '@@locale': english ? 'en' : 'zh' };
  for (const key of Object.keys(messages)) {
    payload[key] = messages[key];
    payload[`@${key}`] = { description: descriptions[key] };
  }
  void token;
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Thin locale aggregation of one package.
 *
 * Carries no message copy: the fragments own the copy, this file only names the
 * locales and the fragment directory each one reads.
 */
/**
 * `lib/src/i18n/manifest.dart` — the thin locale boundary of a capability package.
 *
 * Named `manifest.dart` because that is the Flutter/Dart row of `I18N_SPEC.md`:
 * `lib/src/i18n/<locale>/<domain>/<capability>/<fragment>.arb`, plus an optional
 * thin `lib/src/i18n/manifest.dart`. Section 171 allows such a file to export,
 * register, type, test or import fragments and forbids it from becoming the
 * place feature copy is authored, which is exactly the split here: the `.arb`
 * fragments own every string, this file names the locales and the asset path
 * each one is read from.
 */
function i18nManifestSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  const token = tokenOf(entry);
  return `${BANNER}
/**
 * Package-local locale boundary of \`${entry.dir}\`.
 *
 * Thin by construction (I18N_SPEC.md section 171): the \`.arb\` fragments under
 * \`en-US/iam/${token}/\` and \`zh-CN/iam/${token}/\` own the copy, this file
 * only names the locales and the asset path each one is read from.
 */

/// Locales this package ships fragments for.
const List<String> ${camel(pascal)}SupportedLocales = <String>['en-US', 'zh-CN'];

/// Asset path of the fragment bundle of one locale.
///
/// The fragments are bundled assets rather than \`gen-l10n\` input, because
/// \`arb-dir\` cannot span the \`<locale>/<domain>/<capability>\` layout.
String ${camel(pascal)}FragmentAssetPath(String locale) =>
    'lib/src/i18n/$locale/iam/${token}/${token}.arb';
`;
}

// ---------------------------------------------------------------------------
// composition sources (tier cores)
// ---------------------------------------------------------------------------

function coreCompositionSource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  return `${BANNER}
/**
 * Composition entry of the \`${tier}\` tier (section 3, APP_COMPOSITION_SPEC.md).
 *
 * Every tier owns its own core, so this file re-exports only its own tier's
 * composition parts and no tier has to depend on another.
 */

export 'dependency_manifest.dart';
export 'host_registry.dart';
export 'module_registry.dart';
export 'route_registry.dart';
export 'sdk_inventory.dart';

/// Component spec path of the owning application root.
const String ${camel(pascal)}ComponentSpecPath = '../../../../specs/component.spec.json';
`;
}


function coreDependencyManifestSource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const workspace = `sdkwork-iam-${tier === 'admin' ? 'backend' : 'app'}-sdk`;
  const sdkSurface = tier === 'admin' ? 'backend-api' : 'app-api';
  const credentialMode = tier === 'admin' ? 'authenticated-backend-admin' : 'authenticated-app-api';
  return `${BANNER}
/**
 * Declared dependency surface of the \`${tier}\` tier core.
 *
 * Mirrors \`specs/component.spec.json\` \`contracts.sdkDependencies\` so the runtime
 * and the contract cannot disagree about which generated Dart SDK family this tier
 * consumes.
 */

/// One generated SDK family consumed by this tier.
class SdkDependency {
  const SdkDependency({
    required this.workspace,
    required this.surface,
    required this.credentialMode,
  });

  /// Workspace directory name of the generated family.
  final String workspace;

  /// API surface the family serves.
  final String surface;

  /// Credential mode every authenticated call of this tier uses.
  final String credentialMode;
}

/// SDK families the \`${tier}\` tier consumes.
const List<SdkDependency> ${camel(pascal)}SdkDependencies = <SdkDependency>[
  SdkDependency(
    workspace: '${workspace}',
    surface: '${sdkSurface}',
    credentialMode: '${credentialMode}',
  ),
];
`;
}

function coreModuleRegistrySource(surface, tier, packages) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const tierPackages = packages.filter(
    (entry) => entry.role === 'capability' && tierOfEntry(entry) === tier,
  );
  const modules = tierPackages
    .map((entry) => {
      const ids = routesOfPackage(entry).map(routeId);
      return (
        '  ModuleDescriptor(\n' +
        `    id: '${entry.dir}',\n` +
        `    capability: '${entry.capability}',\n` +
        `    routeIds: <String>[${ids.map((id) => `'${id}'`).join(', ')}],\n` +
        '  ),'
      );
    })
    .join('\n');
  return `${BANNER}
/**
 * Module registry of the \`${tier}\` tier.
 *
 * One descriptor per capability package, so the root shell can assemble navigation
 * without importing every package directly — which is what keeps the root \`lib/\`
 * thin (section 2).
 */

/// One capability package of this tier and the routes it owns.
class ModuleDescriptor {
  const ModuleDescriptor({
    required this.id,
    required this.capability,
    required this.routeIds,
  });

  /// Package directory name.
  final String id;

  /// Domain capability token.
  final String capability;

  /// Cross-client route ids this package contributes.
  final List<String> routeIds;
}

/// Capability packages of the \`${tier}\` surface.
const List<ModuleDescriptor> ${camel(pascal)}Modules = <ModuleDescriptor>[
${modules}
];
`;
}

function coreSdkInventorySource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const workspace = `sdkwork-iam-${tier === 'admin' ? 'backend' : 'app'}-sdk`;
  const clientClass = tier === 'admin' ? BACKEND_SDK_CLIENT : APP_SDK_CLIENT;
  const sdkSurface = tier === 'admin' ? 'backend-api' : 'app-api';
  return `${BANNER}
/**
 * Generated Dart SDK inventory of the \`${tier}\` tier.
 *
 * Section 6: the bootstrap constructs the clients named here from the resolved
 * runtime configuration and injects them; this file is the declaration the
 * bootstrap is checked against.
 */

/// One generated SDK client class this tier expects to be injected.
class SdkClientDescriptor {
  const SdkClientDescriptor({
    required this.sdkPackage,
    required this.clientClass,
    required this.surface,
  });

  /// Dart package name of the generated family.
  final String sdkPackage;

  /// Client class the family publishes.
  final String clientClass;

  /// API surface the client serves.
  final String surface;
}

/// SDK clients the \`${tier}\` tier consumes.
const List<SdkClientDescriptor> ${camel(pascal)}SdkClients = <SdkClientDescriptor>[
  SdkClientDescriptor(
    sdkPackage: '${tier === 'admin' ? BACKEND_SDK_PACKAGE : APP_SDK_PACKAGE}',
    clientClass: '${clientClass}',
    surface: '${sdkSurface}',
  ),
];
`;
}

function coreSdkFactorySource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const appCore = surface.coreDir;
  const runtimeImport = tier === 'app'
    ? "import '../runtime/runtime_env.dart';"
    : `import 'package:${appCore}/${appCore}.dart';`;
  const tokenManagerImport = tier === 'app'
    ? "import '../session/token_manager.dart';"
    : `import 'package:${appCore}/${appCore}.dart';`;
  const clientClass = tier === 'admin' ? BACKEND_SDK_CLIENT : APP_SDK_CLIENT;
  return `${BANNER}
/**
 * SDK factory contract of the \`${tier}\` tier (section 3: the core owns SDK
 * factories, not business workflows).
 *
 * The concrete clients are constructed by the runtime/bootstrap, which is where
 * section 6 puts construction; this contract is what the bootstrap implements and
 * what feature packages are typed against, so a capability package can receive a
 * client without ever naming the generated SDK family.
 */

${runtimeImport}
${tokenManagerImport}

/// Builds one generated SDK client for this tier.
abstract class ${pascal}SdkClientFactory<TClient> {
  /// Builds a client bound to the resolved runtime configuration and the root's
  /// single token manager.
  TClient create({
    required SdkworkRuntimeEnv env,
    required SdkworkTokenManager tokenManager,
  });

  /// Client class the injected implementation must return.
  String get clientClass => '${clientClass}';
}
`;
}

function coreTokenManagerSource(surface) {
  return `${BANNER}
/**
 * The root's global token-manager equivalent (section 6).
 *
 * One instance is shared by every authenticated app-api client and the explicit
 * backend-admin client, so a refresh in one tier cannot leave another tier holding
 * a stale token.
 */

/// Single access/refresh token owner of the application root.
class SdkworkTokenManager {
  SdkworkTokenManager({String? accessToken, String? refreshToken})
      : _accessToken = accessToken,
        _refreshToken = refreshToken;

  String? _accessToken;
  String? _refreshToken;

  final List<void Function(String?)> _listeners = <void Function(String?)>[];

  /// Current access token, or null when the session was cleared.
  String? get currentAccessToken => _accessToken;

  /// Current refresh token, or null.
  String? get currentRefreshToken => _refreshToken;

  /// Replaces the credential pair after a successful login or refresh.
  void setTokens({String? accessToken, String? refreshToken}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    for (final void Function(String?) listener in List<void Function(String?)>.of(_listeners)) {
      listener(_accessToken);
    }
  }

  /// Clears every credential.
  ///
  /// Section 6: logout and refresh failure must clear the token manager, the
  /// context store and the sensitive session state together.
  void clear() {
    setTokens();
  }

  /// Notifies the listener whenever the access token changes.
  void Function() addListener(void Function(String?) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }
}
`;
}

function coreSessionSource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  return `${BANNER}
/**
 * Session and context store of the \`${tier}\` tier.
 *
 * Section 6: logout and refresh failure must clear the token manager, this context
 * store and the sensitive session state together.
 */

/// Authenticated session context.
class ${pascal}SessionContext {
  const ${pascal}SessionContext({
    this.userId,
    this.tenantId,
    this.organizationId,
    this.accessToken,
    this.refreshToken,
  });

  /// Authenticated user id.
  final String? userId;

  /// Active tenant id.
  final String? tenantId;

  /// Active organization id.
  final String? organizationId;

  /// Access token of this session, mirrored from the token manager.
  final String? accessToken;

  /// Refresh token of this session, mirrored from the token manager.
  final String? refreshToken;

  /// True when every field a signed-in session needs is present.
  bool get isComplete => userId != null && accessToken != null;
}

/// In-memory context store of the \`${tier}\` tier.
class ${pascal}ContextStore {
  ${pascal}SessionContext? _context;

  /// Current context, or null when signed out.
  ${pascal}SessionContext? get current => _context;

  /// Replaces the current context.
  void set(${pascal}SessionContext context) {
    _context = context;
  }

  /// Clears the current context.
  void clear() {
    _context = null;
  }
}
`;
}

function coreRuntimeEnvSource(surface) {
  return `${BANNER}
/**
 * Runtime configuration boundary of the application root.
 *
 * Section 9: the Flutter root reads non-secret runtime configuration from
 * \`env/sdkwork.<deploymentProfile>.<environment>.json\` through
 * \`--dart-define-from-file\`, so these arrive as compile-time constants and no
 * endpoint is hard-coded here.
 */

/// Non-secret runtime configuration of the application root.
class SdkworkRuntimeEnv {
  const SdkworkRuntimeEnv({
    required this.environment,
    required this.deploymentProfile,
    required this.profileId,
    required this.runtimeTarget,
    required this.appId,
    required this.apiBaseUrl,
    required this.appApiBaseUrl,
    required this.openApiBaseUrl,
    required this.iamIssuer,
  });

  /// Lifecycle environment (\`development\`, \`test\`, ...).
  final String environment;

  /// Deployment profile (\`standalone\` or \`cloud\`).
  final String deploymentProfile;

  /// Canonical profile id, \`<deploymentProfile>.<environment>\`.
  final String profileId;

  /// Runtime target of this build (\`flutter-android\`, \`flutter-ios\`, ...).
  final String runtimeTarget;

  /// Application id.
  final String appId;

  /// Platform API origin.
  final String apiBaseUrl;

  /// Application API origin.
  final String appApiBaseUrl;

  /// Open API origin.
  final String openApiBaseUrl;

  /// IAM issuer of this deployment profile.
  final String iamIssuer;

  /// True when this build targets a locally owned standalone gateway.
  bool get isStandalone => deploymentProfile == 'standalone';
}

/// Resolves runtime configuration from the dart-define environment.
SdkworkRuntimeEnv resolveSdkworkRuntimeEnv() {
  return const SdkworkRuntimeEnv(
    environment: String.fromEnvironment('SDKWORK_ENVIRONMENT'),
    deploymentProfile: String.fromEnvironment('SDKWORK_DEPLOYMENT_PROFILE'),
    profileId: String.fromEnvironment('SDKWORK_PROFILE_ID'),
    runtimeTarget: String.fromEnvironment('SDKWORK_RUNTIME_TARGET'),
    appId: String.fromEnvironment('SDKWORK_APP_ID'),
    apiBaseUrl: String.fromEnvironment('SDKWORK_API_BASE_URL'),
    appApiBaseUrl: String.fromEnvironment('SDKWORK_APP_API_BASE_URL'),
    openApiBaseUrl: String.fromEnvironment('SDKWORK_OPEN_API_BASE_URL'),
    iamIssuer: String.fromEnvironment('SDKWORK_IAM_ISSUER'),
  );
}
`;
}

function coreHostAdapterSource(surface) {
  return `${BANNER}
/**
 * Platform adapter contracts (section 7).
 *
 * Widgets and services depend on these interfaces; only the bootstrap registers
 * implementations, and only the bootstrap may touch a plugin.
 */

/// One platform capability an adapter may provide.
class SdkworkHostCapability {
  const SdkworkHostCapability._();

  static const String camera = 'camera';
  static const String qrScanner = 'qrScanner';
  static const String pushNotifications = 'pushNotifications';
  static const String deepLinks = 'deepLinks';
  static const String secureStorage = 'secureStorage';
  static const String biometric = 'biometric';
  static const String shareSheet = 'shareSheet';
  static const String networkStatus = 'networkStatus';
  static const String appLifecycle = 'appLifecycle';
  static const String clipboard = 'clipboard';
  static const String filePicker = 'filePicker';
  static const String filesystemSandbox = 'filesystemSandbox';
  static const String geolocation = 'geolocation';
  static const String deviceInfo = 'deviceInfo';
  static const String haptics = 'haptics';
}

/// User-safe error surfaced by a platform adapter.
class SdkworkHostError {
  const SdkworkHostError({required this.code, required this.message});

  /// Stable machine-readable code.
  final String code;

  /// User-safe message.
  final String message;
}

/// Typed platform adapter. Implementations never expose plugin types.
abstract class SdkworkHostAdapter {
  /// The capability this adapter provides.
  String get capability;

  /// True when the current platform can actually provide the capability.
  bool isAvailable();
}
`;
}

function coreHostRegistrySource(surface, tier) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  const appCore = surface.coreDir;
  const importLine = tier === 'app'
    ? "import '../src/host/host_adapter.dart';"
    : `import 'package:${appCore}/${appCore}.dart';`;
  return `${BANNER}
/**
 * Host adapter registry of the \`${tier}\` tier.
 *
 * Section 7: widgets and services depend on adapter interfaces, never on plugin
 * classes or method-channel strings. A Flutter root owns no host package, so the
 * bootstrap registers the implementations.
 */

${importLine}

/// Registry of the platform adapters available to the \`${tier}\` tier.
class ${pascal}HostRegistry {
  ${pascal}HostRegistry(List<SdkworkHostAdapter> adapters)
      : _adapters = Map<String, SdkworkHostAdapter>.unmodifiable(
          <String, SdkworkHostAdapter>{
            for (final SdkworkHostAdapter adapter in adapters) adapter.capability: adapter,
          },
        );

  final Map<String, SdkworkHostAdapter> _adapters;

  /// The adapter for [capability], or null when this platform lacks it.
  SdkworkHostAdapter? adapterFor(String capability) => _adapters[capability];

  /// Capabilities this platform actually provides.
  List<String> get capabilities => _adapters.keys.toList(growable: false);
}
`;
}

// ---------------------------------------------------------------------------
// commons / shell sources
// ---------------------------------------------------------------------------

function designTokensSource() {
  return `${BANNER}
/**
 * Domain-neutral design tokens.
 *
 * APP_FLUTTER_UI_SPEC.md: commons owns design tokens so every capability package
 * renders the same spacing and radius without importing another capability.
 */

/// Spacing and radius scale shared by every IAM Flutter package.
class SdkworkDesignTokens {
  const SdkworkDesignTokens._();

  static const double spaceXs = 4;
  static const double spaceSm = 8;
  static const double spaceMd = 16;
  static const double spaceLg = 24;
  static const double spaceXl = 32;

  static const double radiusSm = 4;
  static const double radiusMd = 8;
  static const double radiusLg = 16;
}
`;
}

function commonsScaffoldSource() {
  return `${BANNER}
/**
 * Standard page scaffold.
 *
 * Domain-neutral primitive: more than one capability package renders it, which is
 * why it lives in commons (section 3).
 */

import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

/// Page scaffold every capability screen builds on.
class SdkworkScaffold extends StatelessWidget {
  const SdkworkScaffold({
    super.key,
    required this.titleKey,
    required this.body,
    this.loading = false,
  });

  /// Locale key of the page title.
  final String titleKey;

  /// Page content.
  final Widget body;

  /// True while the page is still fetching.
  final bool loading;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(titleKey)),
      body: loading
          ? const SdkworkLoadingView()
          : Padding(
              padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
              child: body,
            ),
    );
  }
}
`;
}

function commonsErrorViewSource() {
  return `${BANNER}
/**
 * User-safe error view.
 *
 * Domain-neutral primitive owned by commons (section 3).
 */

import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

/// Renders a user-safe error with an optional retry action.
class SdkworkErrorView extends StatelessWidget {
  const SdkworkErrorView({super.key, required this.message, this.retryLabel, this.onRetry});

  /// User-safe message.
  final String message;

  /// Locale key of the retry label.
  final String? retryLabel;

  /// Retry callback, omitted when the failure is not retryable.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(message, textAlign: TextAlign.center),
          if (onRetry != null)
            Padding(
              padding: const EdgeInsets.only(top: SdkworkDesignTokens.spaceMd),
              child: TextButton(
                onPressed: onRetry,
                child: Text(retryLabel ?? 'retry'),
              ),
            ),
        ],
      ),
    );
  }
}
`;
}

function commonsLoadingViewSource() {
  return `${BANNER}
/**
 * Loading state view.
 *
 * Domain-neutral primitive owned by commons (section 3).
 */

import 'package:flutter/material.dart';

/// Loading state shown while a capability fetches its first page.
class SdkworkLoadingView extends StatelessWidget {
  const SdkworkLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}
`;
}

/**
 * Locale bundle loader of commons.
 *
 * The fragments live under the layout `I18N_SPEC.md` mandates, which
 * `flutter gen-l10n` cannot consume because `arb-dir` is a single directory, so
 * the packages bundle the fragments as assets and this loader decodes them.
 */
/**
 * `lib/src/l10n/arb_bundle.dart` — the locale fragment loader.
 *
 * Deliberately *outside* `lib/src/i18n/`: `I18N_SPEC.md` section 199 reserves
 * that tree for `<locale>/<domain>/<capability>/<fragment>.arb` plus one optional
 * thin boundary file, and `check-i18n-standard.mjs` enforces it by requiring the
 * first segment under `lib/src/i18n/` to be a BCP 47 locale unless the lone file
 * is one of the sanctioned thin names. A loader is infrastructure rather than
 * locale source, so naming it `manifest.dart` to slip past that check would
 * satisfy the letter of the standard while emptying it: the rule exists to keep
 * behaviour out of the locale tree.
 */
function commonsL10nBundleSource() {
  return `${BANNER}
/**
 * Locale fragment bundle loader.
 *
 * Reads a package's \`.arb\` fragment from the Flutter asset bundle and exposes it
 * as a flat key/value map. Fragments are the authored source
 * (FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC section 4); this loader is the single place
 * that knows how to read them.
 */

import 'dart:convert';

import 'package:flutter/services.dart';

/// Loads and caches one package's locale fragments.
class SdkworkArbBundle {
  SdkworkArbBundle({required this.assetPathBuilder, AssetBundle? bundle})
      : _bundle = bundle ?? rootBundle;

  /// Builds the asset path of one locale.
  final String Function(String locale) assetPathBuilder;

  final AssetBundle _bundle;
  final Map<String, Map<String, String>> _cache = <String, Map<String, String>>{};

  /// Decoded messages of [locale], with \`@@locale\` and \`@key\` metadata removed.
  Future<Map<String, String>> messages(String locale) async {
    final Map<String, String>? cached = _cache[locale];
    if (cached != null) return cached;
    final String raw = await _bundle.loadString(assetPathBuilder(locale));
    final Object? decoded = json.decode(raw);
    if (decoded is! Map<String, Object?>) {
      throw FormatException('locale fragment for ' + locale + ' is not a JSON object');
    }
    final Map<String, String> messages = <String, String>{
      for (final MapEntry<String, Object?> entry in decoded.entries)
        if (!entry.key.startsWith('@') && entry.value is String) entry.key: entry.value! as String,
    };
    _cache[locale] = messages;
    return messages;
  }

  /// Drops every cached fragment, for a locale switch or a test reset.
  void clear() {
    _cache.clear();
  }
}
`;
}

/**
 * Route composition of one tier, owned by that tier's shell.
 *
 * Owner: `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 4 gives the shell
 * "route contribution assembly", and section 5 states the rule outright — "shell
 * packages compose route contributions and layout".
 *
 * The shell is the only layer that may read both the tier core and the tier's
 * capability packages, so the composition cannot live anywhere else: section 5
 * forbids `core` and `commons` from depending on a capability package, and a
 * capability's allowed dependencies do not include the shell, which is what keeps this
 * edge acyclic.
 *
 * The *identities* are still authored once, in the tier core's `route_registry.dart`;
 * each capability narrows that registry to its own slice, and this file only joins the
 * slices into the tier's composition order.
 */
function shellRouteCompositionSource(surface, tier, packages) {
  const pascal = pascalFromDir(shellEntryOf(packages, tier).dir);
  const core = coreDirOf(surface, tier);
  const capabilities = tierCapabilityEntries(tier, packages);
  const imports = capabilities
    .map((entry) => `import 'package:${entry.dir}/${entry.dir}.dart' as ${camel(pascalFromDir(entry.dir))};`)
    .join('\n');
  const spread = capabilities
    .map((entry) => {
      const alias = camel(pascalFromDir(entry.dir));
      return `  ...${alias}.${alias}RouteContributions,`;
    })
    .join('\n');
  const routeCount = capabilities.reduce((total, entry) => total + routesOfPackage(entry).length, 0);

  return `${BANNER}
/**
 * Route composition of the \`${tier}\` tier.
 *
 * Joins the ${routeCount} \`${tier}\` route contribution(s) of this tier's capability
 * packages into the order the tier navigator mounts them. Ids come from
 * \`${core}\`, which
 * owns the registry, so this file adds no identities of its own.
 */

import 'package:${core}/${core}.dart';
${imports}

/// Every route contribution of the \`${tier}\` surface, in package order.
List<RouteContribution> ${camel(pascal)}RouteContributions() {
  return <RouteContribution>[
${spread}
  ];
}

/// Route ids of the \`${tier}\` surface, in composition order.
List<String> ${camel(pascal)}RouteIds() {
  return ${camel(pascal)}RouteContributions()
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
`;
}

function shellSource(surface, tier, { router = false } = {}) {
  const pascal = pascalFromDir(coreDirOf(surface, tier));
  if (router) {
    return `${BANNER}
/**
 * Navigation assembly of the \`${tier}\` tier.
 *
 * Section 8: Flutter named routes map to SDKWork route ids, so one workflow keeps
 * one identity across PC, H5, mini program, Harmony and Flutter.
 */

import 'package:flutter/material.dart';

/// One named route of the \`${tier}\` tier.
class SdkworkRouteEntry {
  const SdkworkRouteEntry({
    required this.routeId,
    required this.path,
    required this.builder,
  });

  /// Cross-client route id this entry serves.
  final String routeId;

  /// Physical Flutter path.
  final String path;

  /// Builder of the route's screen.
  final WidgetBuilder builder;
}

/// Builds the named-route table of the \`${tier}\` tier.
Map<String, WidgetBuilder> build${pascal}RouteTable(List<SdkworkRouteEntry> entries) {
  return <String, WidgetBuilder>{
    for (final SdkworkRouteEntry entry in entries) entry.path: entry.builder,
  };
}

/// Resolves a physical path back to its cross-client route id.
String? resolve${pascal}RouteId(List<SdkworkRouteEntry> entries, String path) {
  for (final SdkworkRouteEntry entry in entries) {
    if (entry.path == path) return entry.routeId;
  }
  return null;
}
`;
  }
  return `${BANNER}
/**
 * Shell assembly of the \`${tier}\` tier.
 *
 * Section 3 gives the shell family the MaterialApp/router assembly, AuthGate
 * integration and app route composition. It owns no business service.
 */

import 'package:flutter/material.dart';

import 'router.dart';

/// Root widget of the \`${tier}\` tier.
class ${pascal}Shell extends StatelessWidget {
  const ${pascal}Shell({
    super.key,
    required this.title,
    required this.home,
    this.routeEntries = const <SdkworkRouteEntry>[],
  });

  /// Application title.
  final String title;

  /// Widget mounted before any named route is pushed.
  final Widget home;

  /// Named routes of this tier.
  final List<SdkworkRouteEntry> routeEntries;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: title,
      theme: ThemeData(colorSchemeSeed: const Color(0xFF17202A), useMaterial3: true),
      routes: build${pascal}RouteTable(routeEntries),
      home: home,
    );
  }
}
`;
}

// ---------------------------------------------------------------------------
// root payloads
// ---------------------------------------------------------------------------

function rootComponentSpec(surface, packages) {
  const canonical = [
    { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy, route identity, and dependency direction.' },
    { file: surface.architectureSpec, purpose: 'Flutter client root architecture standard.' },
    { file: surface.uiSpec, purpose: 'Flutter package UI rules.' },
    { file: 'APP_COMPOSITION_SPEC.md', purpose: 'Native-authority application composition.' },
    { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'Generated Dart SDK integration and TokenManager wiring.' },
    { file: 'SOURCE_CONFIG_SPEC.md', purpose: 'Source configuration authority and component deployment descriptors.' },
    { file: 'TEST_SPEC.md', purpose: 'Contract, frontend, SDK, security, and documentation verification rules.' },
  ].map((entry) => ({ ...entry, path: `../../../../sdkwork-specs/${entry.file}` }));

  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: surface.rootName,
      displayName: 'SDKWork IAM Flutter Mobile',
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
      routeRegistry: `packages/${surface.coreDir}/lib/composition/route_registry.dart`,
      packageCount: packages.length,
      layerRole: 'runtime-composition',
      providedPorts: [],
      requiredPorts: [],
    },
    integration: {
      authority: 'Root SDKWork specs remain authoritative. Local specs may extend but must not contradict them.',
      dependencyPolicy: 'Consumers integrate through public package exports, declared runtime entrypoints, generated SDK clients, or documented adapters only.',
      sdkPolicy: 'Generated Dart SDK clients are constructed by the bootstrap and injected through the tier core; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'Dart packages follow pubspec and the Dart SDK toolchain while preserving the same component contract.',
      presentationPattern: 'controllers',
    },
    verification: {
      commands: [
        'dart pub get && dart analyze && dart test',
        'node ../../../sdkwork-specs/tools/check-frontend-composition.mjs --root .',
      ],
    },
  };
}

function packageComponentSpec(surface, entry, routeIds) {
  const isCore = isCoreRole(entry);
  const permissionComposition = permissionCompositionFor(entry);
  const publicExports = isCore
    ? ['lib/composition/composition.dart', 'lib/src/sdk/sdk_client_factory.dart', 'lib/src/session/session_store.dart']
    : [`lib/${entry.dir}.dart`];
  const providedName = entry.capability ? `${entry.dir}-surface` : `${entry.dir}-composition`;
  const canonical = [
    { file: 'COMPONENT_SPEC.md', purpose: 'Local component specs directory and manifest rules.' },
    { file: 'MODULE_SPEC.md', purpose: 'Reusable package contract and dependency direction.' },
    { file: 'APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md', purpose: 'Cross-client package taxonomy and dependency direction.' },
    { file: surface.architectureSpec, purpose: 'Flutter client root architecture standard.' },
    { file: surface.uiSpec, purpose: 'Flutter package UI rules.' },
    { file: 'APP_SDK_INTEGRATION_SPEC.md', purpose: 'Generated Dart SDK integration and TokenManager wiring.' },
  ].map((item) => ({ ...item, path: `../../../../../../sdkwork-specs/${item.file}` }));

  return {
    schemaVersion: 1,
    kind: 'sdkwork.component.spec',
    component: {
      name: entry.name,
      displayName: displayNameFor(surface, entry),
      version: '0.1.0',
      type: isCore ? 'dart-package' : 'dart-package',
      root: `${APP_ID}/apps/${surface.rootName}/packages/${entry.dir}`,
      domain: 'iam',
      declaredDomain: 'iam',
      capability: entry.capability ?? entry.role,
      status: 'standardizing',
      surface: entry.surface,
      languages: surface.languages,
      generated: false,
      private: true,
      manifests: ['pubspec.yaml'],
    },
    canonicalSpecs: canonical,
    contracts: {
      publicExports,
      runtimeEntrypoints: [],
      sdkClients: [],
      events: [],
      configKeys: [],
      routeManifest: entry.role === 'capability' ? 'lib/src/routes/route_manifest.dart' : null,
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
      sdkPolicy: 'Generated Dart SDK clients are constructed by the bootstrap and injected through the tier core; reusable UI must not create raw HTTP clients or manual auth headers.',
      languagePolicy: 'Dart packages follow pubspec and the Dart SDK toolchain while preserving the same component contract.',
    },
    verification: {
      commands: [usesFlutterSdk(entry) ? 'flutter analyze && flutter test' : 'dart analyze && dart test'],
    },
  };
}

/**
 * The root `pubspec.yaml`.
 *
 * Every package is a path dependency of the application, which is what lets a
 * single `flutter pub get` at the root resolve the whole family, and is why the
 * generated Dart SDK families are declared here rather than in any package.
 */
function rootPubspec(surface, packages) {
  const paths = packages.map((entry) => `  ${entry.dir}:\n    path: packages/${entry.dir}`);
  return [
    `name: ${surface.rootName.replaceAll('-', '_')}`,
    'description: SDKWork IAM Flutter mobile application root.',
    'version: 0.1.0',
    'publish_to: none',
    '',
    'environment:',
    "  sdk: '>=3.5.0 <4.0.0'",
    "  flutter: '>=3.24.0'",
    '',
    'dependencies:',
    '  flutter:',
    '    sdk: flutter',
    '  flutter_localizations:',
    '    sdk: flutter',
    '  flutter_secure_storage: ^9.2.4',
    `  ${APP_SDK_PACKAGE}:`,
    `    path: ${ROOT_APP_SDK_PATH}`,
    `  ${BACKEND_SDK_PACKAGE}:`,
    `    path: ${ROOT_BACKEND_SDK_PATH}`,
    ...paths,
    '',
    'dev_dependencies:',
    '  flutter_test:',
    '    sdk: flutter',
    '  flutter_lints: ^5.0.0',
    '',
    'flutter:',
    '  uses-material-design: true',
    '',
  ].join('\n');
}

function rootMainSource() {
  return `${BANNER}
import 'package:flutter/material.dart';

import 'app.dart';
import 'bootstrap/runtime.dart';

/// Application entry point.
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await bootstrap();
  runApp(const IamApp());
}
`;
}

function rootAppSource(surface) {
  const shell = `${surface.packageDirPrefix}shell`;
  return `${BANNER}
import 'package:flutter/material.dart';
import 'package:${shell}/${shell}.dart';

import 'shell/app_shell.dart';

/// SDKWork IAM Flutter mobile application.
class IamApp extends StatelessWidget {
  const IamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return IamFlutterMobileShell(
      title: 'SDKWork IAM',
      home: const IamHomeShell(),
    );
  }
}
`;
}

function rootAuthGateSource(surface) {
  return `${BANNER}
import 'package:flutter/material.dart';

import 'bootstrap/iam_runtime.dart';

/// Sends the user to the sign-in flow until a complete session exists.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    if (!IamRuntime.instance.hasSession) {
      return const SdkworkSignInPlaceholder();
    }
    return const SizedBox.shrink();
  }
}

/// Placeholder shown until the auth capability package is mounted.
///
/// The auth capability owns the real sign-in screen
/// (\`${surface.packageDirPrefix}auth\`); the root only decides whether a session
/// exists, which is what keeps the root \`lib/\` thin (section 2).
class SdkworkSignInPlaceholder extends StatelessWidget {
  const SdkworkSignInPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
`;
}

function rootEnvironmentSource(surface) {
  const core = surface.coreDir;
  return `${BANNER}
import 'package:${core}/${core}.dart';

/// Runtime configuration of this build, resolved once at bootstrap.
///
/// Section 9: the values arrive through
/// \`--dart-define-from-file=env/sdkwork.<profile>.json\`, so no endpoint is
/// declared here.
SdkworkRuntimeEnv resolveEnvironment() => resolveSdkworkRuntimeEnv();
`;
}

function rootRuntimeSource() {
  return `${BANNER}
import 'host_adapters.dart';
import 'iam_runtime.dart';
import 'routes.dart';
import 'sdk_clients.dart';

/// Boots the root in the order section 6 requires: token manager, then SDK
/// clients, then platform adapters, then route assembly.
Future<void> bootstrap() async {
  createIamRuntime();
  createSdkClients();
  await registerHostAdapters();
  createRoutes();
}
`;
}

function rootSdkClientsSource(surface) {
  const core = surface.coreDir;
  const consoleCore = surface.consoleCoreDir;
  const adminCore = surface.adminCoreDir;
  const corePascal = pascalFromDir(core);
  const consolePascal = pascalFromDir(consoleCore);
  const adminPascal = pascalFromDir(adminCore);
  const appTier = camel(corePascal);
  const consoleTier = camel(consolePascal);
  const adminTier = camel(adminPascal);
  return `${BANNER}
import 'package:${APP_SDK_PACKAGE}/${APP_SDK_PACKAGE}.dart';
import 'package:${BACKEND_SDK_PACKAGE}/${BACKEND_SDK_PACKAGE}.dart';
import 'package:${core}/${core}.dart';
import 'package:${consoleCore}/${consoleCore}.dart';
import 'package:${adminCore}/${adminCore}.dart';

import 'environment.dart';
import 'iam_runtime.dart';

/// Realizes the tier factory contracts over the generated Dart SDK clients.
class IamSdkClientFactory<TClient>
    implements ${corePascal}SdkClientFactory<TClient>, ${consolePascal}SdkClientFactory<TClient>, ${adminPascal}SdkClientFactory<TClient> {
  IamSdkClientFactory(this._build);

  final TClient Function(SdkworkRuntimeEnv env, SdkworkTokenManager tokenManager) _build;

  @override
  TClient create({
    required SdkworkRuntimeEnv env,
    required SdkworkTokenManager tokenManager,
  }) =>
      _build(env, tokenManager);
}

/// Every SDK client the root constructed, per tier.
class IamSdkClients {
  const IamSdkClients({
    required this.${appTier},
    required this.${consoleTier},
    required this.${adminTier},
  });

  /// App-tier client over \`/app/v3/api\`.
  final ${APP_SDK_CLIENT} ${appTier};

  /// User-facing console client over \`/app/v3/api\`.
  final ${APP_SDK_CLIENT} ${consoleTier};

  /// Approved operator client over \`/backend/v3/api\`.
  final ${BACKEND_SDK_CLIENT} ${adminTier};
}

IamSdkClients? _clients;

/// Builds the per-tier clients from the resolved runtime configuration.
///
/// Section 6: every authenticated client shares the one token manager, and a
/// refresh in one tier is pushed to the others so no client keeps a stale token.
IamSdkClients createSdkClients() {
  final SdkworkRuntimeEnv env = resolveEnvironment();
  final SdkworkTokenManager tokenManager = IamRuntime.instance.tokenManager;

  final ${APP_SDK_CLIENT} ${appTier} = ${APP_SDK_CLIENT}.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );
  final ${APP_SDK_CLIENT} ${consoleTier} = ${APP_SDK_CLIENT}.withBaseUrl(
    baseUrl: env.appApiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );
  final ${BACKEND_SDK_CLIENT} ${adminTier} = ${BACKEND_SDK_CLIENT}.withBaseUrl(
    baseUrl: env.apiBaseUrl,
    accessToken: tokenManager.currentAccessToken,
  );

  tokenManager.addListener((String? token) {
    if (token == null) return;
    ${appTier}.setAccessToken(token);
    ${consoleTier}.setAccessToken(token);
    ${adminTier}.setAccessToken(token);
  });

  _clients = IamSdkClients(
    ${appTier}: ${appTier},
    ${consoleTier}: ${consoleTier},
    ${adminTier}: ${adminTier},
  );
  return _clients!;
}

/// Active SDK clients, building them on first use.
IamSdkClients getSdkClients() => _clients ?? createSdkClients();

/// Closes and drops the constructed clients so logout cannot reuse them.
void resetSdkClients() {
  _clients?.${appTier}.close();
  _clients?.${consoleTier}.close();
  _clients?.${adminTier}.close();
  _clients = null;
}
`;
}

function rootIamRuntimeSource(surface) {
  const core = surface.coreDir;
  const corePascal = pascalFromDir(core);
  return `${BANNER}
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:${core}/${core}.dart';

/// The root's IAM runtime: one token manager, one context store and the secure
/// storage the credentials are mirrored into (section 6).
class IamRuntime {
  IamRuntime._();

  static IamRuntime? _instance;

  /// The process-wide runtime instance.
  static IamRuntime get instance {
    final IamRuntime? current = _instance;
    if (current == null) {
      throw StateError('IamRuntime was read before bootstrap() created it.');
    }
    return current;
  }

  /// Creates the runtime instance during bootstrap.
  static IamRuntime createIamRuntime() => _instance = IamRuntime._();

  /// Global token manager shared by every tier client.
  final SdkworkTokenManager tokenManager = SdkworkTokenManager();

  /// Session context store of the default app tier.
  final ${corePascal}ContextStore contextStore = ${corePascal}ContextStore();

  /// Secure platform storage, so a token survives a process restart.
  final FlutterSecureStorage secureStorage = const FlutterSecureStorage();

  /// True when a complete session is available.
  bool get hasSession => contextStore.current?.isComplete ?? false;

  /// Clears every credential and the context store.
  ///
  /// Section 6: logout and refresh failure must clear the token manager, the
  /// context store, secure platform storage and the sensitive state together.
  Future<void> clearSession() async {
    tokenManager.clear();
    contextStore.clear();
    await secureStorage.deleteAll();
    _instance = null;
  }
}
`;
}

function rootHostAdaptersSource(surface) {
  const core = surface.coreDir;
  return `${BANNER}
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:${core}/${core}.dart';

/// Secure-storage adapter over the platform keystore.
///
/// Section 7: only the bootstrap registers implementations, and an adapter exposes
/// no plugin type to a widget or service.
class SdkworkSecureStorageAdapter implements SdkworkHostAdapter {
  SdkworkSecureStorageAdapter({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  String get capability => SdkworkHostCapability.secureStorage;

  @override
  bool isAvailable() => true;

  /// Reads one secret, or null when it was never written.
  Future<String?> read(String key) => _storage.read(key: key);

  /// Writes one secret.
  Future<void> write(String key, String value) => _storage.write(key: key, value: value);

  /// Removes one secret.
  Future<void> delete(String key) => _storage.delete(key: key);
}

final Map<String, SdkworkHostAdapter> _adapters = <String, SdkworkHostAdapter>{};

/// Registers the platform adapters this build provides.
///
/// Section 7 lists fifteen adapter categories; the Flutter root starts with the
/// one the IAM credential lifecycle actually needs, and the rest are registered
/// here as their implementations land.
Future<void> registerHostAdapters() async {
  _adapters.clear();
  _adapters[SdkworkHostCapability.secureStorage] = SdkworkSecureStorageAdapter();
}

/// The adapter for [capability], or null when this platform lacks it.
SdkworkHostAdapter? hostAdapterFor(String capability) => _adapters[capability];
`;
}

function rootRoutesSource(surface, packages) {
  const tiers = ['app', 'console', 'admin'].map((tier) => {
    const shell = shellEntryOf(packages, tier).dir;
    return { tier, shell, pascal: camel(pascalFromDir(shell)) };
  });
  const imports = tiers
    .map(({ shell, pascal }) => `import 'package:${shell}/${shell}.dart' as ${pascal};`)
    .join('\n');
  const lines = tiers
    .map(({ tier, pascal }) => `  RouteTierDescriptor(\n    tier: '${tier}',\n    routeIds: ${pascal}.${pascal}RouteIds,\n  ),`)
    .join('\n');
  return `${BANNER}
/**
 * Root route assembly.
 *
 * Section 2 keeps the root bootstrap thin: it names the tiers and their composition
 * functions. Each tier's composition lives in its shell, which is the only layer
 * section 5 lets read both the tier core and the tier's capability packages.
 */

${imports}

/// One tier and the composition function that lists its route ids.
class RouteTierDescriptor {
  const RouteTierDescriptor({required this.tier, required this.routeIds});

  /// Route surface tier.
  final String tier;

  /// Composition function of that tier's shell package.
  final List<String> Function() routeIds;
}

/// Tier registries in route-surface order.
const List<RouteTierDescriptor> iamRouteTiers = <RouteTierDescriptor>[
${lines}
];

/// Every route id this root can navigate to, across all three tiers.
List<String> allIamRouteIds() {
  return <String>[
    for (final RouteTierDescriptor descriptor in iamRouteTiers) ...descriptor.routeIds(),
  ];
}

/// Assembles the root route table during bootstrap.
void createRoutes() {
  // Nothing is cached here: the table is derived from the tier registries on
  // demand, so a hot restart cannot keep a stale registry alive.
  allIamRouteIds();
}
`;
}

function rootShellSource(surface) {
  const shell = `${surface.packageDirPrefix}shell`;
  return `${BANNER}
import 'package:flutter/material.dart';
import 'package:${shell}/${shell}.dart';

/// Shell the root mounts once a session exists.
class IamHomeShell extends StatelessWidget {
  const IamHomeShell({super.key});

  @override
  Widget build(BuildContext context) {
    return const IamFlutterMobileShell(
      title: 'SDKWork IAM',
      home: SizedBox.shrink(),
    );
  }
}
`;
}

function rootSecondaryMarkdown(surface, name) {
  return '${GENERATED_BANNER}\n\n# ${name}\n\n' +
    `Authority: read [AGENTS.md](AGENTS.md) first.\n\nOwner: \`sdkwork-iam\` maintainers.\n`;
}

/**
 * Root `package.json`.
 *
 * The Flutter root is also a pnpm surface: `sdkwork-app` orchestrates it, and
 * `check-pnpm-script-standard.mjs` requires the delegated surface scripts plus a
 * public command for every `_sdkwork:*` hook. The sibling Flutter template root
 * passes with this shape; the sibling Harmony template root fails eight findings
 * because its `package.json` predates the standard.
 */
function rootPackageJson(surface) {
  return {
    name: `@sdkwork/iam-${surface.architecture}`,
    private: true,
    version: '0.1.0',
    type: 'module',
    packageManager: 'pnpm@10.33.0',
    scripts: {
      dev: 'pnpm dev:standalone',
      'dev:standalone': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile standalone',
      'dev:cloud': 'pnpm exec sdkwork-app dev --root ../.. --deployment-profile cloud',
      'dev:flutter-android': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target flutter-android --deployment-profile standalone',
      'dev:flutter-android:cloud': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target flutter-android --deployment-profile cloud',
      'dev:flutter-ios': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target flutter-ios --deployment-profile standalone',
      'dev:flutter-ios:cloud': 'pnpm exec sdkwork-app dev --root ../.. --runtime-target flutter-ios --deployment-profile cloud',
      stop: 'pnpm exec sdkwork-app stop --root ../..',
      build: 'pnpm exec sdkwork-app build',
      test: 'pnpm exec sdkwork-app test',
      check: 'pnpm exec sdkwork-app check',
      verify: 'pnpm exec sdkwork-app verify',
      clean: 'pnpm exec sdkwork-app clean',
      'test:config': 'node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root . && node ../../../sdkwork-specs/tools/check-source-config-standard.mjs --root .',
      '_sdkwork:build': 'flutter build appbundle',
      '_sdkwork:test': 'flutter test',
      '_sdkwork:check': 'pnpm run test:config && flutter analyze',
      '_sdkwork:verify': 'pnpm run _sdkwork:check && pnpm run _sdkwork:test',
      '_sdkwork:clean': 'flutter clean',
    },
    devDependencies: { '@sdkwork/app-topology': 'workspace:*' },
  };
}

export {
  APP_SDK_CLIENT,
  APP_SDK_PACKAGE,
  APP_SDK_PATH,
  BACKEND_SDK_CLIENT,
  BACKEND_SDK_PACKAGE,
  BACKEND_SDK_PATH,
  BANNER,
  PUBLIC_DOC_LINE,
  analysisOptions,
  camel,
  commonsL10nBundleSource,
  commonsDir,
  commonsErrorViewSource,
  commonsLoadingViewSource,
  commonsScaffoldSource,
  configAppExample,
  controllerSource,
  coreCompositionSource,
  coreDependencyManifestSource,
  coreDirOf,
  coreHostAdapterSource,
  coreHostRegistrySource,
  coreModuleRegistrySource,
  coreRouteRegistrySource,
  coreRuntimeEnvSource,
  coreSdkFactorySource,
  coreSdkInventorySource,
  coreSessionSource,
  coreTokenManagerSource,
  designTokensSource,
  entryExports,
  entrySource,
  i18nFragment,
  i18nManifestSource,
  isCoreRole,
  packageComponentSpec,
  packageDescription,
  packagePubspec,
  pascalFromDir,
  rootAppSource,
  rootAuthGateSource,
  rootComponentSpec,
  rootEnvironmentSource,
  rootHostAdaptersSource,
  rootIamRuntimeSource,
  rootMainSource,
  rootPackageJson,
  rootPubspec,
  rootRoutesSource,
  rootRuntimeSource,
  rootSdkClientsSource,
  rootSecondaryMarkdown,
  rootShellSource,
  routeManifestSource,
  screenSource,
  serviceSource,
  shellRouteCompositionSource,
  shellSource,
  stateSource,
  tierOfEntry,
  tokenOf,
  usesFlutterSdk,
  viewModelSource,
  widgetSource,
  appManifest,
  deploymentIndex,
  runtimeEnvDocument,
};
