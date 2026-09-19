/**
 * Component spec metadata standard.
 *
 * `COMPONENT_SPEC.md` section 3 fixes the shape of `specs/component.spec.json`:
 *
 *   "root": "sdkwork-iam/apps/sdkwork-iam-pc/packages/example",
 *   "manifests": ["package.json"]
 *
 * Three properties of that shape are machine-checkable and were silently
 * unguarded before this test existed:
 *
 * 1. `component.root` is the component directory path **relative to the
 *    workspace root**, so it must carry the repository segment (`sdkwork-iam/...`)
 *    and must resolve back to the directory that owns the spec.
 * 2. `component.displayName` is a human-readable label, not a restatement of the
 *    machine name in `component.name`.
 * 3. Component `manifests` entries are bare file names relative to
 *    `component.root`, and they must actually exist there.
 *
 * The generator that emits the client application roots
 * (`scripts/materialize-client-app-surfaces.mjs`) violated (1) and (3) while
 * still passing every gate, which is why the rules live here rather than being
 * left to review.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const workspaceRoot = path.resolve(repoRoot, '..');

const IGNORED_DIRECTORY_NAMES = new Set(['.git', 'dist', 'node_modules', 'target']);

const STALE_METADATA_PATTERNS = [
  'apps/scripts/initialize-component-specs.mjs',
  'apps/scripts/validate-component-specs.mjs',
];

const BANNED_VERIFICATION_PATTERNS = [/powershell/iu];

function listComponentSpecs(directory) {
  const files = [];

  function visit(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORY_NAMES.has(entry.name)) {
          continue;
        }
        visit(path.join(current, entry.name));
        continue;
      }

      if (entry.isFile() && entry.name === 'component.spec.json') {
        const specPath = path.join(current, entry.name);
        if (path.basename(path.dirname(specPath)) === 'specs') {
          files.push(specPath);
        }
      }
    }
  }

  visit(directory);
  return files.sort();
}

const COMPONENT_SPECS = listComponentSpecs(repoRoot);

function toRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).replaceAll('\\', '/');
}

function relativeFromWorkspaceRoot(absolutePath) {
  return path.relative(workspaceRoot, absolutePath).replaceAll('\\', '/');
}

test('component specs declare a resolvable root relative to the workspace root', () => {
  const errors = [];

  for (const specPath of COMPONENT_SPECS) {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const declaredRoot = spec.component?.root;

    if (typeof declaredRoot !== 'string' || declaredRoot.length === 0) {
      errors.push(`${toRelative(specPath)} is missing component.root`);
      continue;
    }

    // The component root is the directory that owns `specs/component.spec.json`.
    const expectedRoot = path.dirname(path.dirname(specPath));
    const resolvedRoot = path.resolve(workspaceRoot, declaredRoot);

    if (resolvedRoot !== expectedRoot) {
      errors.push(
        `${toRelative(specPath)} component.root must be "${relativeFromWorkspaceRoot(expectedRoot)}", found "${declaredRoot}"`,
      );
    }
  }

  assert.deepEqual(errors, []);
});

test('component specs keep displayName as a human-readable label', () => {
  const errors = [];

  for (const specPath of COMPONENT_SPECS) {
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const { displayName, name } = spec.component ?? {};

    if (typeof displayName !== 'string' || displayName.trim().length === 0) {
      errors.push(`${toRelative(specPath)} is missing component.displayName`);
      continue;
    }

    if (displayName === name) {
      errors.push(
        `${toRelative(specPath)} component.displayName restates component.name ("${displayName}"); use a human-readable label`,
      );
    }
  }

  assert.deepEqual(errors, []);
});

test('component package specs declare bare, existing manifest file names', () => {
  const errors = [];
  let inspected = 0;

  for (const specPath of COMPONENT_SPECS) {
    const componentRoot = path.dirname(path.dirname(specPath));
    if (!specPath.includes(`${path.sep}packages${path.sep}`)) {
      // Root specs legitimately declare both their own manifests and the
      // manifests of their member packages, so only package specs are in scope.
      continue;
    }

    inspected += 1;
    const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
    const manifests = spec.component?.manifests ?? [];

    if (manifests.length === 0) {
      errors.push(`${toRelative(specPath)} must declare at least one manifest`);
      continue;
    }

    for (const manifest of manifests) {
      if (manifest.includes('/') || manifest.includes('\\')) {
        errors.push(
          `${toRelative(specPath)} manifest "${manifest}" must be a bare file name relative to component.root`,
        );
        continue;
      }

      if (!fs.existsSync(path.join(componentRoot, manifest))) {
        errors.push(`${toRelative(specPath)} manifest "${manifest}" does not exist in the component root`);
      }
    }
  }

  assert.ok(inspected > 0, 'expected to find at least one package-level component spec');
  assert.deepEqual(errors, []);
});

test('component specs do not reference stale apps/scripts metadata or non-portable verification commands', () => {
  const errors = [];

  for (const specPath of COMPONENT_SPECS) {
    const relativePath = toRelative(specPath);
    const text = fs.readFileSync(specPath, 'utf8');
    const spec = JSON.parse(text);

    for (const stalePattern of STALE_METADATA_PATTERNS) {
      if (text.includes(stalePattern)) {
        errors.push(`${relativePath} still references ${stalePattern}`);
      }
    }

    for (const command of spec.verification?.commands ?? []) {
      for (const bannedPattern of BANNED_VERIFICATION_PATTERNS) {
        if (bannedPattern.test(command)) {
          errors.push(`${relativePath} verification command must be cross-platform: ${command}`);
        }
      }
    }

    const managedBy = spec.metadata?.managedBy;
    if (
      typeof managedBy === 'string' &&
      STALE_METADATA_PATTERNS.some((stalePattern) => managedBy.includes(stalePattern))
    ) {
      errors.push(`${relativePath} metadata.managedBy must not reference stale apps/scripts metadata`);
    }
  }

  assert.deepEqual(errors, []);
});
