-- sdkwork:migration
-- id: 0016_iam_provider_accounts
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Introduce the platform-wide service-provider account center.
--   iam_provider_account holds one row per reusable upstream account (for
--   example one Alibaba Cloud account), scoped to a tenant/organization and
--   identified by vendor_code plus account_code. iam_provider_credential holds
--   the write-only secret material for such an account, as an AES-256-GCM
--   envelope (ciphertext + key id + algorithm + fingerprint) so no plaintext
--   secret is ever stored. Consuming domains (drive object storage today,
--   further provider capabilities later) reference the account by id instead
--   of embedding per-consumer credential copies, so one account is reused
--   across businesses and a rotation happens once.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS iam_provider_account (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL DEFAULT '0',
  vendor_code TEXT NOT NULL,
  account_code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_name_i18n TEXT NOT NULL DEFAULT '{}',
  account_type TEXT NOT NULL DEFAULT 'standard',
  environment TEXT NOT NULL DEFAULT 'production',
  external_account_id TEXT,
  capability_codes TEXT NOT NULL DEFAULT '[]',
  region_code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  version BIGINT NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT ck_iam_provider_account_vendor_code
    CHECK (vendor_code ~ '^[a-z][a-z0-9_]{1,31}$'),
  CONSTRAINT ck_iam_provider_account_account_code
    CHECK (account_code ~ '^[a-z0-9][a-z0-9_.-]{1,63}$'),
  CONSTRAINT ck_iam_provider_account_display_name
    CHECK (display_name = btrim(display_name) AND length(display_name) BETWEEN 1 AND 128),
  CONSTRAINT ck_iam_provider_account_account_type
    CHECK (account_type IN ('standard', 'partner', 'delegated')),
  CONSTRAINT ck_iam_provider_account_environment
    CHECK (environment IN ('development', 'sandbox', 'production')),
  CONSTRAINT ck_iam_provider_account_status
    CHECK (status IN ('active', 'disabled', 'deleted')),
  CONSTRAINT ck_iam_provider_account_version
    CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_uuid
  ON iam_provider_account (uuid);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_scope_code
  ON iam_provider_account (tenant_id, organization_id, account_code)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iam_provider_account_vendor_status
  ON iam_provider_account (tenant_id, organization_id, vendor_code, status, account_code)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS iam_provider_credential (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL DEFAULT '0',
  provider_account_id TEXT NOT NULL,
  credential_kind TEXT NOT NULL DEFAULT 'access_key_pair',
  credential_name TEXT NOT NULL DEFAULT 'default',
  secret_ciphertext TEXT NOT NULL,
  secret_key_id TEXT NOT NULL,
  secret_algorithm TEXT NOT NULL DEFAULT 'aes-256-gcm',
  secret_fingerprint TEXT NOT NULL,
  masked_label TEXT,
  credential_version BIGINT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ,
  last_rotated_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT iam_provider_credential_account_fk
    FOREIGN KEY (provider_account_id) REFERENCES iam_provider_account(id),
  CONSTRAINT ck_iam_provider_credential_kind
    CHECK (credential_kind IN ('access_key_pair', 'bearer_token', 'service_account_json', 'secret_text')),
  CONSTRAINT ck_iam_provider_credential_name
    CHECK (credential_name = btrim(credential_name) AND length(credential_name) BETWEEN 1 AND 64),
  CONSTRAINT ck_iam_provider_credential_status
    CHECK (status IN ('active', 'superseded', 'revoked')),
  CONSTRAINT ck_iam_provider_credential_version
    CHECK (credential_version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_credential_uuid
  ON iam_provider_credential (uuid);

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_credential_active
  ON iam_provider_credential (tenant_id, organization_id, provider_account_id, credential_kind, credential_name)
  WHERE status = 'active' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_iam_provider_credential_account
  ON iam_provider_credential (tenant_id, provider_account_id, credential_kind, status, credential_version DESC);

COMMIT;
