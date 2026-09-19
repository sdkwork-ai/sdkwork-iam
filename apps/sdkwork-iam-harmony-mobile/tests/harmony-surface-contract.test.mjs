// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Surface contract for the sdkwork-iam-harmony-mobile root.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 1, 3, 4, 5, 6, 8 and 11, and
 * `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` section 7.
 *
 * `sdkwork-specs/tools/lib/frontend-composition.mjs` scans only `.ts`, `.tsx`,
 * `.js` and `.jsx`; every ArkTS file in this root is `.ets`, so the workspace
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
const HOST_DIR = path.join(PACKAGES_DIR, 'sdkwork-iam-harmony-mobile-host');

const FAMILY_PACKAGES = [
  'sdkwork-iam-harmony-mobile-account-binding',
  'sdkwork-iam-harmony-mobile-admin-account-binding',
  'sdkwork-iam-harmony-mobile-admin-audit',
  'sdkwork-iam-harmony-mobile-admin-core',
  'sdkwork-iam-harmony-mobile-admin-oauth',
  'sdkwork-iam-harmony-mobile-admin-organization',
  'sdkwork-iam-harmony-mobile-admin-permission',
  'sdkwork-iam-harmony-mobile-admin-shell',
  'sdkwork-iam-harmony-mobile-admin-tenant',
  'sdkwork-iam-harmony-mobile-admin-user',
  'sdkwork-iam-harmony-mobile-auth',
  'sdkwork-iam-harmony-mobile-commons',
  'sdkwork-iam-harmony-mobile-console-account-binding',
  'sdkwork-iam-harmony-mobile-console-core',
  'sdkwork-iam-harmony-mobile-console-organization',
  'sdkwork-iam-harmony-mobile-console-shell',
  'sdkwork-iam-harmony-mobile-console-tenant',
  'sdkwork-iam-harmony-mobile-console-user-center',
  'sdkwork-iam-harmony-mobile-core',
  'sdkwork-iam-harmony-mobile-host',
  'sdkwork-iam-harmony-mobile-oauth',
  'sdkwork-iam-harmony-mobile-organization',
  'sdkwork-iam-harmony-mobile-shell',
  'sdkwork-iam-harmony-mobile-tenant',
  'sdkwork-iam-harmony-mobile-user',
  'sdkwork-iam-harmony-mobile-user-center',
];

/**
 * The capability packages of the family.
 *
 * Every other member is infrastructure, and the split decides which assertions
 * apply: only a capability ships locale fragments, a service/port/state/view-model
 * stack and a route contribution. `commons` in particular owns the fragment loader
 * and the i18n helpers with no locale tree of its own, so asserting "both locales"
 * against the whole family reported a defect that was not there.
 */
const INFRASTRUCTURE_SUFFIXES = ['-commons', '-core', '-shell', '-host'];
const CAPABILITY_PACKAGES = FAMILY_PACKAGES.filter(
  (name) => !INFRASTRUCTURE_SUFFIXES.some((suffix) => name.endsWith(suffix)),
);

/** The cross-client route ids of APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC section 7. */
const CROSS_CLIENT_ROUTE_IDS = [
  'admin.iam.account-binding.list',
  'admin.iam.audit.events',
  'admin.iam.oauth.providers',
  'admin.iam.organization.tree',
  'admin.iam.permission.authorizations',
  'admin.iam.permission.permissions',
  'admin.iam.permission.policies',
  'admin.iam.permission.roles',
  'admin.iam.tenant.list',
  'admin.iam.user.list',
  'app.iam.account-binding.list',
  'app.iam.auth.context-selection',
  'app.iam.auth.forgot-password',
  'app.iam.auth.login',
  'app.iam.auth.oauth-callback',
  'app.iam.auth.register',
  'app.iam.oauth.providers',
  'app.iam.organization.directory',
  'app.iam.tenant.overview',
  'app.iam.user-center.password',
  'app.iam.user-center.profile',
  'app.iam.user.list',
  'console.iam.account-binding.list',
  'console.iam.organization.directory',
  'console.iam.tenant.overview',
  'console.iam.user-center.profile',
];

const BUSINESS_SDK_RE = /(?:^|\/|@sdkwork\/)[a-z0-9-]+-(?:app|backend)-sdk(?:$|\/)/u;

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
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//gu, '');
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gmu, '');
  const specifiers = [];
  for (const match of withoutLineComments.matchAll(/\bfrom\s+['"]([^'"]+)['"]/gu)) {
    specifiers.push(match[1]);
  }
  return specifiers;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function collectQuotedKeys(source) {
  const keys = [];
  for (const match of source.matchAll(/^\s*['"]([a-zA-Z0-9_.]+)['"]\s*:/gmu)) {
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
      !rootPackageJson.dependencies || !rootPackageJson.dependencies['@sdkwork/' + 'sdkwork-iam-harmony-mobile-host'],
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
      if (name === 'sdkwork-iam-harmony-mobile-host' || /-core$/u.test(name)) continue;
      for (const file of listFiles(path.join(PACKAGES_DIR, name, 'src'), (entry) => entry.endsWith('.ets'))) {
        for (const specifier of extractImportSpecifiers(readText(file))) {
          if (/^@(?:kit|ohos)\./u.test(specifier)) {
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
      for (const match of readText(file).matchAll(/^\s*id: '([^']+)',$/gmu)) {
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
      [...generated.matchAll(/^\s*'([a-z][a-z0-9.-]+)',$/gmu)].map((match) => match[1]),
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
        const foreign = /^@sdkwork\/(sdkwork-iam-(?:h5|pc|mp|mini-program|flutter)[a-z-]*)/u.exec(specifier);
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
    assert.match(bundleName, /^com\.sdkwork\.iam\.mobile$/u, 'unexpected bundle name');
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
