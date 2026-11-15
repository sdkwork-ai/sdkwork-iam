-- sdkwork:migration
-- id: 0037_iam_official_account_server_ips
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Store the deployment's published server egress IPs on the
--   tenant-level OAuth settings row so operators maintain the WeChat official
--   account IP allowlist from the backend-admin surface instead of a process
--   environment variable. The `iam.oauth.scanLoginSettings` retrieve/update
--   surface returns and writes `serverIps`; the official-account server-info
--   tab lists them and copies one or all entries into the WeChat console.
--   Multiple IPs are supported; blank entries and duplicates are dropped on
--   write. The list is tenant-scoped and visible to the official-account
--   maintenance surfaces of the same tenant.
-- reversible: false
-- rollback: forward-fix (dropping the column would discard the operator's
--   allowlist; the prior empty state can be restored by writing an empty list,
--   so no lossy down migration is provided per DATABASE_FRAMEWORK_SPEC.md
--   section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_oauth_scan_login_config
  ADD COLUMN IF NOT EXISTS server_ips JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMIT;
