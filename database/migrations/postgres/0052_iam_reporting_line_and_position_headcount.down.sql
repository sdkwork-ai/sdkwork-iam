-- sdkwork:migration
-- id: 0052_iam_reporting_line_and_position_headcount
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Reverse the additive reporting-line and position headcount columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS idx_iam_position_reports_to;
DROP INDEX IF EXISTS idx_iam_organization_membership_reports_to;

ALTER TABLE iam_position
    DROP COLUMN IF EXISTS reports_to_position_id,
    DROP COLUMN IF EXISTS headcount;

ALTER TABLE iam_organization_membership
    DROP COLUMN IF EXISTS reports_to_membership_id;

COMMIT;
