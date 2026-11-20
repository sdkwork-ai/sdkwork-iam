#!/usr/bin/env node
/**
 * Repository-local multi-tenant SQL scope gate (DB087 / DB100-DB102).
 *
 * `DATABASE_SPEC.md` §16 requires every runtime read or mutation of a
 * tenant-owned table to bind `tenant_id`, and every organization-scoped table to
 * bind both `tenant_id` and `organization_id`. The workspace gate
 * (`check-tenant-isolation-sql.mjs`) can only reject optional scope predicates
 * because it cannot know a table's classification; this repository-local check
 * owns that classification (`database/contract/sql-scope.json`) and the explicit
 * cross-tenant exception inventory (DB088).
 *
 * A statement is a violation when it references a classified table and
 *   * SELECT / UPDATE / DELETE does not mention the required scope column, or
 *   * INSERT does not name the required scope column,
 * unless an exception in the contract matches the file, table, verb, and (when
 * declared) a distinctive SQL fragment.
 *
 * Usage:
 *   node scripts/check-sql-tenant-scope.mjs [--root <repo>] [--json]
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(SCRIPT_DIR, '..');
const CONTRACT_PATH = 'database/contract/sql-scope.json';
const DDL_PATH = 'database/ddl/baseline/postgres/0001_iam_baseline.sql';
const SRC_ROOT = 'crates';

const SKIP_DIRS = new Set(['node_modules', 'target', 'dist', 'tests', '.git']);
const SQL_VERB = /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b/u;

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, ''));
}

/** Table name -> { tenant: boolean, org: boolean } from the baseline DDL. */
function readTableColumns(root) {
  const sql = fs.readFileSync(path.join(root, DDL_PATH), 'utf8');
  const columns = new Map();
  const tablePattern =
    /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(?:[a-z_]+\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\n\);/giu;
  let match;
  while ((match = tablePattern.exec(sql)) !== null) {
    columns.set(match[1].toLowerCase(), {
      tenant: /\btenant_id\b/u.test(match[2]),
      org: /\borganization_id\b/u.test(match[2]),
    });
  }
  return columns;
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) {
      continue;
    }
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(absolute, files);
    } else if (entry.name.endsWith('.rs')) {
      files.push(absolute);
    }
  }
  return files;
}

/**
 * Extract SQL string literals from one Rust source file.
 *
 * Raw strings (`r#"..."#`) and ordinary strings with escaped quotes count; a
 * `\`-continued multi-line statement is a normal string literal in Rust.
 * @param {string} text - Rust source.
 * @returns {Array<{ start: number, sql: string }>}
 */
function sqlFragments(text) {
  const fragments = [];
  const literal = /\br(#+)?"([\s\S]*?)"\1|"((?:[^"\\]|\\[\s\S])*)"/gu;
  let match;
  while ((match = literal.exec(text)) !== null) {
    const body = match[2] ?? match[3] ?? '';
    if (SQL_VERB.test(body) && /\biam_[a-z_]+\b/u.test(body)) {
      fragments.push({ start: match.index, sql: body });
    }
  }
  return fragments;
}

function tablesOf(sql, columns) {
  const tables = new Set();
  for (const pattern of [
    /FROM\s+([a-z_][a-z0-9_]*)/giu,
    /JOIN\s+([a-z_][a-z0-9_]*)/giu,
    /INTO\s+([a-z_][a-z0-9_]*)/giu,
    /UPDATE\s+([a-z_][a-z0-9_]*)/giu,
    /DELETE\s+FROM\s+([a-z_][a-z0-9_]*)/giu,
  ]) {
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      const name = match[1].toLowerCase();
      if (columns.has(name)) {
        tables.add(name);
      }
    }
  }
  return tables;
}

function verbOf(sql) {
  if (/\bINSERT\s+INTO\b/iu.test(sql)) return 'INSERT';
  if (/\bUPDATE\b/iu.test(sql)) return 'UPDATE';
  if (/\bDELETE\s+FROM\b/iu.test(sql)) return 'DELETE';
  return 'SELECT';
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function normalizePath(file) {
  return file.replaceAll('\\', '/');
}

/**
 * Run the repository-local SQL scope gate.
 * @param {{root?: string}} [options] - repository root.
 * @returns {{violations: object[], scanned: number, exceptions: number, root: string}}
 */
export function checkSqlTenantScope({ root = DEFAULT_ROOT } = {}) {
  const rootDir = path.resolve(root);
  const contract = readJson(path.join(rootDir, CONTRACT_PATH));
  if (contract.schemaVersion !== 1 || contract.kind !== 'sdkwork.database.sql-scope') {
    throw new Error(`${CONTRACT_PATH} must be an sdkwork.database.sql-scope v1 document.`);
  }
  const classified = contract.tables ?? {};
  const exceptions = Array.isArray(contract.exceptions) ? contract.exceptions : [];
  const columns = readTableColumns(rootDir);
  const files = walk(path.join(rootDir, SRC_ROOT));
  const violations = [];
  let scanned = 0;
  let usedExceptions = 0;

  // The classification is part of the contract, not a comment: a tenant-owned
  // table without a class is unclassified by definition (DB100), and a class for
  // a retired table is stale.
  for (const [table, info] of columns) {
    if (info.tenant && classified[table] === undefined) {
      violations.push({
        file: CONTRACT_PATH,
        line: 1,
        table,
        verb: '-',
        missing: 'classification',
        reason: `${table} carries tenant_id but is not classified in ${CONTRACT_PATH} (DB100)`,
      });
    }
  }
  for (const table of Object.keys(classified)) {
    if (!columns.has(table)) {
      violations.push({
        file: CONTRACT_PATH,
        line: 1,
        table,
        verb: '-',
        missing: 'table',
        reason: `${table} is classified in ${CONTRACT_PATH} but absent from ${DDL_PATH}`,
      });
    }
  }

  for (const file of files) {
    const relative = normalizePath(path.relative(rootDir, file));
    const text = fs.readFileSync(file, 'utf8');
    for (const fragment of sqlFragments(text)) {
      const tables = tablesOf(fragment.sql, columns);
      if (tables.size === 0) {
        continue;
      }
      const verb = verbOf(fragment.sql);
      const line = lineOf(text, fragment.start);
      for (const table of tables) {
        const declared = classified[table];
        const columnInfo = columns.get(table);
        if (declared === undefined) {
          // An unclassified table is treated as organization-scoped until the
          // owner declares otherwise (`DATABASE_SPEC.md` §26.1): silence never
          // widens access.
          violations.push({
            file: relative,
            line,
            table,
            verb,
            missing: 'classification',
            reason: `${table} is not classified in ${CONTRACT_PATH} (DB100)`,
          });
          continue;
        }
        if (declared === 'platform' || !columnInfo.tenant) {
          continue;
        }
        scanned += 1;
        const required = declared === 'organization'
          ? ['tenant_id', 'organization_id']
          : ['tenant_id'];
        const missing = required.filter((column) => !new RegExp(`\\b${column}\\b`, 'iu').test(fragment.sql));
        if (missing.length === 0) {
          continue;
        }
        const exception = exceptions.find((entry) =>
          normalizePath(entry.file) === relative
          && entry.table === table
          && (entry.verbs ?? ['SELECT', 'INSERT', 'UPDATE', 'DELETE']).includes(verb)
          && (entry.contains === undefined || fragment.sql.includes(entry.contains)));
        if (exception) {
          usedExceptions += 1;
          continue;
        }
        violations.push({
          file: relative,
          line,
          table,
          verb,
          missing: missing.join(','),
          reason: `${declared}-scoped ${table} ${verb} does not bind ${missing.join(' and ')} (DB087/DB102)`,
        });
      }
    }
  }

  return { violations, scanned, exceptions: usedExceptions, root: rootDir };
}

function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      root: { type: 'string' },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) {
    process.stdout.write('Usage: node scripts/check-sql-tenant-scope.mjs [--root <repo>] [--json]\n');
    return 0;
  }
  const result = checkSqlTenantScope({ root: values.root ?? DEFAULT_ROOT });
  if (values.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else if (result.violations.length === 0) {
    process.stdout.write(
      `tenant-scope SQL gate ok (${result.scanned} scoped statement(s), `
      + `${result.exceptions} approved exception(s))\n`,
    );
  } else {
    process.stderr.write(`tenant-scope SQL gate failed (${result.violations.length}):\n`);
    for (const violation of result.violations) {
      process.stderr.write(
        `  - ${violation.file}:${violation.line} ${violation.verb} ${violation.table}: `
        + `${violation.reason}\n`,
      );
    }
    process.stderr.write(
      `Fix the statement, or record a reviewed cross-tenant exception in ${CONTRACT_PATH}.\n`,
    );
  }
  return result.violations.length === 0 ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
