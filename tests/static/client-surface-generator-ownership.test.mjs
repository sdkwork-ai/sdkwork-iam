import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  GENERATED_BANNER,
  createSurfaceWriter,
  createWriter,
} from '../../scripts/lib/client-app-surfaces/emit-common.mjs';

test('surface generation preserves marker-less authored files and refreshes generated files', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'sdkwork-surface-ownership-'));
  const repoRoot = path.join(tempRoot, 'repo');
  const appRoot = path.join(repoRoot, 'apps', 'demo');
  const packageDir = 'apps/demo/packages/demo-auth';

  try {
    fs.mkdirSync(path.join(appRoot, 'src'), { recursive: true });
    fs.mkdirSync(path.join(appRoot, 'packages', 'demo-auth', 'src'), { recursive: true });

    const rootEntry = path.join(appRoot, 'src', 'App.tsx');
    const authoredEntry = path.join(appRoot, 'packages', 'demo-auth', 'src', 'auth.ts');
    const generatedEntry = path.join(appRoot, 'packages', 'demo-auth', 'src', 'generated.ts');
    fs.writeFileSync(rootEntry, 'authored root composition\n');
    fs.writeFileSync(authoredEntry, 'authored auth service\n');
    fs.writeFileSync(generatedEntry, `${GENERATED_BANNER}\nold generated output\n`);

    const writer = createSurfaceWriter({
      appRoot,
      repoRoot,
      writer: createWriter(),
      authoredFiles: new Set(),
      preExistingPackageDirs: [packageDir],
    });

    assert.equal(writer.write('src/App.tsx', 'replacement root composition\n'), false);
    assert.equal(writer.write('packages/demo-auth/src/auth.ts', 'replacement auth service\n'), false);
    assert.equal(writer.write('packages/demo-auth/src/generated.ts', 'new generated output\n'), true);

    assert.equal(fs.readFileSync(rootEntry, 'utf8'), 'authored root composition\n');
    assert.equal(fs.readFileSync(authoredEntry, 'utf8'), 'authored auth service\n');
    assert.equal(
      fs.readFileSync(generatedEntry, 'utf8'),
      'new generated output\n',
    );
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
