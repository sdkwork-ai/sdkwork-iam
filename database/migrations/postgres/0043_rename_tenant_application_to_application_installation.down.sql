-- sdkwork:migration
-- id: 0043_rename_tenant_application_to_application_installation
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Restore the pre-0043 installation table name and its owned object
--   names. Renames only: no row, column, index definition, or constraint
--   definition changes, so the reversal is data-preserving.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_application_installation
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE iam_application_installation
    RENAME CONSTRAINT chk_iam_application_installation_provisioning_status
    TO chk_iam_tenant_application_provisioning_status;
ALTER TABLE iam_application_installation
    RENAME CONSTRAINT iam_application_installation_tenant_id_instance_key_key
    TO iam_tenant_application_tenant_id_instance_key_key;
ALTER TABLE iam_application_installation
    RENAME CONSTRAINT iam_application_installation_app_id_key
    TO iam_tenant_application_app_id_key;

ALTER INDEX iam_application_installation_provisioning_key
    RENAME TO uk_iam_tenant_application_provisioning_key;
ALTER INDEX iam_application_installation_deploy
    RENAME TO uk_iam_tenant_application_deploy;
ALTER INDEX uk_iam_application_installation_oauth_client_id
    RENAME TO uk_iam_tenant_application_oauth_client_id;
ALTER INDEX idx_iam_application_installation_tenant_status
    RENAME TO idx_iam_tenant_application_tenant_status;
ALTER INDEX uk_iam_application_installation_primary_domain
    RENAME TO uk_iam_tenant_application_primary_domain;
ALTER INDEX iam_application_installation_pkey
    RENAME TO iam_tenant_application_pkey;

ALTER TABLE iam_application_installation RENAME TO iam_tenant_application;

COMMIT;
