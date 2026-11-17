-- sdkwork:migration
-- id: 0038_retire_official_account_migration_orphan
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Retire the migration-only orphan ledger to finish P4
--   (docs/migrations/MIG-2026-0033-official-account-unification.md). 0034 dropped
--   the legacy iam_user_official_account table but deliberately kept
--   iam_official_account_migration_orphan so the isolated rows stayed
--   reviewable; no runtime code has ever read it. Dropping it completes the
--   retirement of the second official-account system (contract D9) and lets the
--   database contract registries stop listing a table the runtime never owns.
-- reversible: false
-- rollback: forward-fix (dropped evidence cannot be restored; the preflight
--   refuses to drop a ledger that still holds unreviewed rows, so a database
--   with leftovers is never silently discarded)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_official_account_migration_orphan
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Preflight (must return 0 before applying):
--   SELECT count(*) FROM iam_official_account_migration_orphan;
-- Review the leftover ledger rows with:
--   SELECT reason, count(*) FROM iam_official_account_migration_orphan GROUP BY reason;
-- The migration itself enforces the same rule and raises instead of dropping a
-- ledger that still holds rows.

BEGIN;

DO $$
DECLARE
    orphan_count BIGINT;
BEGIN
    IF to_regclass('iam_official_account_migration_orphan') IS NULL THEN
        RETURN;
    END IF;
    EXECUTE 'SELECT count(*) FROM iam_official_account_migration_orphan' INTO orphan_count;
    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'iam_official_account_migration_orphan still holds % unreviewed row(s); review or re-append them before retiring the ledger',
            orphan_count;
    END IF;
END $$;

DROP TABLE IF EXISTS iam_official_account_migration_orphan;

COMMIT;
