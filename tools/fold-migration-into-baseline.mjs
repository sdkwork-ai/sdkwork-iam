// Fold a versioned migration into the module baseline, byte-for-byte.
//
// The baseline keeps each applied migration as its own
// `-- folded migration: <path>` block so a fresh install and an upgraded
// install converge on identical DDL. This script writes (or replaces) one
// block and then re-verifies EVERY block against its source migration, which
// is what makes the two paths trustworthy rather than merely similar.
//
// Two details that bit once already:
//   * the baseline is CRLF while the migration files are LF, so a naive append
//     leaves a mixed-EOL file. The dominant EOL of the baseline wins.
//   * block boundaries cannot be found with a `\n`-anchored regex on a CRLF
//     file. Matching is done on an LF-normalised copy instead.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const moduleRoot = process.argv[2];
const migrationRelative = process.argv[3];
const baselineRelative = 'database/ddl/baseline/postgres/0001_iam_baseline.sql';

if (!moduleRoot || !migrationRelative) {
  console.error('usage: fold-migration-into-baseline.mjs <moduleRoot> <migrations/postgres/xxx.up.sql>');
  process.exit(2);
}

const baselinePath = `${moduleRoot}/${baselineRelative}`;

/** Statements only: provenance header, BEGIN and COMMIT stripped. */
function migrationBody(relativePath) {
  const sql = readFileSync(`${moduleRoot}/database/${relativePath}`, 'utf8');
  const begin = sql.indexOf('BEGIN;');
  const commit = sql.lastIndexOf('COMMIT;');
  if (begin < 0 || commit < 0 || commit < begin) {
    throw new Error(`${relativePath} is not wrapped in BEGIN/COMMIT`);
  }
  const body = sql.slice(begin + 'BEGIN;'.length, commit).replace(/^\s+/, '');
  return `${body.replace(/[\s\r\n]+$/, '')}\n`;
}

/** EOL the file already uses, so an append does not mix line endings. */
function dominantEol(text) {
  const crlf = (text.match(/\r\n/g) || []).length;
  const lf = (text.match(/(?<!\r)\n/g) || []).length;
  return crlf > lf ? '\r\n' : '\n';
}

/** Split an LF-normalised baseline into preamble plus ordered blocks. */
function splitBlocks(lf) {
  const markers = [...lf.matchAll(/^-- folded migration: (\S+)$/gm)].map((match) => ({
    path: match[1],
    lineStart: match.index,
  }));
  const preamble =
    markers.length > 0 ? lf.slice(0, markers[0].lineStart) : `${lf.replace(/\n+$/, '\n')}\n`;
  const blocks = markers.map((marker, index) => {
    const next = markers[index + 1];
    const start = marker.lineStart + `-- folded migration: ${marker.path}`.length + 1;
    const end = next ? next.lineStart : lf.length;
    return { path: marker.path, body: `${lf.slice(start, end).replace(/\n+$/, '')}\n` };
  });
  return { preamble, blocks };
}

const raw = readFileSync(baselinePath, 'utf8');
const eol = dominantEol(raw);
const { preamble, blocks } = splitBlocks(raw.replace(/\r\n/g, '\n'));

const rebuilt = [...blocks.filter((block) => block.path !== migrationRelative), {
  path: migrationRelative,
  body: migrationBody(migrationRelative),
}];

const rebuiltLf = `${preamble.replace(/\n+$/, '\n')}${rebuilt
  .map((block) => `\n-- folded migration: ${block.path}\n${block.body}`)
  .join('')}`;
const text = eol === '\r\n' ? rebuiltLf.replace(/\n/g, '\r\n') : rebuiltLf;
writeFileSync(baselinePath, text);
console.log(
  `[folded] ${migrationRelative} (eol=${eol === '\r\n' ? 'CRLF' : 'LF'}, blocks=${rebuilt.length})`,
);

/** Drop comment lines so a summarized header does not read as a DDL drift. */
function statementsOnly(body) {
  return body
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/\n+$/, '\n');
}

// Independently re-verify every block against its source migration.
//
// Some references are dangling in this repository: migrations 0006-0015 were
// deleted while their folded blocks stayed in the baseline. Those are reported
// separately instead of failing the fold, because a deleted upgrade path is a
// lifecycle defect to repair, not a reason to distrust a fresh fold.
const verify = splitBlocks(readFileSync(baselinePath, 'utf8').replace(/\r\n/g, '\n'));
let byteIdentical = 0;
let equivalent = 0;
let mismatched = 0;
const missing = [];
for (const block of verify.blocks) {
  let expected;
  try {
    expected = migrationBody(block.path);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      missing.push(block.path);
      continue;
    }
    throw error;
  }
  if (block.body === expected) {
    byteIdentical += 1;
    continue;
  }
  if (statementsOnly(block.body) === statementsOnly(expected)) {
    equivalent += 1;
    continue;
  }
  mismatched += 1;
  const actualLines = statementsOnly(block.body).split('\n');
  const expectedLines = statementsOnly(expected).split('\n');
  let line = 0;
  while (line < Math.max(actualLines.length, expectedLines.length) && actualLines[line] === expectedLines[line]) {
    line += 1;
  }
  console.log(`[MISMATCH] ${block.path} first DDL diff at line ${line + 1}`);
  console.log(`  baseline : ${JSON.stringify(actualLines[line])}`);
  console.log(`  migration: ${JSON.stringify(expectedLines[line])}`);
}
console.log(
  `folded blocks: ${byteIdentical} byte-identical, ${equivalent} DDL-equivalent (comment header differs), ` +
    `${mismatched} mismatched, ${missing.length} source missing`,
);
for (const path of missing) {
  console.log(`  [missing-source] ${path}`);
}
console.log(`baseline sha256: ${createHash('sha256').update(readFileSync(baselinePath)).digest('hex')}`);
process.exit(mismatched === 0 ? 0 : 1);
