/**
 * Materializes the Flutter/Dart client root: root scaffolding plus the full
 * package family.
 *
 * Same shape as `materializeTsSurface` in `emit-ts-surface.mjs`, and the same
 * authored-vs-generated rules (`createSurfaceWriter`). Only the file set, the
 * templates and the language-specific ownership table differ.
 *
 * The four packages that predate the generator
 * (`sdkwork_iam_flutter_mobile_{core,auth,user,account_binding}`) are never
 * overwritten: for those the emitter only creates files that do not exist yet, so
 * the authored controllers, READMEs and pubspecs survive. Their *public boundary*
 * files are extended rather than replaced, because they must become reachable from
 * the generated composition while keeping the author's exports.
 */

import path from 'node:path';

import { PROFILE_IDS, routeId, routesOfPackage } from './model.mjs';
import { GENERATED_BANNER, createSurfaceWriter, toPosix } from './emit-common.mjs';
import {
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
  entrySource,
  i18nFragment,
  i18nManifestSource,
  isCoreRole,
  mergePubspecText,
  packageComponentSpec,
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
  rootShellSource,
  routeManifestSource,
  screenSource,
  serviceSource,
  shellRouteCompositionSource,
  shellSource,
  stateSource,
  tierOfEntry,
  usesFlutterSdk,
  viewModelSource,
  widgetSource,
  appManifest,
  deploymentIndex,
  runtimeEnvDocument,
} from './emit-dart.mjs';

/**
 * Packages that predate the generator and must keep their authored sources.
 *
 * Only `core` is emitted into here for the Flutter root — the other three are
 * capability packages that already carry authored controllers, route manifests and
 * tests.
 */
export const PRE_EXISTING_PACKAGE_DIRS = new Set([
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_core',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_auth',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_user',
  'apps/sdkwork-iam-flutter-mobile/packages/sdkwork_iam_flutter_mobile_account_binding',
]);

/**
 * Generator-owned files inside a package that predates the generator.
 *
 * The git-index rule answers "who wrote this file" but cannot answer whether a
 * *committed* file is still this generator's output. The component spec and the
 * Dart sources under `lib/composition/**`, `lib/src/{sdk,session,runtime,host,routes}/**`
 * and `lib/src/i18n/**` are generated artifacts, so a committed copy must not
 * freeze them.
 *
 * Two families are deliberately absent:
 * - `lib/<package>.dart` is *extended* through `writeEntry`, because replacing it
 *   would delete the author's `export` statements.
 * - `README.md` and `pubspec.yaml` are authored prose and dependency decisions that
 *   no template can reproduce.
 */
const GENERATOR_OWNED_RELATIVE = [
  /^specs\/component\.spec\.json$/u,
  /^lib\/composition\/[^/]+\.dart$/u,
  /^lib\/src\/(?:sdk|session|runtime|host|routes)\/[^/]+\.dart$/u,
  /^lib\/src\/i18n\/manifest\.dart$/u,
  /^lib\/src\/i18n\/[^/]+\/iam\/[^/]+\/[^/]+\.(?:arb|json)$/u,
];

function docBanner() {
  return `${GENERATED_BANNER}\n`;
}

function agentsMd(surface) {
  return `${docBanner()}# SDKWork IAM Flutter Mobile

\`apps/${surface.rootName}\` is the SDKWork IAM **Flutter Mobile** client application root.

## Authority

- \`../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md\` — cross-client root,
  package taxonomy, route identity, dependency direction.
- \`../../../sdkwork-specs/${surface.architectureSpec}\` — this architecture's root standard.
- \`../../../sdkwork-specs/${surface.uiSpec}\` — package UI rules.

## Cross-client references

- Cross-architecture IAM contracts/runtime: \`../../apps/sdkwork-iam-common/packages/\`.
- OAuth runtime discovery: \`../../../sdkwork-specs/IAM_OAUTH_SPEC.md\`, consumed by
  \`packages/${surface.coreDir}\` through the IAM contracts boundary.

## Layout

- \`packages/${surface.coreDir}/\` — runtime config, SDK factory contract, token manager,
  session store, host contracts, route registry.
- \`packages/${commonsDir(surface)}/\` — domain-neutral widgets, design tokens, route
  contribution contract, locale bundle loader.
- \`packages/${surface.packageDirPrefix}shell/\` — app shell and route assembly.
- \`packages/${surface.packageDirPrefix}<capability>/\` — one domain capability per package.
- \`packages/${surface.packageDirPrefix}console_*/\` — user-facing console family (app-api).
- \`packages/${surface.packageDirPrefix}admin_*/\` — internal operator family (backend-api, approved).
- \`lib/bootstrap/\` — bootstrap only (environment, runtime, SDK clients, IAM runtime, host adapters, routes).
- \`lib/\` (root) — thin entry and shell only.
- \`env/\` — per-profile dart-define runtime documents.

## Non-negotiable rules

- Screens, widgets, controllers, services, state, i18n and route contributions live in
  packages, not in the root entry.
- Capability packages never construct SDK clients and never import generated SDK packages;
  the bootstrap constructs them and the tier core injects them.
- Widgets and services never call platform plugins or method channels directly; they depend
  on the host adapter contracts in \`packages/${surface.coreDir}/lib/src/host/\`.

${PUBLIC_DOC_LINE}
`;
}

function readmeMd(surface, packages) {
  return `${docBanner()}# SDKWork IAM Flutter Mobile

SDKWork IAM Flutter Mobile client application root (\`apps/${surface.rootName}\`).

| Field | Value |
| --- | --- |
| Architecture | \`flutter-mobile\` |
| Package segment | \`flutter_mobile\` |
| Runtime target | \`flutter-android\`, \`flutter-ios\` |
| App manifest | \`pubspec.yaml\` |
| Component spec | \`specs/component.spec.json\` |
| Deployment descriptor | \`etc/sdkwork.deployment.config.json\` |
| Route registry | \`packages/${surface.packageDirPrefix}{,console_,admin_}core/lib/composition/route_registry.dart\` |
| Route composition | \`packages/${surface.packageDirPrefix}{,console_,admin_}shell/lib/composition/route_composition.dart\` |
| Packages | ${packages.length} |

## Commands

\`\`\`bash
flutter pub get
flutter analyze
flutter test
flutter run --dart-define-from-file=env/sdkwork.standalone.development.json
flutter build appbundle --dart-define-from-file=env/sdkwork.cloud.production.json
\`\`\`

The repository orchestrates the same commands through pnpm:

\`\`\`bash
pnpm install
pnpm dev:flutter-android
pnpm dev:flutter-ios
pnpm test
pnpm check
\`\`\`

## Generated sources

\`lib/\`, \`env/\`, \`packages/*/lib/composition/**\`, \`packages/*/lib/src/{sdk,session,runtime,host,routes}/**\`,
\`packages/*/lib/src/i18n/**\` and every \`specs/component.spec.json\` are generated by
\`node scripts/materialize-client-app-surfaces.mjs\` in the repository root. Package
\`README.md\` and \`pubspec.yaml\` files are authored and are never overwritten.

${PUBLIC_DOC_LINE}
`;
}

function rootTestSources(surface, packages) {
  const allIds = [];
  for (const entry of packages) {
    if (entry.role !== 'capability') continue;
    for (const route of routesOfPackage(entry)) allIds.push(routeId(route));
  }
  const sorted = [...new Set(allIds)].sort();
  const coreDir = surface.coreDir;
  const rootName = surface.rootName.replaceAll('-', '_');

  const routeAlignment = `${BANNER}
/**
 * Cross-client route alignment test.
 *
 * Proves the Flutter root publishes exactly the route ids of
 * APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md section 7 — the same ids PC, H5, mini
 * program and Harmony declare — and that no tier registry duplicates one.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:${coreDir}/${coreDir}.dart';
import 'package:${rootName}/bootstrap/routes.dart';

void main() {
  test('every route id of every tier is present exactly once', () {
    final List<String> ids = allIamRouteIds();
    expect(ids.toSet().length, ids.length, reason: 'duplicate route id across tiers');
    expect(ids.toSet(), <String>{
${sorted.map((id) => `      '${id}',`).join('\n')}
    });
  });

  test('each tier registry owns only its own surface', () {
    for (final RouteTierDescriptor descriptor in iamRouteTiers) {
      for (final String id in descriptor.routeIds()) {
        expect(
          id.split('.').first,
          descriptor.tier,
          reason: id + ' is registered under the ' + descriptor.tier + ' tier',
        );
      }
    }
  });

  test('the app tier registry is reachable through its core package boundary', () {
    // \`${camel(pascalFromDir(coreDir))}RouteIds\` is reached through
    // \`package:${coreDir}/${coreDir}.dart\`, so this stops compiling if the core
    // package stops exporting its registry. The previous version of this test
    // asserted that a string literal contained a substring of itself, which no
    // change to any package could have broken.
    final List<String> appIds = ${camel(pascalFromDir(coreDir))}RouteIds();
    expect(appIds, isNotEmpty);
    expect(appIds.toSet().length, appIds.length, reason: 'duplicate route id inside the app tier');
  });
}
`;

  const configProfiles = PROFILE_IDS.map((profileId) => `      '${profileId}',`).join('\n');
  const configTest = `${BANNER}
/**
 * Runtime document test.
 *
 * Section 9: every supported profile id has a checked-in
 * \`env/sdkwork.<deploymentProfile>.<environment>.json\`, and each document
 * declares the SDKWORK_* keys ENVIRONMENT_SPEC.md section 5.1 requires.
 */

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

const List<String> _requiredKeys = <String>[
  'SDKWORK_ENVIRONMENT',
  'SDKWORK_DEPLOYMENT_PROFILE',
  'SDKWORK_PROFILE_ID',
  'SDKWORK_RUNTIME_TARGET',
  'SDKWORK_APP_ID',
  'SDKWORK_API_BASE_URL',
  'SDKWORK_APP_API_BASE_URL',
  'SDKWORK_OPEN_API_BASE_URL',
  'SDKWORK_IAM_ISSUER',
];

void main() {
  test('every deployment profile has a runtime document', () {
    const List<String> profiles = <String>[
${configProfiles}
    ];
    for (final String profileId in profiles) {
      final File file = File('env/sdkwork.' + profileId + '.json');
      expect(file.existsSync(), isTrue, reason: 'missing ' + file.path);
    }
  });

  test('every runtime document declares the required keys and its own profile id', () {
    for (final FileSystemEntity entity in Directory('env').listSync()) {
      if (entity is! File || !entity.path.endsWith('.json')) continue;
      final Map<String, dynamic> document =
          json.decode(entity.readAsStringSync()) as Map<String, dynamic>;
      for (final String key in _requiredKeys) {
        expect(document.containsKey(key), isTrue, reason: entity.path + ' is missing ' + key);
      }
      final String profileId = document['SDKWORK_PROFILE_ID'] as String;
      expect(entity.path, endsWith('sdkwork.' + profileId + '.json'));
      expect(
        profileId,
        (document['SDKWORK_DEPLOYMENT_PROFILE'] as String) +
            '.' +
            (document['SDKWORK_ENVIRONMENT'] as String),
      );
    }
  });
}
`;

  return { routeAlignment, configTest };
}

function packageTestSource(surface, entry) {
  const pascal = pascalFromDir(entry.dir);
  const token = tokenOfEntry(entry);
  if (entry.role === 'capability') {
    const routes = routesOfPackage(entry);
    const expected = routes
      .map((route) => `      '${routeId(route)}': '${route.path}',`)
      .join('\n');
    return `${BANNER}
/**
 * Route contribution test of \`${entry.dir}\`.
 *
 * Proves this package contributes the route ids APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC
 * section 7 assigns to the \`${entry.capability}\` capability on the
 * \`${entry.surface}\` surface, with the physical Flutter path it declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:${entry.dir}/${entry.dir}.dart';

void main() {
  test('route ids and paths match the cross-client identity', () {
    final Map<String, String> actual = <String, String>{
      for (final RouteContribution contribution in ${camel(pascal)}RouteContributions)
        contribution.id: contribution.path,
    };
    expect(actual, <String, String>{
${expected}
    });
  });

  test('every contribution declares a title key and a presentation', () {
    for (final RouteContribution contribution in ${camel(pascal)}RouteContributions) {
      expect(contribution.titleKey, isNotEmpty, reason: contribution.id);
      expect(contribution.presentation, isNotEmpty, reason: contribution.id);
    }
  });
}
`;
  }
  const tokenFile = token;
  return `${BANNER}
/**
 * Composition test of \`${entry.dir}\`.
 *
 * Proves the package publishes the composition surface its component spec declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:${entry.dir}/${entry.dir}.dart';

void main() {
  test('the public boundary exposes the package composition', () {
    expect(${camel(pascal)}ComponentSpecPath, endsWith('specs/component.spec.json'));
  });
}
`.replaceAll('${tokenFile}', tokenFile);
}

function tokenOfEntry(entry) {
  if (entry.role !== 'capability') return entry.role.replaceAll('-', '_');
  const base = entry.capability.replaceAll('-', '_');
  if (entry.surface === 'console') return `console_${base}`;
  if (entry.surface === 'backend-admin') return `admin_${base}`;
  return base;
}

function configReadme() {
  return `${docBanner()}# config

Non-secret public runtime templates live in \`app/\`. This root carries no platform host
package — \`check-client-host-packages.mjs\` reports one as an error under a
\`-flutter-mobile\` root, because Flutter publishes through its own iOS/Android project
directories — so platform packaging metadata (bundle id, package id, entitlements, signing
reference names) is owned by \`ios/\` and \`android/\` and by \`env/\`.

${PUBLIC_DOC_LINE}
`;
}

function sdksReadme(surface) {
  return `${docBanner()}# sdks

This root consumes the \`sdkwork_iam_app_sdk\` and \`sdkwork_iam_backend_sdk\` families owned
by \`sdks/**\`. The Dart output of both is declared as a path dependency of the root
\`pubspec.yaml\`, and the bootstrap is the only place that constructs a client
(\`lib/bootstrap/sdk_clients.dart\`). This root owns no generated SDK family, so no generated
output is committed here.

${PUBLIC_DOC_LINE}
`;
}

function docsReadme(surface) {
  return `${docBanner()}# docs

Local architecture notes and runbooks for \`apps/${surface.rootName}\`.

## Verification

\`pnpm check\` resolves to \`flutter analyze\`, which is the authority on whether this root
compiles: it type-checks every package, so a wrong \`package:\` name or a moved file fails
there.

Where no Dart or Flutter toolchain is installed — the machine that generates this root has
neither — \`node tools/check-dart-imports.mjs --root apps/${surface.rootName}\` in the
repository root is the toolchain-free substitute. It resolves every \`package:\` and relative
import against the files on disk and exits non-zero on the first one that does not exist. It
is strictly weaker than the analyzer: it proves the import *graph* is connected, not that the
types line up.

## Known follow-ups

- \`pubspec.lock\` is not generated. Producing one requires a Dart or Flutter toolchain
  (\`flutter pub get\`), which is what publishes it; nothing in this repository can author a
  correct lock file. Root and package locks appear the first time a developer runs the
  command.
- Platform adapters beyond \`secureStorage\` are registered in
  \`lib/bootstrap/host_adapters.dart\` as their implementations land; section 7 of the
  architecture standard lists the full set.

${PUBLIC_DOC_LINE}
`;
}

function etcReadme() {
  return `${docBanner()}# etc

Source configuration authority for this client root. \`sdkwork.deployment.config.json\` is the
component deployment descriptor consumed by \`sdkwork-specs\` tooling.

${PUBLIC_DOC_LINE}
`;
}

function scriptsReadme(surface) {
  return `${docBanner()}# scripts

Local build, validation and release helpers for this client root. The standard commands are
aliases onto Flutter itself and live in \`package.json\`.

${PUBLIC_DOC_LINE}
`;
}

function gitignore() {
  return `# Miscellaneous
*.class
*.log
*.swp
.DS_Store
.atom/
.build/
.buildlog/
.history
.svn/
.swiftpm/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins-dependencies
.pub-cache/
.pub/
/build/
/coverage/

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release
`;
}

/**
 * Materializes the Flutter client root.
 *
 * @param {{surface: object, appRoot: string, repoRoot: string, packages: object[], writer: object, authoredFiles: Set<string>|null}} input
 */
export function materializeDartSurface({
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
  const { rel, write, writeJson, writeEntry, writeMergedText } = surfaceWriter;

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
  write('config/README.md', configReadme());
  // FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC section 100 gives `config/app/` the
  // non-secret runtime templates the Flutter bootstrap consumes, and section 316
  // has a static check assert the directory exists.
  writeJson('config/app/runtime-env.development.example.json', configAppExample(surface, 'development'));
  write('etc/README.md', etcReadme());

  writeJson('sdkwork.app.config.json', appManifest(surface));
  writeJson('specs/component.spec.json', rootComponentSpec(surface, packages));
  writeJson('etc/sdkwork.deployment.config.json', deploymentIndex(surface));
  writeJson('package.json', rootPackageJson(surface));

  // ---- root: Flutter manifests ----
  write('pubspec.yaml', rootPubspec(surface, packages));
  write('analysis_options.yaml', analysisOptions(true));

  // ---- root: runtime documents ----
  for (const profileId of PROFILE_IDS) {
    writeJson(`${surface.runtimeEnvDir}/${surface.runtimeEnvFileBase}.${profileId}.json`, runtimeEnvDocument(surface, profileId, repoRoot));
  }

  // ---- root: thin lib/ ----
  write('lib/main.dart', rootMainSource(surface));
  write('lib/app.dart', rootAppSource(surface));
  write('lib/auth_gate.dart', rootAuthGateSource(surface));
  write('lib/bootstrap/environment.dart', rootEnvironmentSource(surface));
  write('lib/bootstrap/runtime.dart', rootRuntimeSource(surface));
  write('lib/bootstrap/sdk_clients.dart', rootSdkClientsSource(surface));
  write('lib/bootstrap/iam_runtime.dart', rootIamRuntimeSource(surface));
  write('lib/bootstrap/host_adapters.dart', rootHostAdaptersSource(surface));
  write('lib/bootstrap/routes.dart', rootRoutesSource(surface, packages));
  write('lib/shell/app_shell.dart', rootShellSource(surface));

  // ---- root: tests ----
  const tests = rootTestSources(surface, packages);
  write('test/route_alignment_test.dart', tests.routeAlignment);
  write('test/config_profile_test.dart', tests.configTest);

  // ---- packages ----
  for (const entry of packages) {
    writePackage(surface, entry, packages, { write, writeJson, writeEntry, writeMergedText });
  }

  void rel;
  return { planned: surfaceWriter.planned };
}

function writePackage(surface, entry, packages, io) {
  const { write, writeJson, writeEntry, writeMergedText } = io;
  const packageDir = `packages/${entry.dir}`;
  const token = tokenOfEntry(entry);

  // The four packages that predate the generator carry authored pubspecs. The
  // merge keeps their identity, prose and already-declared dependencies while
  // adding the Flutter toolchain the generated screens need, so neither the
  // authored tests nor the generated widgets are left unrunnable.
  writeMergedText(`${packageDir}/pubspec.yaml`, packagePubspec(surface, entry, packages), mergePubspecText);
  write(`${packageDir}/analysis_options.yaml`, analysisOptions(usesFlutterSdk(entry)));
  write(
    `${packageDir}/README.md`,
    `${docBanner()}# ${entry.name}

| Field | Value |
| --- | --- |
| Role | \`${entry.role}\` |
| Surface | \`${entry.surface}\` |
| Capability | \`${entry.capability ?? '—'}\` |
| Layer role | \`${entry.layerRole}\` |
| Dart entry | \`lib/${entry.dir}.dart\` |
| Manifest | \`pubspec.yaml\` |

${usesFlutterSdk(entry) ? 'Flutter package: provides screens, widgets and locale fragments.' : 'Pure Dart package: provides contracts and stores only, so `dart test` runs without the Flutter SDK.'}

${PUBLIC_DOC_LINE}
`,
  );
  writeEntry(`${packageDir}/lib/${entry.dir}.dart`, entrySource(surface, entry));
  writeJson(`${packageDir}/specs/component.spec.json`, packageComponentSpec(surface, entry, routesOfPackage(entry).map(routeId)));
  write(`${packageDir}/test/${token}_contract_test.dart`, packageTestSource(surface, entry));

  if (entry.role === 'capability') {
    const routes = routesOfPackage(entry);
    write(`${packageDir}/lib/src/routes/route_manifest.dart`, routeManifestSource(surface, entry));
    write(`${packageDir}/lib/src/services/${token}_service.dart`, serviceSource(surface, entry, routes));
    write(`${packageDir}/lib/src/state/${token}_state.dart`, stateSource(surface, entry));
    write(`${packageDir}/lib/src/models/${token}_view_model.dart`, viewModelSource(surface, entry, routes));
    write(`${packageDir}/lib/src/controllers/${token}_controller.dart`, controllerSource(surface, entry));
    write(`${packageDir}/lib/src/screens/${token}_screen.dart`, screenSource(surface, entry));
    write(`${packageDir}/lib/src/widgets/${token}_summary_card.dart`, widgetSource(surface, entry));
    write(`${packageDir}/lib/src/i18n/manifest.dart`, i18nManifestSource(surface, entry));
    for (const locale of ['en-US', 'zh-CN']) {
      write(
        `${packageDir}/lib/src/i18n/${locale}/iam/${token}/${token}.arb`,
        i18nFragment(surface, entry, locale),
      );
    }
    return;
  }

  if (entry.role === 'commons') {
    write(`${packageDir}/lib/src/theme/design_tokens.dart`, designTokensSource());
    write(`${packageDir}/lib/src/l10n/arb_bundle.dart`, commonsL10nBundleSource());
    write(`${packageDir}/lib/src/widgets/sdkwork_scaffold.dart`, commonsScaffoldSource());
    write(`${packageDir}/lib/src/widgets/sdkwork_error_view.dart`, commonsErrorViewSource());
    write(`${packageDir}/lib/src/widgets/sdkwork_loading_view.dart`, commonsLoadingViewSource());
    return;
  }

  if (entry.role === 'shell' || entry.role === 'console-shell' || entry.role === 'admin-shell') {
    const tier = tierOfEntry(entry);
    write(`${packageDir}/lib/src/shell/app_shell.dart`, shellSource(surface, tier));
    write(`${packageDir}/lib/src/shell/router.dart`, shellSource(surface, tier, { router: true }));
    // Section 5: "shell packages compose route contributions and layout". The
    // composition joins the tier's capability slices, and it is the shell that owns
    // it because `core` and `commons` may not depend on a capability package.
    write(`${packageDir}/lib/composition/route_composition.dart`, shellRouteCompositionSource(surface, tier, packages));
    return;
  }

  // ---- tier cores ----
  const tier = tierOfEntry(entry);
  write(`${packageDir}/lib/composition/composition.dart`, coreCompositionSource(surface, tier));
  write(`${packageDir}/lib/composition/route_registry.dart`, coreRouteRegistrySource(surface, tier));
  write(`${packageDir}/lib/composition/dependency_manifest.dart`, coreDependencyManifestSource(surface, tier));
  write(`${packageDir}/lib/composition/module_registry.dart`, coreModuleRegistrySource(surface, tier, packages));
  write(`${packageDir}/lib/composition/sdk_inventory.dart`, coreSdkInventorySource(surface, tier));
  write(`${packageDir}/lib/composition/host_registry.dart`, coreHostRegistrySource(surface, tier));
  write(`${packageDir}/lib/src/sdk/sdk_client_factory.dart`, coreSdkFactorySource(surface, tier));
  write(`${packageDir}/lib/src/session/session_store.dart`, coreSessionSource(surface, tier));
  if (tier === 'app') {
    write(`${packageDir}/lib/src/session/token_manager.dart`, coreTokenManagerSource(surface));
    write(`${packageDir}/lib/src/runtime/runtime_env.dart`, coreRuntimeEnvSource(surface));
    write(`${packageDir}/lib/src/host/host_adapter.dart`, coreHostAdapterSource(surface));
  }
}
