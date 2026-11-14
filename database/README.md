# IAM Database Module

Canonical authoritative-server lifecycle assets for `sdkwork-iam` under `DATABASE_FRAMEWORK_SPEC.md`.

- `databaseRole`: `authoritative-server`
- `moduleId`: `iam`
- `serviceCode`: `IAM`
- `tablePrefix`: `iam_`
- `contract tables`: 64, listed in `contract/schema.yaml`
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
