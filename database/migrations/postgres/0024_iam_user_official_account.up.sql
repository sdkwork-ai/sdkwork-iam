-- sdkwork:migration
-- id: 0024_iam_user_official_account
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Introduce the per-user official (service) account configuration a
--   signed-in account owns: the WeChat 公众号 AppID, display name, account
--   type, original id, logo, message-push endpoint, and the custom-menu draft
--   that menu/article publishing will later push. The row is scoped by
--   (tenant_id, user_id) and is deliberately independent of
--   iam_oauth_resource_account: a resource account is a tenant login resource
--   with an integration, client, and secret cascade, while this row is the
--   caller's own channel configuration and never participates in login. AppID
--   and AppSecret are per-user, so one account no longer needs tenant-wide
--   operator involvement. Secret material is stored only as an encoded
--   signing-secret reference (app_secret_ref, notify_token_ref,
--   notify_encoding_aes_key_ref), never as plaintext, and reads never return
--   it.
-- reversible: false
-- rollback: forward-fix (dropping the table would discard every account
--   configuration and its sealed credentials; a bounded data-preserving
--   reversal cannot restore deleted rows, so this migration is irreversible
--   per DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS iam_user_official_account (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  account_type TEXT,
  original_id TEXT,
  logo_url TEXT,
  app_secret_ref TEXT,
  notify_url TEXT,
  notify_token_ref TEXT,
  notify_encoding_aes_key_ref TEXT,
  custom_menu TEXT NOT NULL DEFAULT '{}',
  enabled INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT uk_iam_user_official_account_owner_app UNIQUE (tenant_id, user_id, app_id),
  CONSTRAINT ck_iam_user_official_account_app_id
    CHECK (app_id ~ '^[A-Za-z0-9_-]{4,64}$'),
  CONSTRAINT ck_iam_user_official_account_display_name
    CHECK (display_name = btrim(display_name) AND length(display_name) BETWEEN 1 AND 128),
  CONSTRAINT ck_iam_user_official_account_status
    CHECK (status IN ('active', 'disabled')),
  CONSTRAINT ck_iam_user_official_account_enabled
    CHECK (enabled IN (0, 1)),
  CONSTRAINT ck_iam_user_official_account_custom_menu
    CHECK (jsonb_typeof(custom_menu::jsonb) = 'object'),
  CONSTRAINT ck_iam_user_official_account_version
    CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_iam_user_official_account_owner
  ON iam_user_official_account (tenant_id, user_id, status, updated_at);

COMMIT;
