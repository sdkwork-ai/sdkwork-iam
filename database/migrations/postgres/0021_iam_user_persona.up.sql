-- sdkwork:migration
-- id: 0021_iam_user_persona
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Introduce the user persona account profile that onboarding and
--   recommendation surfaces read: one selectable-role catalog, one interest
--   catalog, and one persona row per tenant user.
--     - iam_persona_role: the selectable persona roles. Platform-owned rows use
--       owner_tenant_id '0' (the iam_oauth_provider_catalog precedent) so every
--       tenant shares one catalog; a tenant may later own an override row.
--       iam_role_code optionally maps a persona role onto the authorization
--       role catalog in iam_role, which keeps persona selection distinct from
--       permission grants instead of creating grantable pseudo-roles.
--     - iam_persona_interest: the selectable interest directions, same
--       ownership and lifecycle rules.
--     - iam_user_persona: the tenant/user-scoped selection (role code, interest
--       codes, first-run prompt answer). Absence means "never chose", which is
--       the honest state the first-run gate reads; it is not modelled as empty
--       strings inside iam_user.
--   Labels are locale maps in TEXT JSON columns so one seed file can own one
--   locale (I18N_SPEC.md section 11) while the runtime column stays single.
-- reversible: false
-- rollback: forward-fix (dropping the tables would discard every stored
--   persona selection and the seeded catalog; a bounded data-preserving
--   reversal cannot restore deleted selections, so this migration is
--   irreversible per DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS iam_persona_role (
  id TEXT PRIMARY KEY,
  owner_tenant_id TEXT NOT NULL DEFAULT '0',
  code TEXT NOT NULL,
  iam_role_code TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  label_i18n TEXT NOT NULL DEFAULT '{}',
  description_i18n TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_iam_persona_role_owner_code UNIQUE (owner_tenant_id, code),
  CONSTRAINT ck_iam_persona_role_code CHECK (code ~ '^[a-z][a-z0-9-]{0,63}$'),
  CONSTRAINT ck_iam_persona_role_status CHECK (status IN ('active', 'disabled')),
  CONSTRAINT ck_iam_persona_role_sort CHECK (sort_order >= 0),
  CONSTRAINT ck_iam_persona_role_label_i18n CHECK (jsonb_typeof(label_i18n::jsonb) = 'object'),
  CONSTRAINT ck_iam_persona_role_description_i18n CHECK (jsonb_typeof(description_i18n::jsonb) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_iam_persona_role_owner_status
  ON iam_persona_role (owner_tenant_id, status, sort_order);

CREATE TABLE IF NOT EXISTS iam_persona_interest (
  id TEXT PRIMARY KEY,
  owner_tenant_id TEXT NOT NULL DEFAULT '0',
  code TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  label_i18n TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_iam_persona_interest_owner_code UNIQUE (owner_tenant_id, code),
  CONSTRAINT ck_iam_persona_interest_code CHECK (code ~ '^[a-z][a-z0-9-]{0,63}$'),
  CONSTRAINT ck_iam_persona_interest_status CHECK (status IN ('active', 'disabled')),
  CONSTRAINT ck_iam_persona_interest_sort CHECK (sort_order >= 0),
  CONSTRAINT ck_iam_persona_interest_label_i18n CHECK (jsonb_typeof(label_i18n::jsonb) = 'object')
);

CREATE INDEX IF NOT EXISTS idx_iam_persona_interest_owner_status
  ON iam_persona_interest (owner_tenant_id, status, sort_order);

CREATE TABLE IF NOT EXISTS iam_user_persona (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_code TEXT,
  interests TEXT NOT NULL DEFAULT '[]',
  prompt_dismissed INTEGER NOT NULL DEFAULT 0,
  catalog_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uk_iam_user_persona_tenant_user UNIQUE (tenant_id, user_id),
  CONSTRAINT ck_iam_user_persona_prompt_dismissed CHECK (prompt_dismissed IN (0, 1)),
  CONSTRAINT ck_iam_user_persona_interests CHECK (jsonb_typeof(interests::jsonb) = 'array')
);

CREATE INDEX IF NOT EXISTS idx_iam_user_persona_tenant_role
  ON iam_user_persona (tenant_id, role_code);

COMMIT;
