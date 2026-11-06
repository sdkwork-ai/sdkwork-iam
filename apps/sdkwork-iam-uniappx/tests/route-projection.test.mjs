import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  IAM_ROUTE_IDS,
  IAM_UNIAPPX_ROUTES,
  projectIamPagesJson,
} from '../packages/sdkwork-iam-uniappx-core/src/routes/registry.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('route ids follow <surface>.<domain>.<capability>.<screen>', () => {
  const pattern = /^(app|console|admin)\.[a-z0-9-]+\.[a-z0-9-]+\.[a-z0-9-]+$/u;
  for (const route of IAM_UNIAPPX_ROUTES) {
    assert.match(route.id, pattern);
    assert.equal(route.presentation.uniappx, 'page');
  }
  assert.equal(IAM_ROUTE_IDS.login, 'app.iam.auth.login');
});

test('pages.json matches the route projection and every page is .uvue', () => {
  const projection = projectIamPagesJson();
  const pagesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'pages.json'), 'utf8'));
  assert.deepEqual(
    pagesJson.pages.map((page) => page.path),
    projection.pages.map((page) => page.path),
  );
  for (const page of pagesJson.pages) {
    assert.ok(fs.existsSync(path.join(ROOT, `${page.path}.uvue`)), `${page.path}.uvue is missing`);
    assert.ok(!page.path.endsWith('.vue'));
  }
});
