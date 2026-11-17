# IAM Database Module

Canonical authoritative-server lifecycle assets for `sdkwork-iam` under `DATABASE_FRAMEWORK_SPEC.md`.

- `databaseRole`: `authoritative-server`
- `moduleId`: `iam`
- `serviceCode`: `IAM`
- `tablePrefix`: `iam_`
- `contract tables`: 67 (all `active`), listed in `contract/schema.yaml`
- `engine`: PostgreSQL only
- `baselineStrategy`: `baseline-plus-migrations`
- `autoMigrate`: disabled by default
- `seed`: `operational` profile, `zh-CN` default locale, active locales `zh-CN` + `en-US`

## Layout

1. `database/ddl/baseline/postgres/0001_iam_baseline.sql` is the greenfield PostgreSQL DDL snapshot. Post-baseline migrations are folded into it under a `-- folded migration:` marker, so a fresh install and an upgraded install converge on the same schema.
2. `database/migrations/postgres/` contains versioned incremental migrations with explicit lock, timeout, rollback, and transaction metadata.
3. `database/seeds/common/` holds language-neutral reference data only: stable codes, ordering, status, and catalog ownership. Display copy never lives here.
4. `database/seeds/locales/<locale>/` holds one file per locale for persisted display text (`label_i18n` / `description_i18n` locale maps on `iam_persona_role`, `iam_persona_interest`, and `iam_role`), so activating a locale needs no schema migration.
5. `database/drift/` declares non-mutating drift policy.

SQLite is not part of this authoritative database root. Any embedded SQLite adapter is non-authoritative and must own a separate `client-local` lifecycle contract before production use.

Lifecycle orchestration is implemented by `crates/sdkwork-iam-database-host` through the `sdkwork-iam-db` CLI. Production startup does not auto-migrate; migrations are an explicit governed operation.

## Initialization state

This module installs greenfield deployments with one canonical baseline plus every ordered forward migration, and seeds `common` plus the active locales:

1. **Baseline** — `database/ddl/baseline/{engine}/0001_iam_baseline.sql` contains the bootstrap DDL anchor. It is not the whole schema on its own: a fresh install applies the baseline followed by every migration in `database/migrations/{engine}/`.
2. **Migrations** — `database/migrations/{engine}/` carries the post-baseline schema history. Historical entries are checksum-immutable; a correction is a new forward migration.
3. **Seeds** — `seeds/seed.manifest.json` declares `i18nVersion`, `defaultLocale`, `fallbackLocale`, `supportedLocales`, `activeLocales`, per-locale set versions/checksums, and the `minimal` / `standard` / `operational` profiles.
4. **Drift** — run `pnpm db:drift:check` before release.
5. **Folded legacy retirement** — the pre-template application model (`iam_application`, `iam_application_package`), the Studio catalog (13 `studio_*` tables), and the legacy personnel table (`iam_organization_member`) are retired completely: the baseline neither declares nor drops any of them. The folded `0006_iam_application_standard` block was removed outright because all six statements in it only re-declared canonical indexes, and the folded `0007_drop_legacy_studio_tables` block was removed with it. Consequences to keep in mind when repairing the lifecycle: an install created before any of those models is no longer converged by the baseline, and restoring a source migration from history would bring the retirement DDL back, so it must be reviewed rather than copied back. Eight folded blocks (`0008`–`0015`) still have no committed source migration; `tools/fold-migration-into-baseline.mjs` reports them as `[missing-source]`, and `tests/static/governance/iam-database-init-standard.test.mjs` pins the exact set, the order, and the absence of legacy residue.
6. **Known folded-block defects (pinned, not blessed)** — `0012_iam_service_account_credentials` is folded twice, and the second copy sits after `0013`; it re-applies `SET NOT NULL` to `iam_session.principal_id`, which `0013` drops, so the effective end state contradicts migration order. `0008` and `0009` also carried different names in earlier revisions (`0008_iam_rbac_federation` → `0008_iam_query_performance_indexes`, `0009_iam_rbac_subject_extensions` → `0009_wechat_identity_scope`), so only a database that applied an earlier revision can tell them apart. `tests/static/governance/iam-database-init-standard.test.mjs` pins both the block order and this contradiction so neither changes silently; resolving them is a reviewed change that also updates the ledger.

## Commands

```bash
pnpm run db:validate
pnpm run db:materialize:contract
pnpm run db:plan
pnpm run db:init
pnpm run db:migrate
pnpm run db:seed
pnpm run db:bootstrap
pnpm run db:status
pnpm run db:drift:check
pnpm run check:database
```
