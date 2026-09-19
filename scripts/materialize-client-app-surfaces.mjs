#!/usr/bin/env node
/**
 * Materializes the SDKWork IAM client application roots.
 *
 * Two stages per surface:
 *
 * 1. **Skeleton mirror** — copy the gate-passing structural skeleton from the
 *    known-good sibling roots in `sdkwork-im/apps/*`, with identity-token
 *    substitution. See `TEMPLATE_ROOT_NAMES` and `REGENERATED_PATH_PATTERNS` in
 *    `lib/client-app-surfaces/model.mjs`.
 * 2. **Regeneration** — re-emit every identity-bearing, content-bearing and
 *    package-family file from the IAM model, so nothing im-specific survives.
 *
 * Usage:
 *
 *   node scripts/materialize-client-app-surfaces.mjs --surfaces h5,mp
 *   node scripts/materialize-client-app-surfaces.mjs --dry-run
 *   node scripts/materialize-client-app-surfaces.mjs --surfaces harmony --template-repo sdkwork-im
 *
 * Exit codes: 0 success, 1 usage error, 2 a surface could not be materialized.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { SURFACES, TEMPLATE_REPO, packagesForSurface, surfaceByKey } from './lib/client-app-surfaces/model.mjs';
import { createWriter, pruneGeneratedFiles } from './lib/client-app-surfaces/emit-common.mjs';
import { mirrorSkeleton } from './lib/client-app-surfaces/emit-mirror.mjs';
import { materializeTsSurface } from './lib/client-app-surfaces/emit-ts-surface.mjs';
import { materializeDartSurface } from './lib/client-app-surfaces/emit-dart-surface.mjs';
import { materializeArktsSurface } from './lib/client-app-surfaces/emit-arkts-surface.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

/**
 * Package-family emitter per surface, selected by the surface's language family.
 *
 * A surface that maps to `null` has no emitter yet; it is refused rather than
 * mirrored, because the mirror deliberately skips every path an emitter owns and
 * would leave a root with no platform entry at all.
 */
const SURFACE_EMITTERS = {
  h5: materializeTsSurface,
  mp: materializeTsSurface,
  flutter: materializeDartSurface,
  harmony: materializeArktsSurface,
};

/** Surfaces whose package family this generator can already emit. */
const TS_SURFACES = new Set(['h5', 'mp']);

/** Surfaces that still need a language-specific package emitter. */
const PENDING_PACKAGE_EMITTERS = {
  flutter: 'Dart package family emitter (lib/**, packages/**, pubspec.yaml wiring)',
};

function parseArguments(argv) {
  const options = {
    surfaces: SURFACES.map((surface) => surface.key),
    dryRun: false,
    skeleton: false,
    templateRepo: TEMPLATE_REPO,
    workspaceRoot: path.dirname(REPO_ROOT),
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (argument === '--skeleton') {
      options.skeleton = true;
      continue;
    }
    if (argument === '--surfaces') {
      const value = argv[index + 1];
      if (!value) throw new Error('--surfaces requires a comma-separated value');
      options.surfaces = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }
    if (argument === '--template-repo') {
      const value = argv[index + 1];
      if (!value) throw new Error('--template-repo requires a value');
      options.templateRepo = value;
      index += 1;
      continue;
    }
    if (argument === '--workspace-root') {
      const value = argv[index + 1];
      if (!value) throw new Error('--workspace-root requires a value');
      options.workspaceRoot = path.resolve(value);
      index += 1;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

const HELP = `Materialize the SDKWork IAM client application roots.

  --surfaces <list>      comma-separated subset of ${SURFACES.map((surface) => surface.key).join(',')} (default: all)
  --dry-run              report the plan without writing anything
  --skeleton             mirror the platform project for surfaces whose package
                         emitter is not written yet. WARNING: such a root has no
                         lib/ or entry/src/ platform entry, so it is an
                         incomplete root by construction.
  --template-repo <dir>  sibling repository holding the skeleton templates (default: ${TEMPLATE_REPO})
  --workspace-root <dir> multi-repo workspace root (default: parent of this repository)
  --help                 show this message
`;

/**
 * Every path committed to the git index, relative to the repository root.
 *
 * The generator treats a committed file as authored and an uncommitted one as its
 * own output. Returns `null` when the index cannot be read, which makes the
 * generator fall back to preserving every pre-existing package file rather than
 * risk overwriting authored work.
 */
function readAuthoredFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    const files = new Set();
    for (const entry of output.split('\0')) {
      if (entry) files.add(entry);
    }
    return files;
  } catch (error) {
    process.stderr.write(
      `warning: could not read the git index (${error instanceof Error ? error.message : String(error)}); ` +
        'pre-existing package files will all be treated as authored\n',
    );
    return null;
  }
}

function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const writer = createWriter();
  const authoredFiles = readAuthoredFiles();
  const report = [];
  let failed = false;

  for (const key of options.surfaces) {
    const surface = surfaceByKey(key);
    const appRoot = path.join(REPO_ROOT, 'apps', surface.rootName);
    const packages = packagesForSurface(surface);

    // A surface without a package emitter must not be materialized by default.
    //
    // The mirror deliberately skips every path the emitter owns (`lib/**`,
    // `entry/src/**`, `AppScope/`, `oh-package.json5`, …). For a surface whose
    // emitter does not exist yet that leaves a root with no platform entry at
    // all — a partial root that looks materialized. Failing loudly is the honest
    // outcome; `--skeleton` is the explicit opt-in for the mirror-only case.
    if (SURFACE_EMITTERS[key] === null && !options.skeleton) {
      report.push({
        surface: key,
        status: 'FAILED',
        mirrored: 0,
        skipped: 0,
        detail:
          `no package emitter for this surface yet (${PENDING_PACKAGE_EMITTERS[key] ?? 'unnamed'}` +
          '); materializing now would write a root without its platform entry. ' +
          'Pass --skeleton to mirror the platform project only.',
      });
      failed = true;
      continue;
    }

    const mirror = mirrorSkeleton({
      workspaceRoot: options.workspaceRoot,
      surface,
      appRoot,
      templateRepo: options.templateRepo,
      writer,
      dryRun: options.dryRun,
    });

    if (mirror.missingTemplate) {
      report.push({
        surface: key,
        status: 'FAILED',
        mirrored: 0,
        skipped: 0,
        detail: `template root not found: ${mirror.templateRoot}`,
      });
      failed = true;
      continue;
    }

    let regenerated = null;
    let planned = 0;
    let pruned = [];
    const emit = SURFACE_EMITTERS[key];
    if (emit) {
      const emitted = emit({
        surface,
        appRoot,
        repoRoot: REPO_ROOT,
        packages,
        writer,
        authoredFiles,
        dryRun: options.dryRun,
      });
      const emittedPaths = emitted?.planned ?? [];
      planned = emittedPaths.length;
      regenerated = 'full root + package family';

      // Every file the current plan produces, plus every file the skeleton mirror
      // copied. Anything else under the root that still carries the generated
      // marker is output from an earlier model and is removed, so a renamed module
      // or a relocated registry cannot survive as a dead copy.
      if (!options.dryRun) {
        const expected = new Set([
          ...emittedPaths,
          ...mirror.mirrored.map((relativePath) => path.join(appRoot, relativePath)),
        ]);
        pruned = pruneGeneratedFiles({ appRoot, expected });
      }
    } else {
      regenerated = `structural skeleton only; pending ${PENDING_PACKAGE_EMITTERS[key] ?? 'package emitter'}`;
    }

    report.push({
      surface: key,
      status: options.dryRun ? 'PLANNED' : 'OK',
      mirrored: mirror.mirrored.length,
      skipped: mirror.regenerated.length,
      planned,
      pruned,
      regenerated,
      appRoot: path.relative(REPO_ROOT, appRoot).replaceAll('\\', '/'),
    });
  }

  // A dry run that wrote is worse than no dry run: the report says "nothing
  // written" while the tree has already changed, so the next `git status` looks
  // like someone else's edits. Failing loudly turns that into a bug report
  // instead of a silent mutation.
  if (options.dryRun) {
    const touched = writer.created.length + writer.updated.length + writer.unchanged.length + writer.skipped.length;
    if (touched > 0) {
      process.stderr.write(
        `error: --dry-run wrote ${touched} file(s); the run is not a dry run. ` +
          'An emitter is bypassing createSurfaceWriter.\n',
      );
      return 1;
    }
  }

  const width = Math.max(...report.map((row) => (row.surface ?? '').length));
  process.stdout.write(`${options.dryRun ? 'DRY RUN — nothing written\n' : ''}`);
  for (const row of report) {
    if (row.status === 'FAILED') {
      process.stdout.write(`${row.surface.padEnd(width)}  FAILED  ${row.detail}\n`);
      continue;
    }
    process.stdout.write(
      `${row.surface.padEnd(width)}  ${row.status.padEnd(7)} mirrored=${String(row.mirrored).padStart(3)} ` +
        `skipped=${String(row.skipped).padStart(3)} planned=${String(row.planned).padStart(4)} ` +
        `pruned=${String(row.pruned.length).padStart(3)}  ${row.regenerated}\n`,
    );
  }

  if (!options.dryRun) {
    const rel = (absolute) => path.relative(REPO_ROOT, absolute).replaceAll('\\', '/');
    process.stdout.write(
      `\ncreated=${writer.created.length} updated=${writer.updated.length} ` +
        `unchanged=${writer.unchanged.length} preserved=${writer.skipped.length} ` +
        `pruned=${report.reduce((total, row) => total + (row.pruned?.length ?? 0), 0)}\n`,
    );
    // The writer exposes `skipped`, not `preserved`: reading the wrong key here
    // returned `undefined` and the `.length` below threw *after* the summary had
    // already been printed, so a crashed run looked like a clean run.
    for (const name of ['created', 'updated', 'skipped']) {
      const list = writer[name];
      if (list.length === 0) continue;
      process.stdout.write(`\n${name}:\n`);
      for (const file of list.slice(0, 40)) process.stdout.write(`  ${rel(file)}\n`);
      if (list.length > 40) process.stdout.write(`  ... and ${list.length - 40} more\n`);
    }
    const pruned = report.flatMap((row) => row.pruned ?? []);
    if (pruned.length > 0) {
      process.stdout.write('\npruned (generated files this model no longer emits):\n');
      for (const file of pruned.slice(0, 40)) process.stdout.write(`  ${rel(file)}\n`);
      if (pruned.length > 40) process.stdout.write(`  ... and ${pruned.length - 40} more\n`);
    }
  }

  return failed ? 2 : 0;
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (error) {
  // The message alone is not enough to fix a generator failure: several call
  // sites produce an identical TypeError text, so the stack is the only thing
  // that names the emitter. Opt in with the env var to keep normal runs quiet.
  process.stderr.write(
    process.env.SDKWORK_APP_SURFACES_DEBUG && error instanceof Error
      ? `${error.stack}\n`
      : `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
