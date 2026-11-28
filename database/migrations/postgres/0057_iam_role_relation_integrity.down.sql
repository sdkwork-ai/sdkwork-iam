-- sdkwork:migration
-- id: 0057_iam_role_relation_integrity
-- engine: postgres
-- module: sdkwork-iam
-- reversible: true
-- rollback: down-migration
-- transactional: true

BEGIN;

ALTER TABLE iam_role_binding
    DROP CONSTRAINT IF EXISTS fk_iam_role_binding_role;
ALTER TABLE iam_role_permission
    DROP CONSTRAINT IF EXISTS fk_iam_role_permission_permission,
    DROP CONSTRAINT IF EXISTS fk_iam_role_permission_role;
ALTER TABLE iam_role
    DROP CONSTRAINT IF EXISTS uk_iam_role_tenant_id;

COMMIT;
