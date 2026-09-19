#!/usr/bin/env node
/**
 * Resolves every ArkTS import in a HarmonyOS client root against the files on disk,
 * and every named import against the exports the target module actually declares.
 *
 * The generator emits ArkTS that no toolchain on this machine can compile — there
 * is no `hvigorw`, no `ohpm` and no DevEco Studio — so `hvigorw assembleHap` cannot
 * be the thing that catches a wrong `@sdkwork/<pkg>` name, a moved file, an import
 * of a package the owning `oh-package.json5` never declared, or a named import of a
 * symbol the target module does not export. A gate cannot run either, for the same
 * reason. This script is the substitute, and it is the same shape as
 * `tools/check-dart-imports.mjs` uses for the Flutter root.
 *
 * Three classes of defect are reported, deliberately as three classes, because they
 * have three different fixes:
 *
 *   1. unresolved   — the specifier names no file (`@sdkwork/<package>` resolved
 *                     through that package's `oh-package.json5#main`, a relative
 *                     path probed with `.ets`, `.ts`, `.json`, then the same four
 *                     as a directory `Index`/`index`).
 *   2. undeclared   — the file exists but the importing module's `oh-package.json5`
 *                     does not list the package in `dependencies`, so ohpm will not
 *                     resolve it however the disk looks.
 *   3. dangling     — the module exists and is declared, but the named import is not
 *                     one of its exports. `import { readIamHarmonySession } from
 *                     './SessionStore'` compiled against a `SessionStore.ets` that
 *                     exports `readIamHarmonyMobileCoreSession` is exactly the
 *                     failure a path-only check calls green.
 *
 * Class 3 is checked conservatively on purpose: a module that re-exports through
 * `export * from` a target that itself cannot be resolved, or that sits on an export
 * cycle, is marked *open* and every named import from it is accepted. That trades a
 * small amount of coverage for the guarantee that a reported dangling binding is a
 * real one — a checker that cries wolf on generated code gets switched off.
 *
 * Published HarmonyOS packages (`@kit.*`, `@ohos/*`, `@arkts.*`, `@system.*`,
 * `@hms.*`) are treated as external and skipped: their resolution is ohpm's job.
 *
 * Usage: node tools/check-arkts-imports.mjs --root apps/sdkwork-iam-harmony-mobile
 * Exit codes: 0 every import resolved, declared and bound; 1 at least one was not;
 * 2 usage error.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/** HarmonyOS SDK and ohpm-hosted packages resolved by the toolchain, not here. */
const EXTERNAL_PREFIXES = ['@kit.', '@ohos/', '@ohos.', '@arkts.', '@system.', '@hms.'];

/** Directories that never hold first-party source. */
const SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  'oh_modules',
  '.git',
  '.hvigor',
  '.idea',
  'build',
  'dist',
  'coverage',
]);

/** Extensions probed for an extensionless specifier, in order. */
const PROBED_EXTENSIONS = ['.ets', '.ts', '.json'];

/**
 * Specifier extraction.
 *
 * The clause is matched by shape, not by "everything up to the next quote".
 * A generated import is routinely multi-line:
 *
 *     import {
 *       clearIamHarmonyMobileCoreSession,
 *       readIamHarmonyMobileCoreSession,
 *     } from './SessionStore';
 *
 * so a pattern that refuses newlines inside the clause (`[^'"\n]*?`) silently
 * matches nothing for it. That was observed: an ablation that reintroduced the
 * historical `readIamHarmonySession` binding — and its `./SessionStore` specifier,
 * which resolves nowhere from `sdk/` — still reported OK, because the specifier was
 * never extracted. `[^}]*` spans the brace list without being able to run past the
 * closing brace, which bounds the match to the statement.
 */
const SPECIFIER_PATTERNS = [
  /(?:^|\n)\s*import\s+(?:\{[^}]*\}|\*\s+as\s+[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\}\s*)?from\s+'([^']+)'/gu,
  /(?:^|\n)\s*export\s+(?:\{[^}]*\}|\*)\s*from\s+'([^']+)'/gu,
  /(?:^|\n)\s*import\s+'([^']+)'/gu,
  /\bimport\s*\(\s*'([^']+)'\s*\)/gu,
];

/** `import { … } from '…'`, capturing the clause and the specifier. */
const NAMED_IMPORT_RE = /(?:^|\n)\s*(?:import|export)\s*\{([^}]*)\}\s*from\s*'([^']+)'/gu;

/** `import DefaultName from '…'`, but not `import { … }` and not `import * as`. */
const DEFAULT_IMPORT_RE = /(?:^|\n)\s*import\s+([A-Za-z_$][\w$]*)\s*(?:,\s*\{[^}]*\}\s*)?from\s*'([^']+)'/gu;

/**
 * Exported declarations.
 *
 * `struct` is ArkTS-only: a UI component is declared `export struct Name`, which
 * no TypeScript-shaped pattern matches. Missing it reported every imported page and
 * view component as dangling, which is 57 false positives across this root alone.
 * `@Component`, `@Entry` and the other decorators sit on their own line above the
 * declaration, so anchoring the pattern at `export` still matches them.
 */
const EXPORT_DECLARATION_RE =
  /^export\s+(?:declare\s+)?(?:default\s+)?(?:async\s+)?(?:function|const|let|var|class|interface|type|enum|struct)\s+([A-Za-z_$][\w$]*)/gmu;
const EXPORT_LIST_RE = /^export\s+(?:type\s+)?\{([^}]*)\}\s*(?:from\s*'([^']+)')?/gmu;
const EXPORT_STAR_RE = /^export\s+\*\s+from\s+'([^']+)'/gmu;
const EXPORT_DEFAULT_RE = /^export\s+default\b/gmu;

function readManifest(absolutePath) {
  const raw = fs.readFileSync(absolutePath, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `${path.relative(REPO_ROOT, absolutePath).replaceAll('\\', '/')}: not parseable as JSON (${error.message})`,
    );
  }
}

function walk(directory, out = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (SKIPPED_DIRECTORIES.has(entry.name)) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
      continue;
    }
    if (entry.name.endsWith('.ets') || entry.name.endsWith('.ts')) out.push(full);
  }
  return out;
}

/**
 * `@sdkwork/<name>` -> `{ directory, main }` for every package in the root.
 *
 * The root `oh-package.json5#dependencies` is the authoritative ohpm graph
 * (`"@sdkwork/<name>": "file:./packages/<name>"`), so it is read first; the
 * per-package manifests are read as well so the map still covers a package whose
 * entry in the root graph was dropped, which is a defect worth resolving rather
 * than a reason to mis-report every import of it as unknown.
 */
function collectPackages(root) {
  const packages = new Map();

  const add = (directory) => {
    const manifestPath = path.join(directory, 'oh-package.json5');
    if (!fs.existsSync(manifestPath)) return;
    const manifest = readManifest(manifestPath);
    if (typeof manifest.name !== 'string' || manifest.name === '') return;
    packages.set(manifest.name, {
      directory,
      main: typeof manifest.main === 'string' && manifest.main !== ''
        ? manifest.main
        : 'src/main/ets/Index.ets',
    });
  };

  const rootManifestPath = path.join(root, 'oh-package.json5');
  if (fs.existsSync(rootManifestPath)) {
    const dependencies = readManifest(rootManifestPath).dependencies ?? {};
    for (const target of Object.values(dependencies)) {
      if (typeof target !== 'string' || !target.startsWith('file:')) continue;
      add(path.resolve(root, target.slice('file:'.length)));
    }
  }

  const packageRoot = path.join(root, 'packages');
  if (fs.existsSync(packageRoot)) {
    for (const entry of fs.readdirSync(packageRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) add(path.join(packageRoot, entry.name));
    }
  }

  return packages;
}

/**
 * The `oh-package.json5` that owns a source file, and the directory it governs.
 *
 * ohpm resolves a module's dependencies from the manifest of the *module* the file
 * belongs to: `entry/` is its own module with its own manifest, each `packages/<x>/`
 * is its own HAR, and anything above them belongs to the root manifest.
 */
function owningManifest(root, file) {
  const relative = path.relative(root, file).replaceAll('\\', '/');
  if (relative.startsWith('entry/')) {
    return { label: 'entry', manifestPath: path.join(root, 'entry', 'oh-package.json5') };
  }
  if (relative.startsWith('packages/')) {
    const name = relative.split('/')[1];
    return {
      label: `packages/${name}`,
      manifestPath: path.join(root, 'packages', name, 'oh-package.json5'),
    };
  }
  return { label: '.', manifestPath: path.join(root, 'oh-package.json5') };
}

function isExternal(specifier) {
  return EXTERNAL_PREFIXES.some((prefix) => specifier.startsWith(prefix));
}

function probe(basePath) {
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) return basePath;
  for (const extension of PROBED_EXTENSIONS) {
    if (fs.existsSync(basePath + extension)) return basePath + extension;
  }
  for (const indexName of ['Index', 'index']) {
    for (const extension of PROBED_EXTENSIONS) {
      const candidate = path.join(basePath, indexName + extension);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

/** Strips block and line comments so a commented-out export is not counted. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .replace(/^[ \t]*\/\/.*$/gmu, '');
}

/**
 * Exports of one module, memoized.
 *
 * `open` means "this module re-exports through a target that could not be resolved,
 * or participates in an export cycle", so the caller must not assume an absent name
 * is really absent.
 */
function moduleExports(absolutePath, resolveRelative, cache, visiting) {
  if (cache.has(absolutePath)) return cache.get(absolutePath);
  if (visiting.has(absolutePath)) return { names: new Set(), open: true };

  const nextVisiting = new Set(visiting);
  nextVisiting.add(absolutePath);

  const text = stripComments(fs.readFileSync(absolutePath, 'utf8'));
  const names = new Set();
  let open = false;

  for (const match of text.matchAll(EXPORT_DECLARATION_RE)) names.add(match[1]);
  if (EXPORT_DEFAULT_RE.test(text)) names.add('default');
  EXPORT_DEFAULT_RE.lastIndex = 0;

  for (const match of text.matchAll(EXPORT_LIST_RE)) {
    for (const part of match[1].split(',')) {
      const trimmed = part.trim();
      if (trimmed === '') continue;
      const aliased = /\bas\s+([A-Za-z_$][\w$]*)$/u.exec(trimmed);
      if (aliased) {
        names.add(aliased[1]);
        continue;
      }
      names.add(trimmed.replace(/^type\s+/u, '').trim());
    }
    // A `from` clause re-exports a binding the target already declares; the names
    // in the braces are what this module exposes either way.
  }

  for (const match of text.matchAll(EXPORT_STAR_RE)) {
    const target = resolveRelative(match[1], path.dirname(absolutePath));
    if (!target) {
      open = true;
      continue;
    }
    const nested = moduleExports(target, resolveRelative, cache, nextVisiting);
    if (nested.open) open = true;
    for (const name of nested.names) names.add(name);
  }

  const result = { names, open };
  cache.set(absolutePath, result);
  return result;
}

/** Named bindings of one import clause, with aliases and `type` markers removed. */
function namedBindings(clause) {
  const bindings = [];
  for (const part of clause.split(',')) {
    const trimmed = part.trim().replace(/^type\s+/u, '');
    if (trimmed === '') continue;
    const aliased = /^([A-Za-z_$][\w$]*)\s+as\s+[A-Za-z_$][\w$]*$/u.exec(trimmed);
    bindings.push(aliased ? aliased[1] : trimmed);
  }
  return bindings;
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
  const fileSet = new Set(files.map((file) => path.resolve(file)));
  const unresolved = [];
  const undeclared = [];
  const dangling = [];
  let internalImports = 0;

  const manifestCache = new Map();
  const declarationsOf = (manifestPath) => {
    if (manifestCache.has(manifestPath)) return manifestCache.get(manifestPath);
    const declared = fs.existsSync(manifestPath)
      ? new Set(Object.keys(readManifest(manifestPath).dependencies ?? {}))
      : new Set();
    manifestCache.set(manifestPath, declared);
    return declared;
  };

  /** Absolute path a specifier names, or `null`. Also reports why through `detail`. */
  const resolveSpecifier = (specifier, fromDirectory) => {
    if (isExternal(specifier)) return null;
    if (specifier.startsWith('@sdkwork/')) {
      const withoutScope = specifier.slice('@sdkwork/'.length);
      const slash = withoutScope.indexOf('/');
      const packageName = slash === -1 ? withoutScope : withoutScope.slice(0, slash);
      const within = slash === -1 ? null : withoutScope.slice(slash + 1);
      const entry = packages.get(`@sdkwork/${packageName}`);
      if (!entry) return null;
      const base = within === null
        ? path.resolve(entry.directory, entry.main)
        : path.resolve(entry.directory, within);
      return probe(base);
    }
    if (!specifier.startsWith('.') && !specifier.startsWith('/')) return null;
    return probe(path.resolve(fromDirectory, specifier));
  };

  const exportsCache = new Map();
  const exportsOf = (absolutePath) =>
    moduleExports(absolutePath, resolveSpecifier, exportsCache, new Set());

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const relativeFile = path.relative(REPO_ROOT, file).replaceAll('\\', '/');
    const owner = owningManifest(root, file);
    const declared = declarationsOf(owner.manifestPath);

    const seen = new Set();
    for (const pattern of SPECIFIER_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        const specifier = match[1];
        if (seen.has(specifier)) continue;
        seen.add(specifier);
        if (isExternal(specifier)) continue;

        if (specifier.startsWith('@sdkwork/')) {
          const withoutScope = specifier.slice('@sdkwork/'.length);
          const slash = withoutScope.indexOf('/');
          const packageName = slash === -1 ? withoutScope : withoutScope.slice(0, slash);
          const fullName = `@sdkwork/${packageName}`;
          const entry = packages.get(fullName);
          if (!entry) {
            unresolved.push({
              relativeFile,
              specifier,
              reason: `package ${fullName} is not a package of this root`,
            });
            continue;
          }
          internalImports += 1;
          // A package may always import itself; that needs no declaration.
          const selfImport = owner.manifestPath === path.join(entry.directory, 'oh-package.json5');
          if (!selfImport && !declared.has(fullName)) {
            undeclared.push({ relativeFile, specifier, owner: owner.label });
          }
        } else if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
          unresolved.push({
            relativeFile,
            specifier,
            reason: 'bare specifier that is neither a relative path nor a first-party @sdkwork package',
          });
          continue;
        } else {
          internalImports += 1;
        }

        if (!resolveSpecifier(specifier, path.dirname(file))) {
          unresolved.push({
            relativeFile,
            specifier,
            reason: `missing file ${path.join(path.dirname(file), specifier).replaceAll('\\', '/')}`,
          });
        }
      }
    }

    // ---- binding-level check ----
    for (const match of text.matchAll(NAMED_IMPORT_RE)) {
      const bindings = namedBindings(match[1]);
      if (bindings.length === 0) continue;
      const target = resolveSpecifier(match[2], path.dirname(file));
      if (!target || !fileSet.has(path.resolve(target))) continue;
      if (target.endsWith('.json')) continue;
      const known = exportsOf(target);
      if (known.open) continue;
      for (const binding of bindings) {
        if (binding === 'default' || known.names.has(binding)) continue;
        dangling.push({ relativeFile, specifier: match[2], binding });
      }
    }
    for (const match of text.matchAll(DEFAULT_IMPORT_RE)) {
      const target = resolveSpecifier(match[2], path.dirname(file));
      if (!target || !fileSet.has(path.resolve(target))) continue;
      if (target.endsWith('.json')) continue;
      const known = exportsOf(target);
      if (known.open || known.names.has('default')) continue;
      dangling.push({ relativeFile, specifier: match[2], binding: 'default' });
    }
  }

  const problems = unresolved.length + undeclared.length + dangling.length;
  if (problems === 0) {
    process.stdout.write(
      `OK  ${path.relative(REPO_ROOT, root).replaceAll('\\', '/')}: ${files.length} ArkTS files, `
      + `${internalImports} internal import(s), every one resolved, declared and bound\n`,
    );
    return 0;
  }

  const byFile = new Map();
  const push = (relativeFile, text) => {
    const list = byFile.get(relativeFile) ?? [];
    list.push(text);
    byFile.set(relativeFile, list);
  };
  for (const item of unresolved) push(item.relativeFile, `${item.specifier}  ->  ${item.reason}`);
  for (const item of undeclared) {
    push(item.relativeFile, `${item.specifier}  ->  not declared in ${item.owner}/oh-package.json5 dependencies`);
  }
  for (const item of dangling) {
    push(item.relativeFile, `${item.specifier}  ->  no export named '${item.binding}'`);
  }

  process.stdout.write(
    `FAIL  ${unresolved.length} unresolved specifier(s), ${undeclared.length} undeclared package import(s) `
    + `and ${dangling.length} dangling binding(s) in ${byFile.size} file(s)\n`,
  );
  for (const [file, items] of [...byFile.entries()].sort()) {
    process.stdout.write(`  ${file}\n`);
    for (const item of items) process.stdout.write(`      ${item}\n`);
  }
  return 1;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}
