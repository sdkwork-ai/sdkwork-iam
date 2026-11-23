-- sdkwork:migration
-- id: 0053_iam_personnel_semantics_comments
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Clear the semantics comments added by 0053.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

COMMENT ON COLUMN iam_organization_membership.reports_to_membership_id IS NULL;
COMMENT ON COLUMN iam_position.headcount IS NULL;
COMMENT ON COLUMN iam_role_binding.condition_json IS NULL;

COMMIT;
