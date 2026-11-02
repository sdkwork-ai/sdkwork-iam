-- sdkwork:migration
-- id: 0023_iam_api_key_lifecycle_columns
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Complete the API key lifecycle metadata required by IAM_SPEC §5.3.1:
--   a non-secret display prefix, the revocation instant, and the last successful
--   use instant. Existing rows keep an empty prefix; revocation metadata is only
--   authoritative for keys revoked after this migration.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard revocation and usage
--   evidence; a bounded reversal cannot restore it, so this is irreversible)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_api_key
  ADD COLUMN IF NOT EXISTS key_prefix TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revoked_at TEXT,
  ADD COLUMN IF NOT EXISTS last_used_at TEXT;

COMMIT;
