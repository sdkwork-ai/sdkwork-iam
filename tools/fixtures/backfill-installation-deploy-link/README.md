# Backfill Installation → Deploy Link Examples

Illustrative inputs for `tools/backfill_installation_deploy_link.mjs`. They are
not a record of any real environment; the tenant and application ids are
placeholders.

- `mapping.example.json` — the confirmed mapping supplied to `--mapping`.
- `current.example.json` — an optional read-only snapshot of
  `iam_tenant_application` supplied to `--current`, used only to compute the
  dry-run's already-consistent / conflict / unmapped counters offline.

Generate the snapshot with:

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
  FROM iam_tenant_application;
```

```bash
node tools/backfill_installation_deploy_link.mjs \
  --mapping tools/fixtures/backfill-installation-deploy-link/mapping.example.json \
  --current tools/fixtures/backfill-installation-deploy-link/current.example.json
```
