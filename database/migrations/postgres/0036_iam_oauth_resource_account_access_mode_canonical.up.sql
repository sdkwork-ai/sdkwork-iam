-- sdkwork:migration
-- id: 0036_iam_oauth_resource_account_access_mode_canonical
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Collapse the OAuth resource-account administration mode onto the two
--   canonical values and enforce them in the database.
--   `iam_oauth_resource_account.access_mode` expressed the `D1` split between a
--   caller-maintained channel and an operator-managed one, but it shipped
--   without an allowed-value constraint and the operator console wrote the
--   retired `operator_managed` spelling, so the same posture existed under two
--   strings: `operator_managed` (admin quick-setup reads/writes and older rows)
--   and `operator_authorized_account` (the shared official-account component's
--   canonical type). Readers normalize both, which masks the drift but leaves
--   the column unable to answer "which modes exist" without string archaeology.
--   This migration rewrites the retired spelling in place and adds the check
--   constraint. The backend create boundary (migration 0036's companion change
--   in `create_resource_account`) canonicalizes the retired spelling before the
--   insert, so older clients keep working while the database only ever stores
--   the canonical pair.
-- reversible: false
-- rollback: forward-fix (the retired spelling is rewritten in place and the
--   constraint cannot distinguish a row that was always canonical from a row
--   rewritten here; restoring the old spelling would re-introduce the drift)
-- transactional: true
-- lock: ROW EXCLUSIVE on iam_oauth_resource_account, ACCESS EXCLUSIVE for the
--   constraint validation scan (the table is small: one row per configured
--   channel, never per end user)
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Preflight (read-only; any row outside the three known values must be resolved
-- before this migration, because the constraint rejects it):
--   SELECT access_mode, count(*)
--     FROM iam_oauth_resource_account
--    WHERE access_mode NOT IN
--          ('self_managed_account', 'operator_authorized_account', 'operator_managed')
--    GROUP BY access_mode;
-- Preflight (retired rows this migration rewrites):
--   SELECT count(*) FROM iam_oauth_resource_account
--    WHERE access_mode = 'operator_managed';

BEGIN;

-- 1. Rewrite the retired spelling. `updated_at` is a TEXT instant in the
--    canonical API shape; a vocabulary correction is not a user edit, so the
--    row keeps its recorded timestamp and version.
UPDATE iam_oauth_resource_account
   SET access_mode = 'operator_authorized_account'
 WHERE access_mode = 'operator_managed';

-- 2. Enforce the canonical pair. DROP-if-exists keeps the migration idempotent
--    for databases where a hand-applied constraint already exists.
ALTER TABLE iam_oauth_resource_account
  DROP CONSTRAINT IF EXISTS ck_iam_oauth_resource_account_access_mode;
ALTER TABLE iam_oauth_resource_account
  ADD CONSTRAINT ck_iam_oauth_resource_account_access_mode
  CHECK (access_mode IN ('self_managed_account', 'operator_authorized_account'));

-- 3. Report, so the deployment log records how much drift was collapsed.
DO $$
DECLARE
  rewritten BIGINT;
  remaining BIGINT;
BEGIN
  SELECT count(1) INTO rewritten
    FROM iam_oauth_resource_account
   WHERE access_mode = 'operator_authorized_account';
  SELECT count(1) INTO remaining
    FROM iam_oauth_resource_account
   WHERE access_mode NOT IN ('self_managed_account', 'operator_authorized_account');
  RAISE NOTICE 'access mode canonicalization (0036): % operator-authorized row(s) on the canonical spelling, % row(s) outside the canonical pair',
    rewritten, remaining;
END
$$;

COMMIT;
