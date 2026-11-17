-- sdkwork:migration
-- id: 0043_rename_tenant_application_to_application_installation
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Complete Phase 4 of the application-factory restructure by giving
--   the installation record its design name. `iam_tenant_application` is the
--   installation, not a tenant/application join: the row carries
--   `deploy_application_id` (one-to-one with a deploy application),
--   `provisioning_status`, and the environment/credential children of 0039
--   already point at it. The name the design mandates is
--   `iam_application_installation` (`APPLICATION_IDENTITY_SPEC.md`,
--   `DATABASE_SPEC.md` installation aggregate).
--
--   A bare `ALTER TABLE ... RENAME TO` moves the table but leaves every
--   database-owned object carrying the retired name. Renamed here, in the same
--   transaction:
--
--   - iam_tenant_application_pkey -> iam_application_installation_pkey
--   - uk_iam_tenant_application_primary_domain
--     -> uk_iam_application_installation_primary_domain
--   - idx_iam_tenant_application_tenant_status
--     -> idx_iam_application_installation_tenant_status
--   - uk_iam_tenant_application_oauth_client_id (0026)
--     -> uk_iam_application_installation_oauth_client_id
--   - uk_iam_tenant_application_deploy (0040)
--     -> uk_iam_application_installation_deploy
--   - uk_iam_tenant_application_provisioning_key (0040)
--     -> uk_iam_application_installation_provisioning_key
--   - chk_iam_tenant_application_provisioning_status (0040)
--     -> chk_iam_application_installation_provisioning_status
--   - iam_tenant_application_app_id_key -> iam_application_installation_app_id_key
--   - iam_tenant_application_tenant_id_instance_key_key
--     -> iam_application_installation_tenant_id_instance_key_key
--
--   `idx_iam_tenant_application_template` and
--   `uk_iam_tenant_application_org_template` are not renamed: 0041 already
--   dropped both with the template columns.
--
--   Foreign keys owned by other tables (`installation_id`/`tenant_application_id`
--   references) automatically follow the rename and keep their own generated
--   names, which are child-table-derived and never contained the retired name.
-- reversible: true
-- rollback: down-migration (renames the table and every renamed object back)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_tenant_application (RENAME TABLE plus
--   catalog-only index/constraint renames)
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE iam_tenant_application RENAME TO iam_application_installation;

ALTER INDEX iam_tenant_application_pkey
    RENAME TO iam_application_installation_pkey;
ALTER INDEX uk_iam_tenant_application_primary_domain
    RENAME TO uk_iam_application_installation_primary_domain;
ALTER INDEX idx_iam_tenant_application_tenant_status
    RENAME TO idx_iam_application_installation_tenant_status;
ALTER INDEX uk_iam_tenant_application_oauth_client_id
    RENAME TO uk_iam_application_installation_oauth_client_id;
ALTER INDEX uk_iam_tenant_application_deploy
    RENAME TO uk_iam_application_installation_deploy;
ALTER INDEX uk_iam_tenant_application_provisioning_key
    RENAME TO uk_iam_application_installation_provisioning_key;

ALTER TABLE iam_application_installation
    RENAME CONSTRAINT iam_tenant_application_app_id_key
    TO iam_application_installation_app_id_key;
ALTER TABLE iam_application_installation
    RENAME CONSTRAINT iam_tenant_application_tenant_id_instance_key_key
    TO iam_application_installation_tenant_id_instance_key_key;
ALTER TABLE iam_application_installation
    RENAME CONSTRAINT chk_iam_tenant_application_provisioning_status
    TO chk_iam_application_installation_provisioning_status;

COMMIT;
