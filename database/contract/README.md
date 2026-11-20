# Database Contracts

The authored contracts that describe the IAM authoritative PostgreSQL schema.

| File | Owner of | Consumed by |
| --- | --- | --- |
| `schema.yaml` | Module contract: table inventory, lifecycle, owner | `check-database-framework-standard.mjs`, contract parity tests |
| `table-registry.json` | Materialized table registry | `iam-database-contract-alignment.test.mjs` |
| `prefix-registry.json` | Table prefix ownership | framework standard check |
| `sql-scope.json` | Runtime SQL scope classification and the reviewed cross-tenant exception inventory (`DATABASE_SPEC.md` §16, DB087/DB100-DB102) | `scripts/check-sql-tenant-scope.mjs` (`pnpm run check:sql-scope`) |

## `sql-scope.json`

`tables` classifies every table that carries `tenant_id`:

- `tenant` — rows are partitioned by `tenant_id`; every runtime read or mutation
  must bind it (DB087, DB101).
- `organization` — rows are partitioned by `tenant_id` and `organization_id`;
  every runtime read or mutation must bind both (DB102). `0` is the tenant-global
  sentinel and is only valid through an explicit visibility rule.
- `platform` — a platform/global table outside the tenant matrix.

An unclassified table fails the gate: silence never widens access (§26.1).

`exceptions` is the reviewed cross-tenant inventory (DB088). Each entry names the
exact file, table, and verb it covers, and carries the reason the scope predicate
is absent — for example an opaque credential hash that is itself the selector, or
a client-local SQLite store. Add an entry only after confirming the statement
cannot reach another tenant's rows; a new unscoped statement fails the gate until
it is either fixed or inventoried.

Run `pnpm run check:sql-scope` for the gate alone, or `pnpm run check:database`
for the full database contract lane.
