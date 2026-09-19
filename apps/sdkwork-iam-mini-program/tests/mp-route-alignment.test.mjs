// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(rootDir, '..');

const CANONICAL_ID_RE = /^(?:app|console|admin)\.iam\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*$/u;

/**
 * Reads the route registry *source* rather than any generated projection, so a
 * passing assertion is evidence about the registry itself. Field extraction
 * uses an id-delimited window: text from one id literal up to the next.
 */
function readContributions() {
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', 'sdkwork-iam-mp-core', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  const literals = [...registry.matchAll(/'((?:app|console|admin)\.iam\.[a-z][a-z0-9-]*\.[a-z][a-z0-9-]*)'/gu)];
  const seen = new Set();
  const contributions = [];
  for (const [index, literal] of literals.entries()) {
    const id = literal[1];
    assert.ok(!seen.has(id), 'duplicate id literal ' + id + ' breaks window extraction');
    seen.add(id);
    const end = literals[index + 1]?.index ?? Math.min(registry.length, literal.index + 600);
    const window = registry.slice(literal.index, end);
    const field = (name) => new RegExp('\\b' + name + ":\\s*'([^']*)'", 'u').exec(window)?.[1];
    contributions.push({
      id,
      surface: field('surface'),
      domain: field('domain'),
      capability: field('capability'),
      screen: field('screen'),
      titleKey: field('titleKey'),
      auth: field('auth'),
    });
  }
  return contributions;
}

test('route ids follow the canonical four-segment format', () => {
  for (const contribution of readContributions()) {
    assert.match(contribution.id, CANONICAL_ID_RE, contribution.id + ' is not canonical');
    assert.equal(
      contribution.id,
      [contribution.surface, contribution.domain, contribution.capability, contribution.screen].join('.'),
      contribution.id + ' disagrees with its own field segments',
    );
  }
});

test('route ids are unique and each id appears once in the registry', () => {
  const contributions = readContributions();
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', 'sdkwork-iam-mp-core', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  const ids = contributions.map((contribution) => contribution.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate route ids');
  for (const id of ids) {
    const occurrences = registry.split("'" + id + "'").length - 1;
    assert.equal(occurrences, 1, id + ' appears ' + occurrences + ' times');
  }
});

test('title keys are domain-scoped and permission hints are dotted tokens', () => {
  for (const contribution of readContributions()) {
    assert.ok(contribution.titleKey?.startsWith('iam.'), contribution.id + ' titleKey must start with iam.');
  }
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', 'sdkwork-iam-mp-core', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  for (const match of registry.matchAll(/permissionHint:\s*'([^']+)'/gu)) {
    assert.match(match[1], /^iam\.[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)*$/u, match[1] + ' is not a dotted permission token');
  }
});

test('route metadata never declares API paths, SDK methods or tokens', () => {
  const registry = fs.readFileSync(
    path.join(appRoot, 'packages', 'sdkwork-iam-mp-core', 'src', 'modules', 'index.ts'),
    'utf8',
  );
  assert.ok(!/\/app\/v3\/api|\/backend\/v3\/api/u.test(registry), 'route metadata must not declare API paths');
  assert.ok(!/(?:accessToken|refreshToken|clientSecret|apiKey)/u.test(registry), 'route metadata must not declare credentials');
});

test('every route carries a platform presentation and a title key', () => {
  for (const contribution of readContributions()) {
    assert.ok(contribution.titleKey, contribution.id + ' is missing titleKey');
    assert.ok(['public', 'required'].includes(contribution.auth), contribution.id + ' has an invalid auth mode');
  }
});

export { readContributions };
