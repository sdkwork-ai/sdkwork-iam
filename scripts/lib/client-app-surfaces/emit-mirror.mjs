/**
 * Structural skeleton mirror.
 *
 * Copies the gate-passing root skeleton from the known-good sibling roots in
 * `sdkwork-im/apps/*` into the corresponding `sdkwork-iam/apps/*` root, applying
 * identity-token substitution. Content-bearing files are never mirrored — they
 * are regenerated from `model.mjs`. See `REGENERATED_PATH_PATTERNS`.
 *
 * Binary files are copied byte-for-byte (no token substitution), because
 * substituting inside a PNG or a keystore would corrupt it.
 */

import fs from 'node:fs';
import path from 'node:path';

import {
  TEMPLATE_APPS_DIR,
  TEMPLATE_ROOT_NAMES,
  TEMPLATE_REPO,
  isRegeneratedPath,
  substituteIdentityTokens,
} from './model.mjs';
import { toPosix } from './emit-common.mjs';

/** Extensions that must travel byte-for-byte. */
const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
  '.jar',
  '.keystore',
  '.jks',
  '.so',
  '.dylib',
  '.dll',
  '.aar',
  '.zip',
  '.pdf',
  '.mp4',
]);

/** Directories never walked inside a template root. */
const SKIP_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.gradle',
  '.dart_tool',
  '.cache',
  'build',
  'Pods',
  'dist',
  '.idea',
  '.vscode-test',
]);

function isBinary(filePath) {
  return BINARY_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

/** Recursively list files under `root`, skipping build/cache directories. */
function listFiles(root, current = root, out = []) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      listFiles(root, path.join(current, entry.name), out);
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(toPosix(path.relative(root, path.join(current, entry.name))));
  }
  return out;
}

/**
 * @param {object} input
 * @param {string} input.workspaceRoot absolute path of the multi-repo workspace root
 * @param {object} input.surface surface descriptor from `model.mjs`
 * @param {string} input.appRoot absolute path of the target client root
 * @param {string} [input.templateRepo] template repository directory name
 * @param {object} input.writer writer from `emit-common.mjs`
 * @param {boolean} [input.dryRun] report without writing
 * @returns {{templateRoot: string, mirrored: string[], regenerated: string[], missingTemplate: boolean}}
 */
export function mirrorSkeleton({
  workspaceRoot,
  surface,
  appRoot,
  templateRepo = TEMPLATE_REPO,
  writer,
  dryRun = false,
}) {
  const templateRootName = TEMPLATE_ROOT_NAMES[surface.key];
  if (!templateRootName) throw new Error(`no template root declared for surface ${surface.key}`);

  const templateRoot = path.join(workspaceRoot, templateRepo, TEMPLATE_APPS_DIR, templateRootName);
  const result = {
    templateRoot: toPosix(templateRoot),
    mirrored: [],
    regenerated: [],
    missingTemplate: false,
  };

  if (!fs.existsSync(templateRoot)) {
    result.missingTemplate = true;
    return result;
  }

  for (const relativePath of listFiles(templateRoot)) {
    if (isRegeneratedPath(relativePath, surface)) {
      result.regenerated.push(relativePath);
      continue;
    }
    const source = path.join(templateRoot, relativePath);
    const target = path.join(appRoot, relativePath);
    if (isBinary(relativePath)) {
      if (!dryRun) {
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(source, target);
      }
      result.mirrored.push(relativePath);
      continue;
    }
    if (dryRun) {
      // A dry run must not touch the filesystem at all. Writing the text files
      // while skipping only the binary ones is the bug that let a `--dry-run`
      // invocation populate the target roots.
      result.mirrored.push(relativePath);
      continue;
    }
    const sourceText = fs.readFileSync(source, 'utf8');
    writer.write(target, substituteIdentityTokens(sourceText), {
      ifMissing: false,
      eol: sourceText.includes('\r\n') ? '\r\n' : '\n',
    });
    result.mirrored.push(relativePath);
  }

  result.mirrored.sort();
  result.regenerated.sort();
  return result;
}
