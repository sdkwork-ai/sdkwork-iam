-- sdkwork:migration
-- id: 0034_drop_iam_user_official_account
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Retire the legacy per-user official-account table now that migration
--   0033 carried every row into iam_oauth_resource_account, no runtime code reads
--   it any more, and the isolated leftovers are preserved as evidence in
--   iam_official_account_migration_orphan. Dropping it removes the last piece of
--   the retired second official-account system (contract D9).
-- reversible: false
-- rollback: forward-fix (the dropped rows are gone; 0033 preserved only the ones
--   it could not carry as orphan-ledger payload_json, so this cannot be undone
--   per DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_user_official_account
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Preflight (must return 0): every legacy row is either migrated or recorded.
--   SELECT count(*) FROM iam_user_official_account oa
--    WHERE NOT EXISTS (SELECT 1 FROM iam_oauth_resource_account ra
--                       WHERE ra.id = oa.id AND ra.tenant_id = oa.tenant_id)
--      AND NOT EXISTS (SELECT 1 FROM iam_official_account_migration_orphan o
--                       WHERE o.source_account_id = oa.id);
-- Preflight (operator accepted the leftovers):
--   SELECT reason, count(*) FROM iam_official_account_migration_orphan GROUP BY reason;

BEGIN;

DROP TABLE IF EXISTS iam_user_official_account;

COMMIT;
