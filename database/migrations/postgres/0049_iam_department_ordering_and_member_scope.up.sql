-- sdkwork:migration
-- id: 0049_iam_department_ordering_and_member_scope
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Personnel management needs three facts the schema cannot express
--   today: (1) sibling ordering for departments, so the identity-directory tree
--   can be reordered by drag-and-drop without rewriting `name`; (2) a
--   database-enforced "exactly one primary department per membership" and "one
--   primary position per department assignment" invariant, which today only the
--   client honours; (3) a data scope and effective window on role bindings, so
--   "设置权限" can grant a role over a department subtree for a bounded period
--   instead of only tenant-wide or organization-wide.
--
--   Additive columns plus partial unique indexes. No table is created, dropped,
--   or renamed, so the contract table registry and SQL scope classification are
--   unchanged. Two idempotent normalization statements collapse pre-existing
--   duplicate primary flags (earliest row wins) before the partial unique
--   indexes are created, so the indexes cannot fail on legacy data.
-- reversible: false
-- rollback: forward-fix (the normalization clears duplicate primary flags and a
--   down migration could not restore which rows were primary; dropping the
--   columns would also lose granted data scopes and effective windows, which
--   DATABASE_FRAMEWORK_SPEC.md section 7.1 forbids)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

ALTER TABLE iam_department
    ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_iam_department_sibling_order
    ON iam_department (tenant_id, organization_id, parent_department_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_iam_department_path
    ON iam_department (tenant_id, organization_id, path);

ALTER TABLE iam_role_binding
    ADD COLUMN IF NOT EXISTS data_scope_kind TEXT NOT NULL DEFAULT 'scope',
    ADD COLUMN IF NOT EXISTS effective_from TEXT,
    ADD COLUMN IF NOT EXISTS effective_to TEXT;

ALTER TABLE iam_role_binding
    ADD CONSTRAINT chk_iam_role_binding_data_scope_kind
    CHECK (data_scope_kind IN ('scope', 'self', 'department',
                               'department_and_children', 'organization', 'tenant'));

ALTER TABLE iam_role_binding
    ADD CONSTRAINT chk_iam_role_binding_effective_window
    CHECK (effective_to IS NULL OR effective_from IS NULL
           OR effective_to >= effective_from);

CREATE INDEX IF NOT EXISTS idx_iam_role_binding_principal
    ON iam_role_binding (tenant_id, principal_kind, principal_id,
                         scope_kind, scope_id, status);

CREATE INDEX IF NOT EXISTS idx_iam_department_assignment_department
    ON iam_department_assignment (tenant_id, organization_id, department_id,
                                  status, user_id);

-- Keep the earliest active primary per membership; clear the later flags. The
-- predicate is stable, so replaying the statement is a no-op.
UPDATE iam_department_assignment
   SET is_primary = 0
 WHERE is_primary = 1
   AND status = 'active'
   AND EXISTS (
       SELECT 1
         FROM iam_department_assignment earlier
        WHERE earlier.tenant_id = iam_department_assignment.tenant_id
          AND earlier.organization_id = iam_department_assignment.organization_id
          AND earlier.organization_membership_id
              = iam_department_assignment.organization_membership_id
          AND earlier.status = 'active'
          AND earlier.is_primary = 1
          AND (earlier.created_at, earlier.id)
              < (iam_department_assignment.created_at, iam_department_assignment.id));

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_department_assignment_primary
    ON iam_department_assignment (tenant_id, organization_id, organization_membership_id)
    WHERE is_primary = 1 AND status = 'active';

-- Same normalization for the primary position of one department assignment.
UPDATE iam_position_assignment
   SET is_primary = 0
 WHERE is_primary = 1
   AND status = 'active'
   AND EXISTS (
       SELECT 1
         FROM iam_position_assignment earlier
        WHERE earlier.tenant_id = iam_position_assignment.tenant_id
          AND earlier.organization_id = iam_position_assignment.organization_id
          AND earlier.department_assignment_id
              = iam_position_assignment.department_assignment_id
          AND earlier.status = 'active'
          AND earlier.is_primary = 1
          AND (earlier.created_at, earlier.id)
              < (iam_position_assignment.created_at, iam_position_assignment.id));

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_position_assignment_primary
    ON iam_position_assignment (tenant_id, organization_id, department_assignment_id)
    WHERE is_primary = 1 AND status = 'active';

COMMIT;
