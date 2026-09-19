import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const iamRoot = path.resolve(import.meta.dirname, '../../..');
const embeddedBootstrapPath = path.join(
  iamRoot,
  'crates/sdkwork-iam-web-adapter/src/embedded_bootstrap.rs',
);

/**
 * Materialized deployment documents: derived data, not authored source.
 *
 * `ENVIRONMENT_SPEC.md` section 5.1.0.1 requires every public SDK API base URL
 * field of a *cloud* runtime source to materialize the **complete** registered API
 * edge family of its environment (`origin1;origin2;…`, primary base domain first),
 * and this repository registers sixteen base domains for that edge
 * (`etc/sdkwork.deployment.config.json#environments.<environment>.cloudApiBaseUrl`,
 * mirrored by `specs/topology.spec.json#cloudPublicHosts`). Those documents
 * therefore name every registered base domain *by construction* — exactly as the
 * `etc/` authority they are derived from already does, and that authority sits
 * outside this test's scope for that same reason.
 *
 * `listFiles` above already skips a directory literally named `generated`, which is
 * how the Harmony root's derived ArkTS bundle stays out of scope. These documents
 * are generated into ordinary source paths, so they need the path-shaped
 * equivalent instead. Authored sources remain fully in scope: a hand-written test
 * that used a registered product base domain as a fixture host is a real finding,
 * not an exemption.
 */
const MATERIALIZED_RUNTIME_DOCUMENT_PATTERNS = [
  /^apps\/[^/]+\/config\/[^/]+\/runtime-env\.[^/]+\.json$/u,
  /^apps\/[^/]+\/env\/sdkwork\.[^/]+\.json$/u,
];

function isMaterializedRuntimeDocument(absolutePath) {
  const relative = path.relative(iamRoot, absolutePath).replaceAll('\\', '/');
  return MATERIALIZED_RUNTIME_DOCUMENT_PATTERNS.some((pattern) => pattern.test(relative));
}

function listFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (['node_modules', 'target', 'dist', 'generated', '.git', '.runtime'].includes(entry.name)) {
      continue;
    }
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath));
    } else if (/\.(?:json|md|mjs|mts|rs|toml|ts|tsx|yaml|yml)$/u.test(entry.name)) {
      files.push(entryPath);
    }
  }
  return files;
}

test('embedded IAM bootstrap accepts only the generic application-root key', () => {
  const source = fs.readFileSync(embeddedBootstrapPath, 'utf8');
  const appRootKeys = [...source.matchAll(/"(SDKWORK_[A-Z_]*APP_ROOT)"/gu)]
    .map((match) => match[1]);

  assert.deepEqual([...new Set(appRootKeys)], ['SDKWORK_APP_ROOT']);
});

test('IAM authored sources do not name a consuming product', () => {
  const consumerIdentity = ['bird', 'coder'].join('');
  const testFile = path.resolve(import.meta.filename);
  const scanned = [
    path.join(iamRoot, '.gitignore'),
    ...listFiles(path.join(iamRoot, 'apps')),
    ...listFiles(path.join(iamRoot, 'crates')),
    ...listFiles(path.join(iamRoot, 'scripts')),
    ...listFiles(path.join(iamRoot, 'tests')),
  ].filter((filePath) => filePath !== testFile)
    .filter((filePath) => !isMaterializedRuntimeDocument(filePath));

  // The exclusion above must not be able to hollow the rule out: if a future change
  // widened it until nothing was scanned, `offenders` would be empty for the wrong
  // reason and this test would pass while checking nothing. An authored source of
  // this very package is the anchor — it exists unconditionally and is the kind of
  // file the rule is about.
  assert.ok(
    scanned.includes(embeddedBootstrapPath),
    'the consumer-independence scan must still cover authored crate sources',
  );

  const offenders = scanned
    .filter((filePath) => {
      try {
        return fs.readFileSync(filePath, 'utf8').toLowerCase().includes(consumerIdentity);
      } catch {
        return false;
      }
    })
    .map((filePath) => path.relative(iamRoot, filePath));

  assert.deepEqual(offenders, []);
});
