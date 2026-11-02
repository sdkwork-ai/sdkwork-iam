#!/usr/bin/env node
/**
 * Cross-client parity gate for the IAM capability screens.
 *
 * The matrix in `specs/IAM_CLIENT_PARITY.json` is the contract: every screen the
 * canonical client-surface model declares, the status each client root reached,
 * and the evidence that proves it. This tool is what stops that matrix from
 * becoming a wish list.
 *
 * What it enforces:
 *
 * 1. **Completeness of the contract** — every route in the model appears once and
 *    no extra screen is invented; tier, capability and API family agree with the
 *    model.
 * 2. **Evidence** — a `complete` or `partial` cell must name a path inside its own
 *    platform root that exists; `complete` additionally needs a test path. A cell
 *    cannot borrow another platform's file as proof.
 * 3. **No regression** — a run that reaches fewer `complete` screens than the
 *    recorded baseline fails. Raising the baseline is how a release records new
 *    parity; lowering it is a regression, not a decision this tool makes.
 * 4. **Release mode** (`--release`) — every screen must be `complete` on every
 *    platform. This is the gate the commercial milestone runs.
 *
 * Usage:
 *
 *   node tools/check-iam-client-parity.mjs
 *   node tools/check-iam-client-parity.mjs --release
 *   node tools/check-iam-client-parity.mjs --json
 *
 * Exit codes: 0 pass, 1 violation, 2 unusable input.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(HERE, '..');
const MATRIX_PATH = 'specs/IAM_CLIENT_PARITY.json';
const MODEL_PATH = 'scripts/lib/client-app-surfaces/model.mjs';
const STATUSES = new Set(['complete', 'partial', 'scaffold', 'missing']);

/** Tiers a tier-scoped platform blocker may name. */
const TIERS = new Set(['app', 'console', 'admin']);

function parseArguments(argv) {
  const options = { json: false, release: false, root: DEFAULT_ROOT, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument === '--release') {
      options.release = true;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      options.help = true;
      continue;
    }
    if (argument === '--root') {
      const value = argv[index + 1];
      if (!value) throw new Error('--root requires a directory');
      options.root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${argument}`);
  }
  return options;
}

const HELP = `Cross-client parity gate for IAM capability screens.

  --root <dir>   repository root (default: parent of this tool)
  --release      require every screen complete on every platform
  --json         emit the report as JSON
  --help         show this message
`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/** Whether a matrix path exists: a file, or a directory holding at least one file. */
function pathHasContent(root, relativePath) {
  const absolute = path.resolve(root, relativePath);
  let stat;
  try {
    stat = fs.statSync(absolute);
  } catch {
    return false;
  }
  if (stat.isFile()) return true;
  if (!stat.isDirectory()) return false;
  let entries;
  try {
    entries = fs.readdirSync(absolute, { withFileTypes: true });
  } catch {
    return false;
  }
  return entries.some((entry) => {
    if (entry.isFile()) return true;
    if (!entry.isDirectory()) return false;
    return pathHasContent(root, path.join(relativePath, entry.name));
  });
}

/** Whether a path resolves inside one of the given roots. */
function pathIsInside(relativePath, roots) {
  const normalized = relativePath.replaceAll('\\', '/').replace(/^\.\//u, '');
  return roots.some((root) => normalized === root || normalized.startsWith(`${root}/`));
}

async function main(argv) {
  const options = parseArguments(argv);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }

  const root = options.root;
  const matrixFile = path.join(root, MATRIX_PATH);
  if (!fs.existsSync(matrixFile)) {
    process.stderr.write(`[client-parity] missing matrix: ${MATRIX_PATH}\n`);
    return 2;
  }

  const matrix = readJson(matrixFile);
  const platforms = Array.isArray(matrix.platforms) ? matrix.platforms : [];
  const platformRoots = matrix.platformRoots ?? {};
  if (platforms.length === 0) {
    process.stderr.write('[client-parity] matrix declares no platforms\n');
    return 2;
  }

  const violations = [];
  const fail = (message) => violations.push(message);

  const modelUrl = pathToFileURL(path.join(root, MODEL_PATH)).href;
  const model = await import(modelUrl);
  const modelRoutes = model.ROUTES;
  const modelRouteId = model.routeId;
  if (!Array.isArray(modelRoutes) || typeof modelRouteId !== 'function') {
    process.stderr.write(`[client-parity] ${MODEL_PATH} does not export ROUTES/routeId\n`);
    return 2;
  }

  const expectedIds = modelRoutes.map((route) => modelRouteId(route));
  const expectedById = new Map(modelRoutes.map((route, index) => [expectedIds[index], route]));
  const screens = Array.isArray(matrix.screens) ? matrix.screens : [];
  const seen = new Set();

  for (const screen of screens) {
    const id = screen?.id;
    if (typeof id !== 'string' || id.trim() === '') {
      fail('a screen has no id');
      continue;
    }
    if (seen.has(id)) fail(`duplicate screen id: ${id}`);
    seen.add(id);

    const modelRoute = expectedById.get(id);
    if (!modelRoute) {
      fail(`screen ${id} is not a route of ${MODEL_PATH}`);
      continue;
    }
    if (screen.tier !== modelRoute.surface) {
      fail(`${id}: tier "${screen.tier}" does not match the model surface "${modelRoute.surface}"`);
    }
    if (screen.capability !== modelRoute.capability) {
      fail(`${id}: capability "${screen.capability}" does not match "${modelRoute.capability}"`);
    }
    if (screen.api !== 'app-api' && screen.api !== 'backend-api') {
      fail(`${id}: api must be app-api or backend-api, found "${screen.api}"`);
    }

    const evidence = screen.evidence ?? {};
    const tests = screen.tests ?? {};
    const blockedBy = screen.blockedBy ?? {};
    for (const platform of platforms) {
      const status = screen.status?.[platform] ?? matrix.defaultStatus;
      if (!STATUSES.has(status)) {
        fail(`${id}/${platform}: unknown status "${status}"`);
        continue;
      }
      if (status === 'complete' || status === 'partial') {
        // A finished cell cannot sit under a platform blocker: that would mean a screen was
        // built on a surface the matrix says cannot reach its resources.
        const platformWide =
          matrix.platformBlockers?.[`${platform}:${screen.tier}`] ??
          matrix.platformBlockers?.[platform];
        if (blockedBy[platform] !== undefined) {
          fail(`${id}/${platform}: blockedBy is only valid on a missing/scaffold cell, found "${status}"`);
        }
        if (typeof platformWide === 'string') {
          fail(
            `${id}/${platform}: status "${status}" contradicts the platform blocker for ` +
              `${platform}:${screen.tier}`,
          );
        }
      } else if (blockedBy[platform] !== undefined &&
        (typeof blockedBy[platform] !== 'string' || blockedBy[platform].trim() === '')) {
        // A blocked cell records *why* a platform cannot implement a screen yet, so the
        // explanation itself has to be there.
        fail(`${id}/${platform}: blockedBy must be a non-empty explanation`);
      }
      if (status === 'scaffold' || status === 'missing') continue;

      const evidencePath = evidence[platform];
      if (typeof evidencePath !== 'string' || evidencePath.trim() === '') {
        fail(`${id}/${platform}: status "${status}" needs evidence`);
        continue;
      }
      const platformRoot = platformRoots[platform];
      if (!platformRoot) {
        fail(`${id}/${platform}: matrix declares no platformRoots entry`);
        continue;
      }
      if (!pathIsInside(evidencePath, [platformRoot])) {
        fail(`${id}/${platform}: evidence "${evidencePath}" is outside ${platformRoot}`);
      }
      if (!pathHasContent(root, evidencePath)) {
        fail(`${id}/${platform}: evidence does not exist: ${evidencePath}`);
      }

      if (status !== 'complete') continue;
      const testPath = tests[platform];
      if (typeof testPath !== 'string' || testPath.trim() === '') {
        fail(`${id}/${platform}: status "complete" needs a test path`);
        continue;
      }
      if (!pathIsInside(testPath, [platformRoot])) {
        fail(`${id}/${platform}: test "${testPath}" is outside ${platformRoot}`);
      }
      if (!pathHasContent(root, testPath)) {
        fail(`${id}/${platform}: test does not exist: ${testPath}`);
      }
    }
  }

  for (const id of expectedIds) {
    if (!seen.has(id)) fail(`model route has no matrix row: ${id}`);
  }

  // A blocker may be declared once per platform (or per platform+tier) instead of repeated on
  // every cell: the reason is the same for all of them, and repeating it invites the copies to
  // drift. A per-cell blockedBy always wins.
  const platformBlockers = matrix.platformBlockers ?? {};
  for (const [key, reason] of Object.entries(platformBlockers)) {
    if (typeof reason !== 'string' || reason.trim() === '') {
      fail(`platformBlockers["${key}"]: a blocker must explain why the cells cannot be built`);
      continue;
    }
    const [blockedPlatform, blockedTier] = key.split(':');
    if (!platforms.includes(blockedPlatform)) {
      fail(`platformBlockers["${key}"]: "${blockedPlatform}" is not a platform of this matrix`);
      continue;
    }
    if (blockedTier !== undefined && !TIERS.has(blockedTier)) {
      fail(`platformBlockers["${key}"]: "${blockedTier}" is not a tier of this matrix`);
    }
  }

  /** The reason a cell is blocked, or undefined when it is not. */
  function blockerFor(screen, platform) {
    const cell = screen.blockedBy?.[platform];
    if (typeof cell === 'string') return cell;
    return platformBlockers[`${platform}:${screen.tier}`] ?? platformBlockers[platform];
  }

  // Counts per platform, and the regression comparison.
  const counts = Object.fromEntries(
    platforms.map((platform) => [platform, { blocked: 0, complete: 0, missing: 0, partial: 0, scaffold: 0 }]),
  );
  for (const screen of screens) {
    if (!expectedById.has(screen?.id)) continue;
    for (const platform of platforms) {
      const status = screen.status?.[platform] ?? matrix.defaultStatus;
      if (counts[platform] && STATUSES.has(status)) counts[platform][status] += 1;
      if (counts[platform] && blockerFor(screen, platform) !== undefined) counts[platform].blocked += 1;
    }
  }

  const baseline = matrix.baseline?.complete ?? {};
  for (const platform of platforms) {
    const floor = baseline[platform];
    if (typeof floor !== 'number') {
      fail(`matrix baseline has no numeric entry for platform "${platform}"`);
      continue;
    }
    if (counts[platform].complete < floor) {
      fail(
        `regression on ${platform}: ${counts[platform].complete} complete screen(s), baseline ${floor}`,
      );
    }
  }

  if (options.release) {
    for (const platform of platforms) {
      for (const screen of screens) {
        const status = screen.status?.[platform] ?? matrix.defaultStatus;
        if (status !== 'complete') {
          fail(`release gate: ${screen.id}/${platform} is "${status}", expected "complete"`);
        }
      }
    }
  }

  const report = {
    counts,
    failures: violations.length,
    mode: options.release ? 'release' : 'incremental',
    ok: violations.length === 0,
    screens: screens.length,
    violations,
  };

  if (options.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    process.stdout.write(
      `[client-parity] mode=${report.mode} screens=${report.screens} platforms=${platforms.join(',')}\n`,
    );
    for (const platform of platforms) {
      const row = counts[platform];
      process.stdout.write(
        `  ${platform.padEnd(12)} complete=${String(row.complete).padStart(2)} ` +
          `partial=${String(row.partial).padStart(2)} ` +
          `scaffold=${String(row.scaffold).padStart(2)} ` +
          `missing=${String(row.missing).padStart(2)} ` +
          `blocked=${String(row.blocked).padStart(2)}\n`,
      );
    }
    if (violations.length > 0) {
      process.stdout.write(`\n[client-parity] ${violations.length} violation(s):\n`);
      for (const violation of violations.slice(0, 60)) {
        process.stdout.write(`  - ${violation}\n`);
      }
      if (violations.length > 60) {
        process.stdout.write(`  ... and ${violations.length - 60} more\n`);
      }
    } else {
      process.stdout.write('[client-parity] ok\n');
    }
  }

  return violations.length === 0 ? 0 : 1;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(
      `[client-parity] ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
