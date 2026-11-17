-- sdkwork:migration
-- id: 0039_application_installation_environment_and_credential
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Phase 4 groundwork of the application-factory restructure
--   (APPLICATION_FACTORY_DB_RESTRUCTURE_PLAN.md). An installation is 1:1 with a
--   deploy application, but each environment of that application needs its own
--   public domain and its own OAuth client. Those two facts move out of the
--   single installation row into environment-scoped relations:
--
--   - iam_application_installation_environment holds the per-environment domain,
--     domain configuration, and availability state.
--   - iam_application_installation_credential holds the OAuth client of one
--     environment: client id, Argon2id secret hash, redirect URIs, granted
--     scopes, and rotation/retirement state.
--
--   Both are additive; the existing tenant-application row keeps serving
--   installations until the installation rename lands.
-- reversible: true
-- rollback: down-migration (both tables are additive; the paired down migration
--   drops them)
-- transactional: true
-- lock: lightweight (new tables only)
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

CREATE TABLE IF NOT EXISTS iam_application_installation_environment (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    organization_id TEXT NOT NULL DEFAULT '0',
    installation_id TEXT NOT NULL REFERENCES iam_tenant_application(id) ON DELETE CASCADE,
    env_key TEXT NOT NULL,
    primary_domain TEXT,
    domain_config_json JSONB NOT NULL DEFAULT '{}',
    env_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    deleted_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_iam_application_installation_environment_status
        CHECK (env_status IN ('pending', 'active', 'disabled'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_application_installation_environment_key
    ON iam_application_installation_environment (installation_id, env_key)
    WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_application_installation_environment_domain
    ON iam_application_installation_environment (tenant_id, primary_domain)
    WHERE primary_domain IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iam_application_installation_environment_tenant
    ON iam_application_installation_environment (tenant_id, installation_id, env_status, updated_at, id);

CREATE TABLE IF NOT EXISTS iam_application_installation_credential (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    installation_environment_id TEXT NOT NULL
        REFERENCES iam_application_installation_environment(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL,
    secret_hash TEXT NOT NULL,
    redirect_uris_json JSONB NOT NULL DEFAULT '[]',
    granted_scopes_json JSONB NOT NULL DEFAULT '[]',
    credential_status TEXT NOT NULL DEFAULT 'active',
    rotated_at TIMESTAMPTZ,
    retired_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_iam_application_installation_credential_status
        CHECK (credential_status IN ('active', 'rotated', 'retired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_application_installation_credential_client
    ON iam_application_installation_credential (client_id);

CREATE INDEX IF NOT EXISTS idx_iam_application_installation_credential_env
    ON iam_application_installation_credential (tenant_id, installation_environment_id, credential_status, updated_at, id);

COMMIT;
