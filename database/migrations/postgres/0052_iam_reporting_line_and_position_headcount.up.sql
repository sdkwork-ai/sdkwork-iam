-- sdkwork:migration
-- id: 0052_iam_reporting_line_and_position_headcount
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Align the personnel model with the enterprise reference model. Two
--   facts were missing: (1) a person-to-person reporting line, so an org chart
--   is not limited to "department has one manager"; (2) a position headcount and
--   a position reporting line, so a job catalog can express an approved opening
--   and the position hierarchy that Workday/SAP call the position model rather
--   than only a job code. Additive nullable columns plus one lookup index; no
--   table is created or renamed.
-- reversible: true
-- rollback: down-migration (the paired down migration drops the three columns
--   and the index; existing rows keep their values until then)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE iam_organization_membership
    ADD COLUMN IF NOT EXISTS reports_to_membership_id TEXT;

ALTER TABLE iam_position
    ADD COLUMN IF NOT EXISTS headcount INTEGER,
    ADD COLUMN IF NOT EXISTS reports_to_position_id TEXT;

CREATE INDEX IF NOT EXISTS idx_iam_organization_membership_reports_to
    ON iam_organization_membership (tenant_id, organization_id, reports_to_membership_id);

CREATE INDEX IF NOT EXISTS idx_iam_position_reports_to
    ON iam_position (tenant_id, organization_id, reports_to_position_id);

COMMIT;
