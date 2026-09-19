/**
 * Shared file-emission helpers for the client app surface generator.
 *
 * Two decisions are deliberate and were learned the hard way:
 *
 * 1. `write()` **overwrites**. A writer that skips existing files (`if exists
 *    return`) silently keeps stale route registries when the route table grows,
 *    so a re-run after a model change would look successful and change nothing.
 * 2. Text templates detect the line ending of an existing neighbouring file
 *    instead of assuming `\n`. These repositories are mixed CRLF/LF, and a `\n`
 *    anchor in an `old_string` match simply fails.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Banner stamped onto every generated file.
 *
 * The regeneration hint deliberately names the script by path instead of a
 * `pnpm <namespace>:<verb>` form: `check-pnpm-script-standard.mjs` scans the
 * banner text in documentation and runner scripts, and `client-app-surfaces` is
 * not a standard public script namespace, so a pnpm-shaped hint fails the gate
 * from every generated file that carries it.
 */
export const GENERATED_BANNER =
  '<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->';

/**
 * @param {{now?: () => number}} [deps]
 */
export function createWriter() {
  const created = [];
  const updated = [];
  const unchanged = [];
  const skipped = [];

  /**
   * @param {string} absolutePath
   * @param {string} content
   * @param {{ifMissing?: boolean, eol?: '\n' | '\r\n'}} [options]
   *   `ifMissing` preserves an authored file the generator must not claim.
   *   `eol` keeps mirrored files on the line ending their template used.
   */
  function write(absolutePath, content, options = {}) {
    const { ifMissing = false, eol = '\n' } = options;
    const normalized = content.replace(/\r\n/gu, '\n');
    const terminated = normalized.endsWith('\n') ? normalized : `${normalized}\n`;
    const rendered = eol === '\n' ? terminated : terminated.replace(/\n/gu, eol);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    const existed = fs.existsSync(absolutePath);
    if (existed) {
      if (ifMissing) {
        skipped.push(absolutePath);
        return false;
      }
      const previous = fs.readFileSync(absolutePath, 'utf8');
      if (previous === rendered) {
        unchanged.push(absolutePath);
        return false;
      }
      fs.writeFileSync(absolutePath, rendered, 'utf8');
      updated.push(absolutePath);
      return true;
    }
    fs.writeFileSync(absolutePath, rendered, 'utf8');
    created.push(absolutePath);
    return true;
  }

  function writeJson(absolutePath, value, options = {}) {
    return write(absolutePath, `${JSON.stringify(value, null, 2)}\n`, options);
  }

  /**
   * Extend an existing file with the generated `export *` statements it lacks,
   * leaving every authored statement byte-for-byte intact.
   *
   * Needed for entry files the generator must *wire* but must not *own*: an
   * authored package entry belongs to the author, yet the surface is not
   * assembled unless the generated route/SDK/host/session entries are reachable
   * from it. Replacing such a file would delete the author's exports; skipping
   * it leaves the generated entries unreachable. Appending is the only move that
   * does neither.
   *
   * Idempotent, and specifier-normalized so an authored `from "./i18n"` and a
   * generated `from './i18n/index.js'` are recognised as the same edge instead
   * of producing a duplicate statement.
   */
  function extendExports(absolutePath, content, options = {}) {
    const { ifMissing = false } = options;
    if (!fs.existsSync(absolutePath)) return write(absolutePath, content, options);
    if (ifMissing) {
      skipped.push(absolutePath);
      return false;
    }
    const previous = fs.readFileSync(absolutePath, 'utf8');
    const seen = new Set(
      [
        // `export { a } from './x'` / `export * from './x'` — TypeScript and Dart.
        ...previous.matchAll(/from\s+['"]([^'"]+)['"]/gu),
        // `export './x.dart';` / `export './x.dart' show A;` — Dart has no `from`
        // clause, so the specifier sits directly after `export`. Without this arm
        // every Dart re-export would look absent and be appended on every run.
        ...previous.matchAll(/^\s*export\s+['"]([^'"]+)['"]/gmu),
      ].map((match) => normalizeModuleSpecifier(match[1])),
    );
    const additions = [];
    for (const match of content.matchAll(
      /^export \* from '([^']+)';$|^export\s+'([^']+)'[^;]*;$|^export\s+"([^"]+)"[^;]*;$/gmu,
    )) {
      const specifier = match[1] ?? match[2] ?? match[3];
      const normalized = normalizeModuleSpecifier(specifier);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      additions.push(match[0]);
    }
    if (additions.length === 0) {
      unchanged.push(absolutePath);
      return false;
    }
    const eol = previous.includes('\r\n') ? '\r\n' : '\n';
    const base = previous.endsWith('\n') ? previous : `${previous}${eol}`;
    fs.writeFileSync(absolutePath, `${base}${additions.join(eol)}${eol}`, 'utf8');
    updated.push(absolutePath);
    return true;
  }

  return { write, writeJson, extendExports, created, updated, unchanged, skipped };
}

/**
 * Canonical form of a relative module specifier, so `./i18n`, `./i18n/index.js`
 * and `./i18n/index.ts` are one edge rather than three.
 */
export function normalizeModuleSpecifier(value) {
  return value
    .replace(/^\.\//u, '')
    .replace(/\.(?:js|jsx|ts|tsx|mjs|cjs|dart|ets)$/u, '')
    .replace(/\/index$/u, '');
}

/** Line ending used by the surrounding tree, so generated files do not churn. */
export function detectEol(directory, defaultEol = '\n') {
  try {
    if (!fs.existsSync(directory)) return defaultEol;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!/\.(?:ts|tsx|js|json|md|ets|dart|yaml|yml)$/u.test(entry.name)) continue;
      const text = fs.readFileSync(path.join(directory, entry.name), 'utf8');
      return text.includes('\r\n') ? '\r\n' : '\n';
    }
  } catch {
    return defaultEol;
  }
  return defaultEol;
}

/** Replace every `export { a, b } from './x';` statement wholesale. */
export const EXPORT_STATEMENT_RE =
  /^[ \t]*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+'(\.\/[^']+)';?[ \t]*\r?\n?/gmu;

export function toPosix(value) {
  return value.replaceAll('\\', '/');
}

/**
 * The write-through layer every surface emitter shares.
 *
 * The hard part of generating into a repository that already carries authored
 * code is deciding, per file, whether the generator owns it. That decision is the
 * same for TypeScript, Dart and ArkTS packages, so it lives here instead of being
 * re-derived (and eventually re-derived differently) in each emitter.
 *
 * The rules, in order:
 *
 * 1. A file outside a pre-existing package is always this generator's to write.
 * 2. Inside a pre-existing package, `generatorOwnedRelative` wins outright — a
 *    *committed* copy of a generator artifact would otherwise freeze forever.
 * 3. Otherwise the git index decides: committed means authored, uncommitted means
 *    this generator's. When the index is unreadable every file counts as authored,
 *    because overwriting authored work is worse than skipping a write.
 *
 * `writeEntry` adds the one case where "replace" and "skip" are both wrong: a
 * package entry file the generator must wire but must not own. See
 * `createWriter().extendExports`.
 *
 * @param {{
 *   appRoot: string,
 *   repoRoot: string,
 *   writer: ReturnType<typeof createWriter>,
 *   authoredFiles?: Set<string> | null,
 *   preExistingPackageDirs?: Iterable<string>,
 *   generatorOwnedRelative?: RegExp[],
 * }} options
 */
export function createSurfaceWriter({
  appRoot,
  repoRoot,
  writer,
  authoredFiles = null,
  preExistingPackageDirs = [],
  generatorOwnedRelative = [],
  dryRun = false,
}) {
  const preExisting = [...preExistingPackageDirs];

  /**
   * Absolute paths this surface produced.
   *
   * `--dry-run` used to be honoured by the skeleton mirror alone, so an emitter
   * that ignored it populated the target root while the report still said
   * "nothing written" — precisely the defect `emit-mirror.mjs` documents having
   * been fixed once already. The check therefore lives in this layer, which every
   * emitter writes through, rather than in each emitter, where the next one can
   * forget it again.
   *
   * A real run records the same paths instead of leaving the list empty. It has to:
   * `pruneGeneratedFiles` uses "what this run produced" as its keep-set, and an
   * empty keep-set on a real run deletes the tree the emitter just wrote. That
   * defect was observed — 363 freshly written files removed in one pass — so the
   * list is now populated on both paths.
   */
  const planned = [];
  const plan = (absolutePath) => {
    planned.push(absolutePath);
    return false;
  };

  /** Path of `absolutePath` relative to the repository root, POSIX-separated. */
  const rel = (absolutePath) => toPosix(path.relative(repoRoot, absolutePath));

  const inPreExistingPackage = (absolutePath) =>
    preExisting.some((dir) => rel(absolutePath).startsWith(`${dir}/`));

  /** `true` when `absolutePath` is authored work this generator must not claim. */
  const shouldPreserve = (absolutePath) => {
    if (!inPreExistingPackage(absolutePath)) return false;
    const relative = rel(absolutePath).replace(/^apps\/[^/]+\/packages\/[^/]+\//u, '');
    if (generatorOwnedRelative.some((pattern) => pattern.test(relative))) return false;
    if (authoredFiles === null) return true;
    return authoredFiles.has(rel(absolutePath));
  };

  const preserveOption = (absolutePath) => ({ ifMissing: shouldPreserve(absolutePath) });

  /**
   * Write a file relative to the app root.
   *
   * This is the *preserving* variant, and it is the only one: root scaffolding
   * always lands outside a pre-existing package (so the authored check never
   * fires there), and inside one the rules above decide. A raw overwrite helper
   * briefly existed during an early refactor and immediately destroyed the four
   * authored `h5-<capability>/README.md` files, so a caller that wants to bypass
   * the authored check is not given a means to.
   */
  const write = (relativePath, content, options = {}) => {
    const absolute = path.join(appRoot, relativePath);
    if (dryRun) return plan(absolute);
    planned.push(absolute);
    return writer.write(absolute, content, { ...preserveOption(absolute), ...options });
  };

  const writeJson = (relativePath, value) => {
    const absolute = path.join(appRoot, relativePath);
    if (dryRun) return plan(absolute);
    planned.push(absolute);
    return writer.writeJson(absolute, value, preserveOption(absolute));
  };

  /**
   * Wire a package entry file without ever deleting authored statements.
   *
   * Inside a pre-existing package the file is *extended*; elsewhere it is written
   * whole. Replacing an authored entry drops the author's exports, and skipping it
   * leaves the generated entries unreachable, so appending is the only move that
   * does neither.
   */
  const writeEntry = (relativePath, content) => {
    const absolute = path.join(appRoot, relativePath);
    if (dryRun) return plan(absolute);
    if (inPreExistingPackage(absolute) && fs.existsSync(absolute)) {
      planned.push(absolute);
      return writer.extendExports(absolute, content);
    }
    return write(relativePath, content);
  };

  /**
   * Write a JSON file inside a pre-existing package by merging it with whatever is
   * already there, so authored metadata survives and generated keys still land.
   *
   * The result is written *unconditionally* — not through `writeJson` above.
   * `merge` has already kept every authored key, so re-applying the authored
   * check here would discard the merge for exactly the manifests it exists for:
   * a pre-existing `package.json` is committed (authored by the index rule) yet
   * is also this generator's to conform, and skipping it would freeze generated
   * script/export additions out of the manifest forever.
   *
   * @param {(previous: any, generated: any) => any} merge
   */
  const writeMergedJson = (relativePath, generated, merge) => {
    const absolute = path.join(appRoot, relativePath);
    if (dryRun) return plan(absolute);
    planned.push(absolute);
    if (!inPreExistingPackage(absolute) || !fs.existsSync(absolute)) {
      return writer.writeJson(absolute, generated);
    }
    let previous;
    try {
      previous = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    } catch {
      return writer.writeJson(absolute, generated);
    }
    return writer.writeJson(absolute, merge(previous, generated));
  };

  /**
   * Same contract as `writeMergedJson` for a non-JSON manifest.
   *
   * A pre-existing Dart package carries an authored `pubspec.yaml`: its
   * description is prose and its `dev_dependencies` decide which test runner the
   * authored tests already import. Replacing the whole file destroys both, while
   * skipping it leaves a package that now contains Flutter widgets with no
   * Flutter dependency at all. `merge` is therefore handed the raw previous text
   * and must union the two documents; it never sees a file it did not ask for.
   *
   * Written unconditionally for the same reason as `writeMergedJson`: the merge
   * already preserved every authored key, so re-applying the authored check here
   * would discard the union for exactly the manifests it exists for.
   *
   * @param {(previous: string, generated: string) => string} merge
   */
  const writeMergedText = (relativePath, generated, merge) => {
    const absolute = path.join(appRoot, relativePath);
    if (dryRun) return plan(absolute);
    planned.push(absolute);
    if (!inPreExistingPackage(absolute) || !fs.existsSync(absolute)) {
      return writer.write(absolute, generated);
    }
    let previous;
    try {
      previous = fs.readFileSync(absolute, 'utf8');
    } catch {
      return writer.write(absolute, generated);
    }
    return writer.write(absolute, merge(previous, generated));
  };

  return {
    rel,
    inPreExistingPackage,
    shouldPreserve,
    write,
    writeJson,
    writeEntry,
    writeMergedJson,
    writeMergedText,
    dryRun,
    planned,
  };
}

/**
 * Marker every generated file carries, in both comment flavours.
 *
 * Matched on the marker text alone so the `//`, `<!-- -->` and any future comment
 * syntax are one rule. Deriving it from `GENERATED_BANNER` keeps the stamp and the
 * detector from drifting apart.
 */
export const GENERATED_MARKER = 'SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand';

/** Directories a prune never descends into; they never hold generated source. */
const PRUNE_SKIPPED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  'oh_modules',
  'build',
  '.hvigor',
  '.idea',
  'unpackage',
  'dist',
  'coverage',
  '.dart_tool',
]);

/**
 * Deletes generated files under `appRoot` that the current plan no longer emits.
 *
 * A writer that only writes is a generator that accumulates: renaming a module,
 * moving the route registry out of the core, or dropping a package leaves the old
 * file on disk, still carrying the generated banner and still reachable by any
 * import that was not updated. Nothing catches that — the file compiles, the gate
 * passes, and the dead copy drifts from its replacement until someone reads it.
 * Pruning on every run is the only way a generated tree stays equal to the model.
 *
 * The authority rule is deliberately narrow: a file is removed only when it
 * carries the generated marker **and** is absent from the expected set. An
 * authored file in the same tree is never a candidate, so an incomplete plan
 * cannot destroy work — it can only leave generated debris behind, which the next
 * run removes.
 *
 * @param {{
 *   appRoot: string,
 *   expected: Iterable<string>,
 * }} options
 * @returns {string[]} absolute paths removed, sorted
 */
export function pruneGeneratedFiles({ appRoot, expected }) {
  if (!fs.existsSync(appRoot)) return [];
  const keep = new Set([...expected].map((absolute) => path.resolve(absolute)));
  const removed = [];
  const visited = [];

  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (PRUNE_SKIPPED_DIRECTORIES.has(entry.name)) continue;
        walk(full);
        visited.push(full);
        continue;
      }
      if (keep.has(path.resolve(full))) continue;
      let head;
      try {
        head = fs.readFileSync(full, 'utf8').slice(0, 4096);
      } catch {
        continue;
      }
      if (!head.includes(GENERATED_MARKER)) continue;
      fs.rmSync(full);
      removed.push(full);
    }
  };

  walk(appRoot);

  // Bottom-up, so a directory emptied by the pass above is collected too while a
  // directory that still holds anything survives. Deepest paths first.
  for (const directory of visited.sort((left, right) => right.length - left.length)) {
    try {
      if (fs.readdirSync(directory).length === 0) fs.rmdirSync(directory);
    } catch {
      // A directory that vanished or refused to be read is not a prune failure.
    }
  }

  return removed.sort();
}

export function relativeFrom(appRoot, absolutePath) {
  return toPosix(path.relative(appRoot, absolutePath));
}

/** Deterministic key ordering keeps regenerated JSON stable. */
export function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep(value[key])]),
    );
  }
  return value;
}
