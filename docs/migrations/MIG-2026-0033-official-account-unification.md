# MIG-2026-0033 Official Account Unification

| Field | Value |
| --- | --- |
| Owner | `sdkwork-iam` maintainers |
| Status | completed (development), pending per-environment deployment |
| Type | database |
| Updated | 2026-11-15 |
| Related standards | `DATABASE_FRAMEWORK_SPEC.md`, `MIGRATION_SPEC.md`, `DESTRUCTIVE_OPERATION_SPEC.md` |

```yaml
id: MIG-2026-0033
type: database
status: completed
strategy: expand-contract
scope:
  producers:
    - sdkwork-iam (iam_oauth_resource_account, iam_oauth_integration, iam_oauth_client, iam_oauth_surface, iam_oauth_secret, iam_oauth_webhook_config)
  consumers:
    - sdkwork-cloudrouter (admin official accounts, console self-service)
    - sdkwork-webserver (admin official accounts, console self-service)
    - sdkwork-birdcoder2 / sdkwork-daxuedazi (settings self-service)
compatibility_window:
  starts_at: 2026-11-15
  ends_at: same release train (no external consumer of the legacy table)
rollback:
  supported: false
  steps:
    - forward-fix only; 0033 rewrites the only authoritative copy of every channel configuration
verification:
  - pnpm run db:validate
  - node --test tests/static/governance/iam-database-init-standard.test.mjs
  - pnpm db:plan / pnpm db:migrate / pnpm db:status
  - cargo test -p sdkwork-routes-iam-backend-api access_mode_accepts
```

## 1. What Changed

The per-user WeChat official-account aggregate `iam_user_official_account` is retired. Every
row is carried into `iam_oauth_resource_account` with its **id preserved verbatim** (the
already-published `/iam/v3/api/iam/oauth/official_accounts/{accountId}/wechat/notify` callback
addresses that id). Self-service ownership is expressed with `access_mode` +
`maintainer_user_id` instead of a separate per-user table.

The app-api (`/app/v3/api/iam/oauth/official_accounts`) and open-api (`.../wechat/notify`)
route registration is byte-identical to the previous commit; only the storage aggregate moved.

| Migration | Role | Reversible |
| --- | --- | --- |
| `0031_iam_user_official_account_domains` | adds the protected-domain and encrypt-mode columns the app-api serves | yes |
| `0032_iam_role_catalog_localization` | role catalog locale columns (same pending batch, unrelated domain) | yes |
| `0033_official_account_unification` | carries legacy rows into the canonical aggregate, isolates collisions, adds `maintainer_user_id` + indexes | no (forward-fix) |
| `0034_drop_iam_user_official_account` | **P4**: drops the legacy table after human approval | no (forward-fix) |
| `0035_official_account_orphan_client_cleanup` | removes the unbound OAuth client + web surface 0033 leaves for an isolated legacy row | no (forward-fix) |
| `0036_iam_oauth_resource_account_access_mode_canonical` | rewrites the retired `operator_managed` spelling and adds the `access_mode` CHECK | no (forward-fix) |

## 2. Preflight

Run against the target database before applying the batch. Every query is read-only.

```sql
-- 0033: AppID groups that will collide (duplicate legacy rows, or an AppID already
-- owned by a canonical account). Each reported group keeps at most one migrated row.
SELECT oa.tenant_id, oa.app_id, COUNT(*) AS legacy_rows,
       (SELECT string_agg(ra.id || ' (' || ra.access_mode || ')', ', ')
          FROM iam_oauth_resource_account ra
         WHERE ra.tenant_id = oa.tenant_id AND ra.organization_id = '0'
           AND ra.provider_code = 'wechat' AND ra.resource_account_kind = 'official_account'
           AND ra.provider_account_id = oa.app_id) AS occupying_resource_accounts
  FROM iam_user_official_account oa
 GROUP BY oa.tenant_id, oa.app_id
HAVING COUNT(*) > 1
    OR EXISTS (SELECT 1 FROM iam_oauth_resource_account ra
                WHERE ra.tenant_id = oa.tenant_id AND ra.organization_id = '0'
                  AND ra.provider_code = 'wechat' AND ra.resource_account_kind = 'official_account'
                  AND ra.provider_account_id = oa.app_id);

-- 0034 (P4 gate): must return 0. Every legacy row is migrated or recorded.
SELECT count(*) FROM iam_user_official_account oa
 WHERE NOT EXISTS (SELECT 1 FROM iam_oauth_resource_account ra
                    WHERE ra.id = oa.id AND ra.tenant_id = oa.tenant_id)
   AND NOT EXISTS (SELECT 1 FROM iam_official_account_migration_orphan o
                    WHERE o.source_account_id = oa.id);

-- 0034 (P4 gate): the isolated leftovers an operator accepts before the drop.
SELECT reason, count(*) FROM iam_official_account_migration_orphan GROUP BY reason;

-- 0036: any value outside the three known modes blocks the CHECK and must be resolved first.
SELECT access_mode, count(*) FROM iam_oauth_resource_account
 WHERE access_mode NOT IN ('self_managed_account', 'operator_authorized_account', 'operator_managed')
 GROUP BY access_mode;
```

## 3. Rehearsal Evidence

A real PostgreSQL 16.4 cluster was provisioned with the schema snapshot of the pre-`0033`
commit (`2a258da7^`), seeded with production-shaped legacy data, then migrated.

| Scenario | Expectation | Result |
| --- | --- | --- |
| Complete channel (AppSecret + notify token + AES key, callback URL padded with spaces, `safe` mode, domains/logo/menu) | id kept, `access_mode = self_managed_account`, `maintainer_user_id` = owner, profile JSON + webhook (trimmed URL, sha256 integrity hash) + 3 secrets | pass |
| Credential-less disabled channel | `self_managed_config_status = missing`, `enabled = 0`, no webhook/secret | pass |
| Duplicate AppID (newer row) | older row migrates, newer row isolated as `provider_account_conflict` | pass |
| AppID already owned by an operator-authorized account | legacy row isolated, occupying account untouched | pass |
| Tenant without an enabled tenant application | integration falls back to the platform sentinel app `0` | pass |
| Greenfield install from the folded baseline | no legacy table, no rows, `maintainer_user_id` + unique index present | pass |
| `0034` on a clone | legacy table dropped; canonical rows, webhooks, secrets, isolation ledger survive | pass |
| `0036` applied twice on a database with `operator_managed` rows | retired spelling rewritten, self-managed row untouched, unknown value rejected by the CHECK, idempotent | pass |

The rehearsal exposed the `0035` defect: `0033` created the WeChat OAuth client (and an enabled
web surface) before isolating a provider-identity conflict, so the isolated row left an
unreferenced enabled client behind. The backend resolves an integration's `providerClientId`
from its first enabled client, so the artifact could make the integration report the wrong
AppID. `0035` removes exactly those rows and nothing else.

## 4. Execution Record

Development database `sdkwork_ai_dev` (PostgreSQL 16.4) was at IAM `0030` with zero legacy rows:

| Step | Result |
| --- | --- |
| `pnpm db:plan` | pending `0031`–`0035` |
| `pnpm db:migrate` | `applied 5 migration(s)` (0031, 0032, 0033, **0034 P4**, 0035) |
| post-check | legacy table dropped, `maintainer_user_id` + indexes + isolation ledger present |
| `pnpm db:status` | `status=clean pending_migrations=0` |
| `pnpm db:migrate` (0036) | `applied 1 migration(s)`; constraint `ck_iam_oauth_resource_account_access_mode` present |

Recorded checksums (prefix): `0033 4136a103…`, `0034 55be1d72…`, `0035 805374f0…`, `0036 d44a3b9b…`.

Other environments are not migrated by this record; each deployment applies the same ordered
batch through `db:migrate`, and the P4 preflight above must return 0 first.

## 5. Rollback And Residual Risk

- `0033`–`0036` are irreversible by design (`DATABASE_FRAMEWORK_SPEC.md` §7.1): forward-fix.
  Before `0034` runs, the only copy of the legacy rows is `iam_user_official_account`;
  afterwards the migrated rows and the isolation ledger are the record.
- The isolation ledger stores credential **presence flags**, not secret references. An isolated
  row's secrets cannot be recovered after the legacy table is dropped; that is intentional
  (credentials are never duplicated into an evidence table) and must be understood before
  approving P4.
- The isolation predicate matches on `id`; a legacy id that already exists as an unrelated
  canonical row is neither migrated nor recorded. Id collision across these tables is not
  expected, but it is not checked.
- `iam_official_account_migration_orphan` is retained after `0034` as review evidence; it is not
  an owned runtime table and no runtime code reads it. `0033`'s frozen provenance header still
  says the ledger retires with the legacy table — this record supersedes that wording.

## 6. Verification Commands

```bash
pnpm run db:validate
node --test tests/static/governance/iam-database-init-standard.test.mjs
pnpm db:plan && pnpm db:migrate && pnpm db:status
cargo test -p sdkwork-routes-iam-backend-api access_mode_accepts
```
