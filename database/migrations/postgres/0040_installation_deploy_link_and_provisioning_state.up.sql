-- sdkwork:migration
-- id: 0040_installation_deploy_link_and_provisioning_state
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Step 1 of the deploy/registration/token remediation
--   (APPLICATION_LIFECYCLE_AUDIT.md). An installation is one-to-one with a
--   deploy application; until now nothing in the schema could say so, and the
--   provisioning state lived only in the deploy module's head.
--
--   - deploy_application_id: the deployment application this installation
--     serves. A partial unique index makes the one-to-one relation an
--     invariant instead of a convention.
--   - provisioning_status: pending | active | failed, so a cross-module
--     provisioning attempt can be observed, retried, and reconciled.
--   - provisioning_idempotency_key: makes the provisioning call replay-safe.
--
--   Additive: existing installations keep NULL deploy_application_id until the
--   backfill links them.
-- reversible: true
-- rollback: down-migration (the paired down migration drops the three columns
--   and their indexes)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_tenant_application for the added columns
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE iam_tenant_application
    ADD COLUMN IF NOT EXISTS deploy_application_id TEXT,
    ADD COLUMN IF NOT EXISTS provisioning_status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS provisioning_idempotency_key TEXT;

ALTER TABLE iam_tenant_application
    ADD CONSTRAINT chk_iam_tenant_application_provisioning_status
    CHECK (provisioning_status IN ('pending', 'active', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_tenant_application_deploy
    ON iam_tenant_application (deploy_application_id)
    WHERE deploy_application_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_tenant_application_provisioning_key
    ON iam_tenant_application (provisioning_idempotency_key)
    WHERE provisioning_idempotency_key IS NOT NULL;

COMMIT;
