-- sdkwork:migration
-- id: 0051_iam_personnel_roster_indexes
-- engine: postgres
-- module: sdkwork-iam
-- purpose: The personnel roster pages members with ORDER BY joined_at and joins
--   each member's department assignments and role bindings. Add the two covering
--   indexes that page and join need so a large organization does not scan the
--   membership or assignment tables. Additive indexes only.
-- reversible: true
-- rollback: down-migration (indexes carry no data; the paired down migration
--   drops them)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

CREATE INDEX IF NOT EXISTS idx_iam_organization_membership_org_joined
    ON iam_organization_membership (tenant_id, organization_id, status, joined_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_iam_department_assignment_membership
    ON iam_department_assignment (tenant_id, organization_id, organization_membership_id, status);

COMMIT;
