-- sdkwork:migration
-- id: 0051_iam_personnel_roster_indexes
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Reverse the additive roster indexes.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS idx_iam_department_assignment_membership;
DROP INDEX IF EXISTS idx_iam_organization_membership_org_joined;

COMMIT;
