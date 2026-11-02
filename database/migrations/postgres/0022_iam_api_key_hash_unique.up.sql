-- sdkwork:migration
-- id: 0022_iam_api_key_hash_unique
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Enforce exactly one row per stored API key secret hash. The open-api
--   API key resolver performs one indexed lookup by `key_hash` and MUST NOT
--   return an arbitrary row when duplicate hashes exist. A duplicate hash is a
--   credential-integrity defect (two tenants would become selectable by one
--   presented secret), so this migration fails closed instead of deduplicating.
-- reversible: false
-- rollback: forward-fix (dropping the unique index would re-open ambiguous
--   tenant selection for duplicate hashes; a bounded reversal cannot prove
--   which duplicate row was legitimate, so this is irreversible)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_api_key_key_hash
  ON iam_api_key (key_hash);

COMMIT;
