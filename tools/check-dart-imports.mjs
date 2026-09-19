#!/usr/bin/env node
/**
 * Resolves every Dart `import` in a client root against the files on disk, and checks
 * that the package graph between those files still obeys `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md`
 * section 5.
 *
 * The generator emits Dart that no toolchain on this machine can compile — there
 * is no `dart` and no `flutter` binary — so `dart analyze` cannot be the thing
 * that catches a wrong `package:` name or a moved file. A gate cannot run
 * either, for the same reason. This script is the substitute: it is the cheapest
 * check that still fails when a path in the generated graph does not exist, which
 * is the class of defect generation actually produces (a template writing
 * `lib/routes/routes.dart` while the writer emits `lib/bootstrap/routes.dart`
 * compiles nowhere and looks fine in a diff).
 *
 * It resolves, and reports as unresolved:
 *   - `package:<root>/<path>` against `<root>/lib/<path>`
 *   - `package:<workspace package>/<path>` against that package's `lib/<path>`,
 *     with the package directory discovered in this root, then in the
 *     `pubspec.yaml` path dependencies of the root
 *   - relative specifiers against the importing file
 *
 * Published packages (`flutter`, `intl`, the `lints` family, …) are treated as
 * external and skipped: their resolution is `pub`'s job, not this script's.
 *
 * It also fails the §5 layering rules the Dart family has no other toolchain-free
 * witness for:
 *   - `core` and `commons` `MUST NOT` depend on a capability package
 *   - the dependency graph `MUST NOT` contain a cycle
 * The tier shell is deliberately allowed to import capability packages: section 4 gives
 * the shell "route contribution assembly" and section 5 states that "shell packages
 * compose route contributions and layout". The ArkTS root carries the same two rules in
 * `tests/harmony-surface-contract.test.mjs`; this is the Dart half of that pair.
 *
 * Usage: node tools/check-dart-imports.mjs --root apps/sdkwork-iam-flutter-mobile
 * Exit codes: 0 every import resolved and the graph compliant, 1 otherwise, 2 usage error.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/** Packages resolved by `pub`, not by this repository. */
const EXTERNAL_PACKAGES = new Set([
  'flutter',
  'flutter_test',
  'flutter_localizations',
  'flutter_lints',
  'flutter_secure_storage',
  'shared_preferences',
  'url_launcher',
  'app_links',
  'intl',
  'lints',
  'test',
  'meta',
  'collection',
  'path',
  'http',
  'async',
  'characters',
  'cupertino_icons',
  'integration_test',
]);

const IMPORT_RE = /^\s*(?:import|export)\s+'([^']+)'\s*(?:as\s+\w+\s*)?(?:show|hide|if\s*\(|;)/gmu;

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.dart_tool') continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.dart')) out.push(full);
  }
  return out;
}

/** Package name -> absolute `lib/` directory, from the root and every `pubspec.yaml`
 * path dependency reachable from it.
 */
function collectPackages(root) {
  const packages = new Map();

  const readPubspecName = (file) => {
    if (!fs.existsSync(file)) return null;
    const match = /^name:\s*(\S+)\s*$/mu.exec(fs.readFileSync(file, 'utf8'));
    return match ? match[1] : null;
  };

  const readPathDependencies = (file) => {
    if (!fs.existsSync(file)) return [];
    const text = fs.readFileSync(file, 'utf8');
    const deps = [];
    for (const match of text.matchAll(/^\s{2}([a-z_][a-z0-9_]*):\s*\n\s{4}path:\s*(\S+)\s*$/gmu)) {
      deps.push({ name: match[1], target: path.resolve(path.dirname(file), match[2]) });
    }
    return deps;
  };

  const rootName = readPubspecName(path.join(root, 'pubspec.yaml'));
  if (rootName) packages.set(rootName, path.join(root, 'lib'));

  const packageRoot = path.join(root, 'packages');
  if (fs.existsSync(packageRoot)) {
    for (const entry of fs.readdirSync(packageRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const directory = path.join(packageRoot, entry.name);
      const name = readPubspecName(path.join(directory, 'pubspec.yaml'));
      if (name) packages.set(name, path.join(directory, 'lib'));
    }
  }

  // One level of path dependencies, which is where the generated SDKs live.
  for (const source of [path.join(root, 'pubspec.yaml'), ...fs.existsSync(packageRoot)
    ? fs.readdirSync(packageRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(packageRoot, entry.name, 'pubspec.yaml'))
    : []]) {
    for (const dependency of readPathDependencies(source)) {
      if (packages.has(dependency.name)) continue;
      if (!fs.existsSync(dependency.target)) continue;
      packages.set(dependency.name, path.join(dependency.target, 'lib'));
    }
  }

  return packages;
}

/**
 * Infrastructure role of a package directory name, or `null` for a capability.
 *
 * Derived from the suffix rather than from a per-family table so the rule survives a
 * new package segment: `sdkwork_iam_flutter_mobile_core`,
 * `sdkwork_iam_flutter_mobile_console_core` and a future `..._admin_core` are all cores.
 */
function infrastructureRole(packageName) {
  for (const role of ['core', 'commons', 'shell', 'host']) {
    if (packageName.endsWith(`_${role}`) || packageName.endsWith(`-${role}`)) return role;
  }
  return null;
}

/**
 * §5 layering and acyclicity over the in-root package graph.
 *
 * Only edges between packages of this root are considered; an edge to a generated SDK
 * package is external and its placement is governed by section 6, not by this rule.
 */
function checkDependencyDirection(root, packages, rootPackageName, edgesByName) {
  const issues = [];
  const inRoot = new Set([...packages.keys()].filter((name) => name !== rootPackageName));

  for (const [from, toSet] of edgesByName) {
    if (!inRoot.has(from)) continue;
    const role = infrastructureRole(from);
    if (role !== 'core' && role !== 'commons') continue;
    for (const to of [...toSet].sort()) {
      if (!inRoot.has(to)) continue;
      if (infrastructureRole(to) === null) {
        issues.push({
          kind: 'layering',
          detail: `${from} (${role}) imports ${to}, a capability package; section 5 forbids core and commons from depending on a capability package`,
        });
      }
    }
  }

  const visiting = new Set();
  const done = new Set();
  const walk = (node, trail) => {
    if (done.has(node)) return;
    if (visiting.has(node)) {
      issues.push({
        kind: 'cycle',
        detail: `cyclic package dependency: ${[...trail, node].join(' -> ')}`,
      });
      return;
    }
    visiting.add(node);
    for (const next of edgesByName.get(node) ?? []) {
      if (inRoot.has(next)) walk(next, [...trail, node]);
    }
    visiting.delete(node);
    done.add(node);
  };
  for (const node of [...inRoot].sort()) walk(node, []);

  return issues;
}

function main(argv) {
  let root = null;
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--root') {
      root = path.resolve(REPO_ROOT, argv[index + 1] ?? '');
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argv[index]}`);
  }
  if (!root || !fs.existsSync(root)) throw new Error('--root <dir> is required and must exist');

  const packages = collectPackages(root);
  const files = walk(root);
  const unresolved = [];
  const edgesByName = new Map();

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(REPO_ROOT, file).replaceAll('\\', '/');
    const owner = [...packages.entries()]
      .filter(([, libRoot]) => file === libRoot || file.startsWith(`${libRoot}${path.sep}`))
      .sort((left, right) => right[1].length - left[1].length)[0]?.[0] ?? null;
    for (const match of text.matchAll(IMPORT_RE)) {
      const specifier = match[1];
      if (specifier.startsWith('dart:')) continue;
      if (specifier.startsWith('package:')) {
        const withoutScheme = specifier.slice('package:'.length);
        const slash = withoutScheme.indexOf('/');
        if (slash === -1) {
          unresolved.push({ relativeFile, specifier, reason: 'package specifier has no path part' });
          continue;
        }
        const packageName = withoutScheme.slice(0, slash);
        const within = withoutScheme.slice(slash + 1);
        if (EXTERNAL_PACKAGES.has(packageName)) continue;
        if (owner !== null && owner !== packageName) {
          const toSet = edgesByName.get(owner) ?? new Set();
          toSet.add(packageName);
          edgesByName.set(owner, toSet);
        }
        const libRoot = packages.get(packageName);
        if (!libRoot) {
          unresolved.push({ relativeFile, specifier, reason: `package ${packageName} is not a dependency of this root` });
          continue;
        }
        const target = path.join(libRoot, within);
        if (!fs.existsSync(target)) {
          unresolved.push({ relativeFile, specifier, reason: `missing file ${path.relative(REPO_ROOT, target).replaceAll('\\', '/')}` });
        }
        continue;
      }
      const target = path.resolve(path.dirname(file), specifier);
      if (!fs.existsSync(target)) {
        unresolved.push({ relativeFile, specifier, reason: `missing file ${path.relative(REPO_ROOT, target).replaceAll('\\', '/')}` });
      }
    }
  }

  const rootPackageName = [...packages.entries()]
    .find(([, libRoot]) => libRoot === path.join(root, 'lib'))?.[0] ?? null;
  const layering = checkDependencyDirection(root, packages, rootPackageName, edgesByName);
  const relativeRoot = path.relative(REPO_ROOT, root).replaceAll('\\', '/');

  if (unresolved.length === 0 && layering.length === 0) {
    process.stdout.write(
      `OK  ${relativeRoot}: ${files.length} Dart files, every import resolved, ` +
        `dependency direction compliant across ${edgesByName.size} package(s)\n`,
    );
    return 0;
  }

  if (unresolved.length > 0) {
    const byFile = new Map();
    for (const item of unresolved) {
      const list = byFile.get(item.relativeFile) ?? [];
      list.push(item);
      byFile.set(item.relativeFile, list);
    }
    process.stdout.write(`FAIL  ${unresolved.length} unresolved Dart import(s) in ${byFile.size} file(s)\n`);
    for (const [file, items] of [...byFile.entries()].sort()) {
      process.stdout.write(`  ${file}\n`);
      for (const item of items) process.stdout.write(`      ${item.specifier}  ->  ${item.reason}\n`);
    }
  }

  if (layering.length > 0) {
    process.stdout.write(`FAIL  ${layering.length} dependency-direction violation(s) in ${relativeRoot}\n`);
    for (const item of layering) process.stdout.write(`  [${item.kind}] ${item.detail}\n`);
  }

  return 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
