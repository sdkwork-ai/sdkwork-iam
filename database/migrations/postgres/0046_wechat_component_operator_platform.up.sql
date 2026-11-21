-- sdkwork:migration
-- id: 0046_wechat_component_operator_platform
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Give a WeChat third-party platform (component) the state it needs to
--   run, and give the callback pipeline a durable inbox.
--
--   TECH-2026-11-21-wechat-channel-dual-mode-design.md (sdkwork-cloudrouter)
--   makes one `iam_oauth_operator_platform` row the identity of one component
--   instance. Until this migration the row could only record a display name and
--   a provider platform id: there was nowhere to put the component AppID, the
--   opaque callback path, the verification-ticket freshness, the component token
--   expiry, the approved permission sets, or the full-release state. The runtime
--   introduced by `wechat_component` / `wechat_component_api` /
--   `wechat_component_token` therefore had no place to persist the state it
--   explicitly requires to survive a restart.
--
--   The additions are deliberately additive and defaulted:
--
--   1. `platform_type` distinguishes a platform-type component (has a secret and
--      may call the API) from a customized-type record (AppID only, no secret,
--      no API capability). Existing rows default to `platform` because every row
--      written before this migration was configured as an integration.
--      `ticket_status`, `ticket_create_time`, `ticket_received_at`,
--      `ticket_expires_at`, and `component_token_expires_at` are operational
--      freshness markers for the ten-minute ticket push and the two-hour
--      component token. `ticket_create_time` is what makes an out-of-order push
--      detectable after a restart: the store only accepts a strictly newer
--      provider `CreateTime`. They are not a second secret store: the ticket
--      value and the AppSecret stay in `iam_oauth_secret`.
--   2. `callback_public_id` is the opaque, unguessable path id WeChat is given.
--      A partial unique index makes it addressable exactly once while leaving
--      legacy rows without a callback address.
--   3. `approved_permission_sets_json` records the `func_info` categories WeChat
--      actually granted, because an authorization can be narrower than the
--      requested scope and the runtime must not assume otherwise.
--   4. `iam_oauth_resource_authorization` gains `authorizer_appid`,
--      `func_info_json`, and `authorization_source`, so one authorization fact
--      names the authorizer it belongs to and how it was obtained. A partial
--      unique index allows at most one active authorization per operator
--      platform and resource account, which is what the refresh scheduler needs
--      to avoid picking two competing refresh tokens.
--   5. `iam_oauth_channel_callback_event` is the idempotency ledger for the two
--      public callback URLs. A unique `(callback_public_id, dedupe_key)` row
--      makes a WeChat retry a no-op instead of a duplicate authorization or
--      message side effect.
--   6. `iam_oauth_authorizer_inbox` holds an authorization that arrived before a
--      tenant claimed it. The component callback learns the authorizer AppID and
--      refresh token, but not which SDKWork tenant owns the account; the inbox
--      keeps that grant until a tenant scans or binds it, instead of dropping it
--      or guessing a tenant.
--
-- reversible: false
-- rollback: forward-fix (the down direction would drop the component state,
--   the callback ledger, and the unclaimed-authorization inbox; losing a
--   refresh token in the inbox is unrecoverable without asking the customer to
--   authorize again)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_oauth_operator_platform and
--   iam_oauth_resource_authorization while the columns and indexes are created
-- lock_timeout: 2s
-- statement_timeout: 60s
-- backfill: none. Every new column is nullable or defaulted, the partial unique
--   indexes only cover rows that set the new identity columns, and no stored
--   value is rewritten.

-- 1. Component identity and runtime freshness on the operator platform.
ALTER TABLE iam_oauth_operator_platform
  ADD COLUMN IF NOT EXISTS platform_type TEXT NOT NULL DEFAULT 'platform',
  ADD COLUMN IF NOT EXISTS component_appid TEXT,
  ADD COLUMN IF NOT EXISTS callback_public_id TEXT,
  ADD COLUMN IF NOT EXISTS ticket_status TEXT NOT NULL DEFAULT 'missing',
  ADD COLUMN IF NOT EXISTS ticket_received_at TEXT,
  ADD COLUMN IF NOT EXISTS ticket_expires_at TEXT,
  ADD COLUMN IF NOT EXISTS ticket_create_time TEXT,
  ADD COLUMN IF NOT EXISTS component_token_expires_at TEXT,
  ADD COLUMN IF NOT EXISTS full_release_status TEXT NOT NULL DEFAULT 'not_released',
  ADD COLUMN IF NOT EXISTS approved_permission_sets_json TEXT NOT NULL DEFAULT '[]';

-- 2. Callback addressing and the two lookup paths the admin surface uses.
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_operator_platform_callback
  ON iam_oauth_operator_platform (callback_public_id)
  WHERE callback_public_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_operator_platform_component
  ON iam_oauth_operator_platform (tenant_id, organization_id, component_appid)
  WHERE component_appid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_iam_oauth_operator_platform_enabled
  ON iam_oauth_operator_platform (tenant_id, organization_id, provider_code, enabled, status);

CREATE INDEX IF NOT EXISTS idx_iam_oauth_operator_platform_authorization
  ON iam_oauth_operator_platform (tenant_id, organization_id, provider_code, authorization_status, status);

-- 3. One authorization fact names its authorizer and its provenance.
ALTER TABLE iam_oauth_resource_authorization
  ADD COLUMN IF NOT EXISTS authorizer_appid TEXT,
  ADD COLUMN IF NOT EXISTS func_info_json TEXT NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS authorization_source TEXT NOT NULL DEFAULT 'manual_verified';

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_resource_authorization_active
  ON iam_oauth_resource_authorization (operator_platform_id, resource_account_id)
  WHERE status = 'active' AND operator_platform_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_iam_oauth_resource_authorization_refresh
  ON iam_oauth_resource_authorization (status, next_refresh_at)
  WHERE next_refresh_at IS NOT NULL;

-- 4. Idempotency ledger for both public callback URLs.
CREATE TABLE IF NOT EXISTS iam_oauth_channel_callback_event (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL DEFAULT '0',
  operator_platform_id TEXT,
  callback_public_id TEXT NOT NULL,
  dedupe_key TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  received_at TEXT NOT NULL,
  processed_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_channel_callback_event_dedupe
  ON iam_oauth_channel_callback_event (callback_public_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_iam_oauth_channel_callback_event_pending
  ON iam_oauth_channel_callback_event (status, received_at);

-- 5. An authorization WeChat pushed before a tenant claimed it.
CREATE TABLE IF NOT EXISTS iam_oauth_authorizer_inbox (
  id TEXT PRIMARY KEY,
  uuid TEXT NOT NULL,
  operator_platform_id TEXT NOT NULL,
  authorizer_appid TEXT NOT NULL,
  authorization_info_json TEXT NOT NULL DEFAULT '{}',
  authorization_status TEXT NOT NULL DEFAULT 'pending',
  claimed_tenant_id TEXT,
  claimed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_authorizer_inbox_authorizer
  ON iam_oauth_authorizer_inbox (operator_platform_id, authorizer_appid);

CREATE INDEX IF NOT EXISTS idx_iam_oauth_authorizer_inbox_unclaimed
  ON iam_oauth_authorizer_inbox (claimed_tenant_id, authorization_status);
