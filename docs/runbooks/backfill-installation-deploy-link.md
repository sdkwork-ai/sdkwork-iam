# Backfill: Installation → Deploy Application Link

Status: active
Owner: SDKWork IAM maintainers
Related migration: `0040_installation_deploy_link_and_provisioning_state`
Tool: [`tools/backfill_installation_deploy_link.mjs`](../../tools/backfill_installation_deploy_link.mjs)
Tests: [`tools/backfill_installation_deploy_link.test.mjs`](../../tools/backfill_installation_deploy_link.test.mjs)

## Why this exists

`iam_application_installation.deploy_application_id` is nullable on purpose. An
installation created before migration 0040 has no link, and IAM fails closed
without one: deployment access-token issuance and the gateway both refuse to
name an application. IAM cannot derive the value from its own columns — the
deployment inventory (`deploy_app`) is owned by `sdkwork-deployments` and is
reached by value, not by a foreign key — so the link is an explicit fact
confirmed by the two owners.

This runbook backfills that link. It never guesses. The tool generates SQL; a
human reviews it and runs it with `psql`. The tool itself does not connect to a
database, does not execute a write, and does not change the schema.

## Consistency audit

Run these read-only checks against the IAM database before and after a repair.
They cover the cross-service facts IAM cannot enforce itself:

```sql
-- 1) The anchor names no deploy application in the inventory (IAM cannot see
--    deploy_app; the join is by id value, not a foreign key).
SELECT i.id, i.deploy_application_id
FROM iam_application_installation i
LEFT JOIN deploy_app d
  ON d.id::text = trim(i.deploy_application_id)
 AND d.tenant_id::text = i.tenant_id
 AND d.deleted_at IS NULL
WHERE coalesce(trim(i.deploy_application_id), '') <> '' AND d.id IS NULL;

-- 2) A relying party lives on an unbound installation: its login can never name
--    a deployment.
SELECT id, runtime_config_json #>> '{oauth,relyingParty,clientId}'
FROM iam_application_installation
WHERE coalesce(trim(deploy_application_id), '') = ''
  AND jsonb_typeof(runtime_config_json #> '{oauth,relyingParty}') = 'object';

-- 3) Enabled without a primary domain: enable_tenant_application refuses this
--    shape, so the row predates the guard.
SELECT id FROM iam_application_installation
WHERE status = 'enabled' AND coalesce(trim(primary_domain), '') = '';

-- 4) An empty access scope cannot be intersected into a credential.
SELECT id FROM iam_application_installation
WHERE coalesce(jsonb_array_length(access_permissions_json), 0) = 0;

-- 5) Child rows of another tenant or of a deleted installation.
SELECT count(*) FROM iam_application_installation_environment e
WHERE NOT EXISTS (
  SELECT 1 FROM iam_application_installation i
  WHERE i.id = e.installation_id AND i.tenant_id = e.tenant_id);
SELECT count(*) FROM iam_application_installation_credential c
WHERE NOT EXISTS (
  SELECT 1 FROM iam_application_installation_environment e
  WHERE e.id = c.installation_environment_id AND e.tenant_id = c.tenant_id);
```

A row failing (1) cannot be repaired by binding: the deploy inventory has no such
application, so either the deployment must register one (then reconcile), or the
row is a legacy duplicate to retire. A row failing (2) needs the same decision as
the client move: the client belongs on the installation that serves the
deployment, never on an unbound row.

Do not retire an unbound row before checking the sessions it already issued:

```sql
-- 6) Live sessions carry the runtime app id, so an "unused" legacy row may still
--    own thousands of sessions. Deleting it drops their identity.
SELECT i.id, i.app_id, count(s.*) AS sessions
FROM iam_application_installation i
LEFT JOIN iam_session s ON s.app_id = i.app_id
WHERE coalesce(trim(i.deploy_application_id), '') = ''
GROUP BY i.id, i.app_id
ORDER BY sessions DESC;
```

`iam_application_installation` has no `deleted_at`: the only retirement paths are
`status = 'disabled'` (stops issuance, keeps the row) and the platform
bootstrap's delete-and-reinsert. An unbound row that already owns sessions is
therefore not a duplicate to archive — it needs its own deploy application
registered, and then `installations.reconcile` binds it.

The tenant platform row (`tapp_<tenant>_0_sdkwork_platform`, runtime app id
`app_<tenant>`) takes its anchor from `SDKWORK_DEPLOY_APPLICATION_ID`; a
deployment that never sets that variable leaves the platform installation unbound
and no data repair can supply the value.

### When no application exists (decision required)

The deploy inventory is the only authority for an anchor. Check it before
repairing anything:

```sql
-- 7) Applications that no installation serves yet (candidate targets).
SELECT d.id, d.slug, d.app_kind, d.created_at
FROM deploy_app d
WHERE d.tenant_id = <tenant> AND d.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM iam_application_installation i
    WHERE trim(i.deploy_application_id) = d.id::text);
```

If the row has no matching application, there are exactly two answers, and
neither is a data repair:

- **Register one** in the deployments service (its kind must match the
  installation's `application_type`), then `installations.reconcile` binds it.
- **Retire the row** — allowed only when check (6) reports zero live sessions, and
  recorded as a deliberate deletion with an audit row and a pre-image backup.

Never bind a row to an application whose kind contradicts its
`application_type`, and never delete a row that still owns sessions: the runtime
app id on those sessions is the identity they authenticate with.


A single unanchored installation is repaired through IAM's own update surface,
not through SQL. The update command carries `deployApplicationId` and fills a
**missing** anchor; it answers `409` when the request would break the one-to-one
relation instead of overwriting it.

The same repair is also available as the readiness-driven pair, which is what a
deploy pipeline should call when it must not hold the general update boundary:
`GET /backend/v3/api/iam/installations/{installationId}/readiness` lists the
defect codes (an unbound anchor, a missing relying party, a disabled lifecycle,
an empty environment) and `POST .../reconcile` repairs the additive subset with
`iam.installations.reconcile`, accepts `dryRun`, and returns the readiness
document before and after the write.

```http
PATCH /backend/v3/api/iam/installations/{installationId}
{
  "authToken": "<super-admin bootstrap token>",
  "tenantId": "100001",
  "deployApplicationId": "382418217538162688"
}
```

The tenant-console variant is
`PATCH /backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}`
with `deployApplicationId` in the body and the caller's own session.

The generated SDK exposes the same operation:

```typescript
import { createClient } from '@sdkwork/iam-backend-sdk';

await createClient({ /* baseUrl, dual-token manager */ }).iam.installations.update(
  { installationId },
  { deployApplicationId, tenantId, authToken },
);
```

Rules the API enforces:

| Request | Answer |
| --- | --- |
| row has no anchor | anchor is written, installation is returned |
| row already serves the same deploy application | idempotent success, nothing written |
| row serves a different deploy application | `409` — a re-point is a deploy identity migration, not a repair |
| deploy application already serves another installation | `409` — the one-to-one index `uk_iam_application_installation_deploy` |
| blank `deployApplicationId` | `400` — the value is required when the field is present |

After the bind, two reads prove the repair without a relogin:

1. the installation reports `deployApplicationId`;
2. the hosted login bootstrap (`POST /app/v3/api/oauth/authorizations` with the
   relying party's `clientId` and `redirectUri`) answers `201` instead of
   `OAuth client ... is not bound to a deploy application`.

The deployment access token is minted from the deploy application, so a new
token issued after the bind carries the anchor; an already-issued token that
named no application must be regenerated by its host
(`sdkwork-deployments` app-token exchange), not by this repository.

Use the SQL backfill below when there is no reachable IAM API (a historical
import or a bulk migration), or when the deployment owner must confirm many
pairs at once. For one installation, the API is the supported path.

## Input contract

`--mapping <path.json>` is a JSON array:

```json
[
  {
    "tenantId": "100001",
    "installationAppId": "app_100001",
    "deployApplicationId": "410000000000000001"
  }
]
```

| Field | Meaning |
| --- | --- |
| `tenantId` | `iam_application_installation.tenant_id` (text) |
| `installationAppId` | `iam_application_installation.app_id` (globally unique) |
| `deployApplicationId` | the deployment application this installation serves |

For an installation provisioned by `sdkwork-deployments`, `deployApplicationId`
is the deployment application's `deploy_app.id` rendered as a **decimal string**,
never the uuid: the deploy provisioning adapter sends `id.to_string()` and the
deployment access token's subject is that same value. A platform installation
may instead carry the explicitly configured
`SDKWORK_DEPLOY_APPLICATION_ID` anchor. The tool warns when the value is not
a decimal id; treat that warning as a prompt to confirm the value with the
deployment owner, not as proof that it is wrong.

## Build the mapping (no guessing)

1. List the unlinked installations:

   ```sql
   SELECT tenant_id, app_id, instance_key, display_name, status, updated_at
     FROM iam_application_installation
    WHERE deploy_application_id IS NULL
    ORDER BY tenant_id, app_id;
   ```

2. Ask the deployment owner to resolve each row against the deployment
   inventory. They can list the candidates with:

   ```sql
   SELECT id, uuid, tenant_id, slug, name
     FROM deploy_app
    WHERE deleted_at IS NULL
    ORDER BY tenant_id, id;
   ```

3. Write only the confirmed pairs to the mapping file. Leave every unresolved
   installation out: it stays `NULL` and is reported by the report query.

Slugs and names are not identity. `iam_application_installation.app_id` and
`deploy_app.id` are the keys; matching by display name or slug would invent a
link, which is worse than a missing one.

## Validation rules

The tool refuses to generate SQL (exit code `2`) when:

- the document is not a JSON array of objects;
- a row is missing `tenantId`, `installationAppId`, or `deployApplicationId`,
  or the value is blank/non-string/contains control characters;
- a row contains an unknown field (catches `tenant_id`-style drift);
- one `installationAppId` appears more than once — `app_id` is globally unique,
  so two links would describe the same installation twice;
- one `deployApplicationId` appears more than once — the partial unique index
  `uk_iam_application_installation_deploy` allows one installation per deployment
  application.

An empty array is valid: it generates a no-op plan, which is useful for
confirming that nothing is left to map.

## Procedure

### 1. Dry-run (default)

```bash
node tools/backfill_installation_deploy_link.mjs \
  --mapping tools/fixtures/backfill-installation-deploy-link/mapping.example.json \
  --current tools/fixtures/backfill-installation-deploy-link/current.example.json
```

The output contains:

- the impact counters — will update (N), already consistent (M), conflict (K),
  still unmapped (U);
- a read-only **PREFLIGHT** query (exact counters, computed by PostgreSQL);
- the guarded **apply** SQL (review only);
- a read-only **REPORT** query (installations still unlinked).

The tool cannot query the database, so without `--current` the M/K/U counters
are `unknown`. `--current` is an optional read-only snapshot in the same shape
as the mapping (`deployApplicationId` may be `null`), which turns those counters
into exact numbers offline:

```sql
SELECT COALESCE(
           json_agg(
               json_build_object(
                   'tenantId', tenant_id,
                   'installationAppId', app_id,
                   'deployApplicationId', deploy_application_id
               )
               ORDER BY tenant_id, app_id
           ),
           '[]'::json
       )
  FROM iam_application_installation;
```

### 2. Review the SQL

Every generated statement has the form:

```sql
UPDATE iam_application_installation
   SET deploy_application_id = '410000000000000001',
       updated_at = NOW()
 WHERE tenant_id = '100001'
   AND app_id = 'app_100001'
   AND deploy_application_id IS NULL;
```

The `deploy_application_id IS NULL` predicate is the safety property: an
existing link is never overwritten, and re-running the file is idempotent. The
transaction (`BEGIN` / `COMMIT`) means a collision with
`uk_iam_application_installation_deploy` aborts the whole batch instead of leaving a
partial backfill.

The preflight classifies each mapping row as `would_update`,
`already_consistent`, `linked_elsewhere`, `deploy_application_claimed`, or
`installation_missing`. When a `--current` snapshot proves any conflict,
`--apply` refuses (exit code `1`) and writes no SQL; resolve the conflict first.

### 3. Run the PREFLIGHT query

Execute the preflight SQL from the dry-run output in psql (read-only). It must
return:

| metric | expected |
| --- | --- |
| `will_update` | N (the number you are about to link) |
| `already_consistent` | M |
| `conflict` | K; its detail query row count must equal K |
| `still_unmapped` | U (installations this mapping does not cover) |

### 4. Generate and execute the apply SQL

```bash
node tools/backfill_installation_deploy_link.mjs \
  --mapping mapping.json \
  --current current.json \
  --apply --out backfill-installation-deploy-link.sql

psql "$SDKWORK_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f backfill-installation-deploy-link.sql
```

`--apply` refuses when the snapshot proves a conflict. Omit `--current` only
when you accept that conflicts can only be caught by the preflight query and the
unique index at execution time.

### 5. Re-run the report and verify

Generate the report SQL and run it:

```bash
node tools/backfill_installation_deploy_link.mjs --mapping mapping.json --report \
  > report-unmapped-installations.sql
psql "$SDKWORK_DATABASE_URL" -v ON_ERROR_STOP=1 -f report-unmapped-installations.sql
```

Every remaining `deploy_application_id IS NULL` row must be one the deployment
owner explicitly could not match. A non-null `pending_deploy_application_id`
means the mapping covers the row but the apply did not link it — re-check the
preflight.

Finally, confirm the link works end to end: issue a deployment access token
and route through the gateway. An unlinked installation fails closed with
"installation is not bound to a deploy application", which is the exact symptom
this backfill removes.

### 6. Idempotence check

Run the apply SQL a second time. It must report `UPDATE 0` for every statement
(each `WHERE ... IS NULL` no longer matches). If any statement updates a row,
the link changed underneath the mapping; stop and investigate.

## Undo

There is no automatic rollback. The apply only fills `NULL` rows, so it cannot
have overwritten a link. A wrongly confirmed pair must be corrected by a
separate, reviewed `UPDATE` against the exact `(tenant_id, app_id)`; do not null
links in bulk. Record the mapping file used, because it is the audit trail of
which pairs were applied.

## Boundaries

- No schema change and no migration in this procedure; migration 0040 owns the
  columns.
- The tool never connects to PostgreSQL and never executes SQL. `psql` is the
  only writer, and only for the generated `UPDATE` statements.
- `--current` is a point-in-time snapshot used for review counters. The
  PREFLIGHT query is the authoritative check immediately before apply.
