-- sdkwork:migration
-- id: 0057_iam_role_relation_integrity
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Enforce tenant-scoped RBAC references without silently cascading
--   authorization history. Existing orphan rows block migration for review.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM iam_role_permission rp
        LEFT JOIN iam_role r ON r.tenant_id = rp.tenant_id AND r.id = rp.role_id
        WHERE r.id IS NULL
    ) THEN
        RAISE EXCEPTION 'iam_role_permission contains orphan role references';
    END IF;
    IF EXISTS (
        SELECT 1 FROM iam_role_permission rp
        LEFT JOIN iam_permission p ON p.id = rp.permission_id
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'iam_role_permission contains orphan permission references';
    END IF;
    IF EXISTS (
        SELECT 1 FROM iam_role_binding rb
        LEFT JOIN iam_role r ON r.tenant_id = rb.tenant_id AND r.id = rb.role_id
        WHERE r.id IS NULL
    ) THEN
        RAISE EXCEPTION 'iam_role_binding contains orphan role references';
    END IF;
END;
$$;

ALTER TABLE iam_role
    ADD CONSTRAINT uk_iam_role_tenant_id UNIQUE (tenant_id, id);

ALTER TABLE iam_role_permission
    ADD CONSTRAINT fk_iam_role_permission_role
    FOREIGN KEY (tenant_id, role_id) REFERENCES iam_role (tenant_id, id)
    ON DELETE RESTRICT NOT VALID;
ALTER TABLE iam_role_permission
    ADD CONSTRAINT fk_iam_role_permission_permission
    FOREIGN KEY (permission_id) REFERENCES iam_permission (id)
    ON DELETE RESTRICT NOT VALID;
ALTER TABLE iam_role_binding
    ADD CONSTRAINT fk_iam_role_binding_role
    FOREIGN KEY (tenant_id, role_id) REFERENCES iam_role (tenant_id, id)
    ON DELETE RESTRICT NOT VALID;

ALTER TABLE iam_role_permission
    VALIDATE CONSTRAINT fk_iam_role_permission_role;
ALTER TABLE iam_role_permission
    VALIDATE CONSTRAINT fk_iam_role_permission_permission;
ALTER TABLE iam_role_binding
    VALIDATE CONSTRAINT fk_iam_role_binding_role;

COMMIT;
