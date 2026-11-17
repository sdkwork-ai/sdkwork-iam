-- sdkwork:migration
-- id: 0040_installation_deploy_link_and_provisioning_state
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Reverse the installation link and provisioning-state columns.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_tenant_application
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

DROP INDEX IF EXISTS uk_iam_tenant_application_provisioning_key;
DROP INDEX IF EXISTS uk_iam_tenant_application_deploy;

ALTER TABLE iam_tenant_application
    DROP CONSTRAINT IF EXISTS chk_iam_tenant_application_provisioning_status;

ALTER TABLE iam_tenant_application
    DROP COLUMN IF EXISTS provisioning_idempotency_key,
    DROP COLUMN IF EXISTS provisioning_status,
    DROP COLUMN IF EXISTS deploy_application_id;

COMMIT;
