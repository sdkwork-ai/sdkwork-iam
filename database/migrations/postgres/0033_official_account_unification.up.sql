-- sdkwork:migration
-- id: 0033_official_account_unification
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Unify the per-user official (service) account aggregate into
--   iam_oauth_resource_account. Each legacy iam_user_official_account row is
--   migrated into the canonical resource account keeping its id, so the
--   already-published /iam/v3/api/iam/oauth/official_accounts/{accountId}/
--   wechat/notify callback URL never breaks; its WeChat AppID becomes
--   provider_account_id (and the linked OAuth client's provider_client_id), its
--   AppSecret and message-push credentials become iam_oauth_secret rows, its
--   callback URL and encryption mode become an iam_oauth_webhook_config row, its
--   domains / logo / menu draft become the provider_config_json sub-document,
--   and the owning user becomes the new maintainer_user_id.
--   Application ownership is resolved during the migration only: the legacy
--   row carries no application id, so the owning application falls back to the
--   tenant's first enabled iam_tenant_application (platform sentinel '0' when
--   the tenant has none). That is a migration-time fallback, never the runtime
--   rule: the runtime write path (app-api) always records the requesting
--   session's app_id as iam_oauth_integration.app_id.
--   A legacy row whose provider identity is already taken (another user's
--   channel, or an operator-authorized account with the same AppID) is NOT
--   silently dropped: it is isolated row by row in
--   iam_official_account_migration_orphan together with the reason and the
--   full source context, so an operator can review and re-append it. The
--   legacy table itself is left in place and untouched (the application has no
--   read or write path to it any more) until a separate, human-approved DROP
--   migration.
--   Pre-deployment check (read-only; copy, run against the target database,
--   and decide on the reported groups before applying this migration):
--     SELECT oa.tenant_id,
--            oa.app_id,
--            COUNT(*) AS legacy_rows,
--            string_agg(oa.user_id, ', ' ORDER BY oa.user_id) AS maintainer_users,
--            string_agg(oa.id, ', ' ORDER BY oa.id) AS legacy_account_ids,
--            (SELECT string_agg(ra.id || ' (' || ra.access_mode || ')', ', ')
--               FROM iam_oauth_resource_account ra
--              WHERE ra.tenant_id = oa.tenant_id
--                AND ra.organization_id = '0'
--                AND ra.provider_code = 'wechat'
--                AND ra.resource_account_kind = 'official_account'
--                AND ra.provider_account_id = oa.app_id) AS occupying_resource_accounts
--       FROM iam_user_official_account oa
--      GROUP BY oa.tenant_id, oa.app_id
--     HAVING COUNT(*) > 1
--         OR EXISTS (SELECT 1
--                      FROM iam_oauth_resource_account ra
--                     WHERE ra.tenant_id = oa.tenant_id
--                       AND ra.organization_id = '0'
--                       AND ra.provider_code = 'wechat'
--                       AND ra.resource_account_kind = 'official_account'
--                       AND ra.provider_account_id = oa.app_id)
--      ORDER BY oa.tenant_id, oa.app_id;
--   Every reported group can keep at most one migrated account (the oldest
--   legacy row wins deterministically); the remaining rows are written to
--   iam_official_account_migration_orphan by this migration.
-- reversible: false
-- rollback: forward-fix (the migration rewrites the only authoritative copy of
--   every official-account configuration into the canonical aggregate; a
--   reversal would have to delete migrated rows while the legacy rows may have
--   been removed afterwards, and it cannot restore the row identity that the
--   published WeChat callback URL depends on. DATABASE_FRAMEWORK_SPEC.md
--   section 7.1 keeps this migration irreversible with a forward-fix instead of
--   a lossy down migration.)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- 1. Ownership anchor: the channel belongs to the application (through
--    iam_oauth_integration.app_id); a user is only its maintainer, so the
--    column is nullable and carries no default (historical dirty rows may stay
--    empty, the application always writes it at runtime).
ALTER TABLE iam_oauth_resource_account
  ADD COLUMN IF NOT EXISTS maintainer_user_id TEXT;

CREATE INDEX IF NOT EXISTS idx_iam_oauth_resource_account_maintainer
  ON iam_oauth_resource_account (tenant_id, maintainer_user_id, status);

-- 2. Migration orphan ledger: one row per legacy channel this migration could
--    not carry over, with the reason and the full source context, so a dropped
--    row is always explicit, enumerable, and reviewable instead of silently
--    skipped. This table is migration evidence ONLY: no runtime handler may
--    read or write it (the app-api, backend-api, and web-adapter always work
--    on iam_oauth_resource_account). It is retired together with the legacy
--    table by the separately approved DROP migration, after the isolated rows
--    have been reviewed or re-appended.
CREATE TABLE IF NOT EXISTS iam_official_account_migration_orphan (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  organization_id TEXT NOT NULL DEFAULT '0',
  source_account_id TEXT NOT NULL,
  user_id TEXT,
  app_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iam_official_account_migration_orphan_tenant
  ON iam_official_account_migration_orphan (tenant_id, app_id);

-- 3. Integration. A migrated channel needs a WeChat integration of the
--    application that owns it (the migration-time fallback described in the
--    header), falling back to the platform sentinel '0'.
INSERT INTO iam_oauth_integration (
  id, uuid, tenant_id, organization_id, app_id, environment, deployment_mode,
  provider_code, provider_catalog_id, integration_code, display_name,
  region_group, protocol_family, account_operation_enabled,
  operator_authorization_enabled, enabled, health_status, status, created_by,
  created_at, updated_at
)
SELECT
  'iamoi-oa-' || md5(p.tenant_id || ':' || p.runtime_app_id),
  gen_random_uuid()::text,
  p.tenant_id,
  '0',
  p.runtime_app_id,
  'production',
  'standalone',
  'wechat',
  COALESCE(
    (
      SELECT c.id
      FROM iam_oauth_provider_catalog c
      WHERE c.provider_code = 'wechat' AND c.status = 'active'
        AND (c.owner_tenant_id = p.tenant_id OR c.owner_tenant_id = '0')
      ORDER BY CASE WHEN c.owner_tenant_id = p.tenant_id THEN 0 ELSE 1 END
      LIMIT 1
    ),
    ''
  ),
  'official-account-' || p.runtime_app_id,
  'Official Account ' || p.runtime_app_id,
  'cn',
  'oauth2',
  1,
  0,
  1,
  'unknown',
  'active',
  'system:migration-0033',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT
    oa.tenant_id,
    COALESCE(
      (
        SELECT ta.app_id
        FROM iam_tenant_application ta
        WHERE ta.tenant_id = oa.tenant_id AND ta.status = 'enabled'
        ORDER BY ta.created_at, ta.app_id
        LIMIT 1
      ),
      '0'
    ) AS runtime_app_id
  FROM iam_user_official_account oa
) p
WHERE NOT EXISTS (
  SELECT 1 FROM iam_oauth_integration i
  WHERE i.tenant_id = p.tenant_id
    AND i.provider_code = 'wechat'
    AND i.app_id = p.runtime_app_id
);

-- 4. OAuth client. The WeChat AppID is the provider client id of the
--    application's client, and an existing client for that AppID is reused.
--    Exactly one client is created per (tenant, AppID): several legacy rows may
--    share one AppID, and the client row is a provider identity, not a per-user
--    record. The oldest legacy row names it (same deterministic ranking as the
--    resource-account step), so the surviving account and its client agree.
INSERT INTO iam_oauth_client (
  id, uuid, tenant_id, organization_id, integration_id, provider_code,
  client_code, display_name, provider_client_id, provider_account_id,
  client_auth_method, pkce_default_mode, secret_config_status, enabled, status,
  created_by, created_at, updated_at
)
SELECT
  'iamoc-oa-' || md5(oa.id),
  gen_random_uuid()::text,
  oa.tenant_id,
  '0',
  i.id,
  'wechat',
  'official-account-' || oa.app_id || '-client',
  oa.display_name,
  oa.app_id,
  oa.app_id,
  'client_secret_post',
  'optional',
  CASE
    WHEN oa.app_secret_ref IS NOT NULL AND btrim(oa.app_secret_ref) <> '' THEN 'configured'
    ELSE 'missing'
  END,
  oa.enabled,
  'active',
  oa.user_id,
  oa.created_at::text,
  oa.updated_at::text
FROM (
  SELECT
    oa.*,
    ROW_NUMBER() OVER (
      PARTITION BY oa.tenant_id, oa.app_id
      ORDER BY oa.created_at, oa.id
    ) AS identity_rank
  FROM iam_user_official_account oa
) oa
JOIN iam_oauth_integration i
  ON i.tenant_id = oa.tenant_id
 AND i.provider_code = 'wechat'
 AND i.app_id = COALESCE(
   (
     SELECT ta.app_id
     FROM iam_tenant_application ta
     WHERE ta.tenant_id = oa.tenant_id AND ta.status = 'enabled'
     ORDER BY ta.created_at, ta.app_id
     LIMIT 1
   ),
   '0'
 )
WHERE oa.identity_rank = 1
  AND NOT EXISTS (
  SELECT 1 FROM iam_oauth_client c
  WHERE c.tenant_id = oa.tenant_id
    AND c.integration_id = i.id
    AND c.provider_code = 'wechat'
    AND c.provider_client_id = oa.app_id
);

-- 5. Web surface. The migrated channel keeps a complete OAuth connection; only
--    a web surface is created because the legacy table carries 公众号 channels
--    and never a mini program.
INSERT INTO iam_oauth_surface (
  id, uuid, tenant_id, organization_id, integration_id, oauth_client_id,
  surface_kind, surface_code, display_name, redirect_validation_mode,
  pkce_mode, client_auth_method, enabled, status, created_at, updated_at
)
SELECT
  'iamosurf-oa-' || md5(c.id),
  gen_random_uuid()::text,
  c.tenant_id,
  '0',
  c.integration_id,
  c.id,
  'web',
  c.client_code || '-web',
  c.display_name || ' web',
  'strict',
  'optional',
  'client_secret_post',
  c.enabled,
  'active',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM iam_oauth_client c
WHERE c.client_code LIKE 'official-account-%'
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_surface s
    WHERE s.tenant_id = c.tenant_id
      AND s.oauth_client_id = c.id
      AND s.surface_kind = 'web'
  );

-- 6. Resource account. The legacy id is preserved verbatim (the published
--    WeChat callback URL addresses it), the channel is stored as a
--    caller-maintained self-service account scoped by maintainer_user_id, and it
--    is never the scan-login default (qr_default_enabled stays 0).
--    self_managed_config_status reflects the stored credential completeness:
--    all three present is ready, any present is incomplete, none is missing.
--    The provider identity is unique per (tenant_id, organization_id,
--    provider_code, resource_account_kind, provider_account_id); when several
--    legacy rows share one AppID the oldest row wins deterministically
--    (ORDER BY created_at, id) and the others are isolated by step 7.
INSERT INTO iam_oauth_resource_account (
  id, uuid, tenant_id, organization_id, integration_id, oauth_client_id,
  provider_code, resource_account_code, resource_account_kind, access_mode,
  maintainer_user_id, display_name, provider_account_id,
  provider_account_original_id, provider_account_type, verification_status,
  authorization_status, self_managed_config_status,
  operator_authorization_status, webhook_verify_status, domain_verify_status,
  provider_config_json, qr_default_enabled, enabled, status, created_by,
  created_at, updated_at, version
)
SELECT
  ranked.id,
  gen_random_uuid()::text,
  ranked.tenant_id,
  '0',
  i.id,
  c.id,
  'wechat',
  'oa-' || ranked.app_id,
  'official_account',
  'self_managed_account',
  ranked.user_id,
  ranked.display_name,
  ranked.app_id,
  ranked.original_id,
  ranked.account_type,
  'unknown',
  'authorized',
  CASE
    WHEN ranked.app_secret_ref IS NOT NULL AND btrim(ranked.app_secret_ref) <> ''
     AND ranked.notify_token_ref IS NOT NULL AND btrim(ranked.notify_token_ref) <> ''
     AND ranked.notify_encoding_aes_key_ref IS NOT NULL
     AND btrim(ranked.notify_encoding_aes_key_ref) <> '' THEN 'ready'
    WHEN ranked.app_secret_ref IS NOT NULL AND btrim(ranked.app_secret_ref) <> '' THEN 'incomplete'
    WHEN ranked.notify_token_ref IS NOT NULL AND btrim(ranked.notify_token_ref) <> '' THEN 'incomplete'
    WHEN ranked.notify_encoding_aes_key_ref IS NOT NULL
     AND btrim(ranked.notify_encoding_aes_key_ref) <> '' THEN 'incomplete'
    ELSE 'missing'
  END,
  'not_required',
  'unknown',
  'unknown',
  jsonb_build_object(
    'logoUrl', ranked.logo_url,
    'customMenu', ranked.custom_menu::jsonb,
    'jsSecureDomains', ranked.js_secure_domains::jsonb,
    'webAuthDomains', ranked.web_auth_domains::jsonb,
    'businessDomains', ranked.business_domains::jsonb
  )::text,
  0,
  ranked.enabled,
  ranked.status,
  ranked.user_id,
  ranked.created_at::text,
  ranked.updated_at::text,
  ranked.version
FROM (
  SELECT
    oa.*,
    ROW_NUMBER() OVER (
      PARTITION BY oa.tenant_id, oa.app_id
      ORDER BY oa.created_at, oa.id
    ) AS identity_rank
  FROM iam_user_official_account oa
) ranked
JOIN iam_oauth_integration i
  ON i.tenant_id = ranked.tenant_id
 AND i.provider_code = 'wechat'
 AND i.app_id = COALESCE(
   (
     SELECT ta.app_id
     FROM iam_tenant_application ta
     WHERE ta.tenant_id = ranked.tenant_id AND ta.status = 'enabled'
     ORDER BY ta.created_at, ta.app_id
     LIMIT 1
   ),
   '0'
 )
-- One client per provider identity: duplicate client rows for the same AppID
-- (a pre-0033 state the dedupe above prevents, but existing databases may
-- already carry) must not multiply the inserted account rows.
JOIN LATERAL (
  SELECT c.id
  FROM iam_oauth_client c
  WHERE c.tenant_id = ranked.tenant_id
    AND c.integration_id = i.id
    AND c.provider_code = 'wechat'
    AND c.provider_client_id = ranked.app_id
  ORDER BY c.created_at, c.id
  LIMIT 1
) c ON TRUE
WHERE ranked.identity_rank = 1
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_resource_account ra
    WHERE ra.tenant_id = ranked.tenant_id
      AND ra.organization_id = '0'
      AND ra.provider_code = 'wechat'
      AND ra.resource_account_kind = 'official_account'
      AND ra.provider_account_id = ranked.app_id
  );

-- 7. Isolation. Every legacy row that step 6 did not carry over is written to
--    the orphan ledger with its reason and the source context (identity rank,
--    display fields, credential presence flags, and the account that occupies
--    the provider identity), so the operator can review or re-append it.
--    Rows that were merely unresolved (no integration/client) are marked
--    differently so a real defect stays distinguishable from a real conflict.
INSERT INTO iam_official_account_migration_orphan (
  id, tenant_id, organization_id, source_account_id, user_id, app_id, reason,
  payload_json, created_at
)
SELECT
  'iamoaorg-' || md5(ranked.id),
  ranked.tenant_id,
  '0',
  ranked.id,
  ranked.user_id,
  ranked.app_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM iam_oauth_resource_account ra
      WHERE ra.tenant_id = ranked.tenant_id
        AND ra.organization_id = '0'
        AND ra.provider_code = 'wechat'
        AND ra.resource_account_kind = 'official_account'
        AND ra.provider_account_id = ranked.app_id
        AND ra.id <> ranked.id
    ) THEN 'provider_account_conflict'
    ELSE 'migration_source_unresolved'
  END,
  jsonb_build_object(
    'identityRank', ranked.identity_rank,
    'displayName', ranked.display_name,
    'accountType', ranked.account_type,
    'originalId', ranked.original_id,
    'enabled', ranked.enabled,
    'status', ranked.status,
    'sourceCreatedAt', ranked.created_at::text,
    'sourceUpdatedAt', ranked.updated_at::text,
    'sourceNotifyUrl', ranked.notify_url,
    'sourceNotifyEncryptMode', ranked.notify_encrypt_mode,
    'hasAppSecret', ranked.app_secret_ref IS NOT NULL AND btrim(ranked.app_secret_ref) <> '',
    'hasNotifyToken', ranked.notify_token_ref IS NOT NULL AND btrim(ranked.notify_token_ref) <> '',
    'hasEncodingAesKey', ranked.notify_encoding_aes_key_ref IS NOT NULL
      AND btrim(ranked.notify_encoding_aes_key_ref) <> '',
    'occupyingResourceAccountId', (
      SELECT ra.id FROM iam_oauth_resource_account ra
      WHERE ra.tenant_id = ranked.tenant_id
        AND ra.organization_id = '0'
        AND ra.provider_code = 'wechat'
        AND ra.resource_account_kind = 'official_account'
        AND ra.provider_account_id = ranked.app_id
        AND ra.id <> ranked.id
      ORDER BY ra.created_at, ra.id
      LIMIT 1
    ),
    'occupyingAccessMode', (
      SELECT ra.access_mode FROM iam_oauth_resource_account ra
      WHERE ra.tenant_id = ranked.tenant_id
        AND ra.organization_id = '0'
        AND ra.provider_code = 'wechat'
        AND ra.resource_account_kind = 'official_account'
        AND ra.provider_account_id = ranked.app_id
        AND ra.id <> ranked.id
      ORDER BY ra.created_at, ra.id
      LIMIT 1
    )
  )::text,
  CURRENT_TIMESTAMP
FROM (
  SELECT
    oa.*,
    ROW_NUMBER() OVER (
      PARTITION BY oa.tenant_id, oa.app_id
      ORDER BY oa.created_at, oa.id
    ) AS identity_rank
  FROM iam_user_official_account oa
) ranked
WHERE NOT EXISTS (
    SELECT 1 FROM iam_oauth_resource_account ra
    WHERE ra.id = ranked.id AND ra.tenant_id = ranked.tenant_id
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Message-push webhook: callback URL, its one-way integrity hash, the public
--    callback id, and the encryption mode (the legacy 'plain' value maps onto
--    the canonical 'plaintext').
INSERT INTO iam_oauth_webhook_config (
  id, uuid, tenant_id, organization_id, integration_id, resource_account_id,
  provider_code, webhook_code, webhook_kind, display_name, callback_url,
  callback_url_hash, callback_public_id, verification_token_status,
  encoding_aes_key_status, encryption_mode, message_handling_mode, enabled,
  status, created_by, created_at, updated_at
)
SELECT
  'iamowh-oa-' || md5(oa.id || ':' || oa.notify_url),
  gen_random_uuid()::text,
  ra.tenant_id,
  '0',
  ra.integration_id,
  ra.id,
  'wechat',
  'official-account-' || oa.app_id || '-message-push',
  'message_push',
  ra.display_name,
  btrim(oa.notify_url),
  encode(sha256(convert_to(btrim(oa.notify_url), 'UTF8')), 'hex'),
  'cb-' || gen_random_uuid()::text,
  CASE
    WHEN oa.notify_token_ref IS NOT NULL AND btrim(oa.notify_token_ref) <> '' THEN 'configured'
    ELSE 'missing'
  END,
  CASE
    WHEN oa.notify_encoding_aes_key_ref IS NOT NULL
     AND btrim(oa.notify_encoding_aes_key_ref) <> '' THEN 'configured'
    ELSE 'missing'
  END,
  CASE oa.notify_encrypt_mode
    WHEN 'safe' THEN 'safe'
    WHEN 'compatible' THEN 'compatible'
    ELSE 'plaintext'
  END,
  'ack_only',
  oa.enabled,
  'active',
  ra.maintainer_user_id,
  oa.updated_at::text,
  oa.updated_at::text
FROM iam_user_official_account oa
JOIN iam_oauth_resource_account ra
  ON ra.id = oa.id
 AND ra.tenant_id = oa.tenant_id
 AND ra.provider_code = 'wechat'
 AND ra.resource_account_kind = 'official_account'
WHERE oa.notify_url IS NOT NULL
  AND btrim(oa.notify_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_webhook_config w
    WHERE w.tenant_id = ra.tenant_id
      AND w.resource_account_id = ra.id
      AND w.webhook_kind = 'message_push'
  );

-- 9. Secrets. The sealed secret reference is carried over verbatim (it is
--    already an encoded signing-secret reference, never plaintext); only the
--    ownership columns and the one-way integrity hash are derived.
INSERT INTO iam_oauth_secret (
  id, uuid, tenant_id, organization_id, secret_owner_kind, secret_owner_id,
  resource_account_id, webhook_config_id, secret_kind, secret_ref, secret_hash,
  active_from, status, created_by, created_at, updated_at
)
SELECT
  'iamos-oa-' || md5(oa.id || ':app_secret'),
  gen_random_uuid()::text,
  ra.tenant_id,
  '0',
  'resource_account',
  ra.id,
  ra.id,
  NULL,
  'app_secret',
  oa.app_secret_ref,
  encode(sha256(convert_to(oa.app_secret_ref, 'UTF8')), 'hex'),
  oa.updated_at::text,
  'active',
  ra.maintainer_user_id,
  oa.updated_at::text,
  oa.updated_at::text
FROM iam_user_official_account oa
JOIN iam_oauth_resource_account ra
  ON ra.id = oa.id
 AND ra.tenant_id = oa.tenant_id
 AND ra.provider_code = 'wechat'
 AND ra.resource_account_kind = 'official_account'
WHERE oa.app_secret_ref IS NOT NULL
  AND btrim(oa.app_secret_ref) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_secret s
    WHERE s.tenant_id = ra.tenant_id
      AND s.secret_owner_kind = 'resource_account'
      AND s.secret_owner_id = ra.id
      AND s.secret_kind = 'app_secret'
      AND s.status = 'active'
  );

INSERT INTO iam_oauth_secret (
  id, uuid, tenant_id, organization_id, secret_owner_kind, secret_owner_id,
  resource_account_id, webhook_config_id, secret_kind, secret_ref, secret_hash,
  active_from, status, created_by, created_at, updated_at
)
SELECT
  'iamos-oa-' || md5(w.id || ':verification_token'),
  gen_random_uuid()::text,
  w.tenant_id,
  '0',
  'webhook_config',
  w.id,
  w.resource_account_id,
  w.id,
  'verification_token',
  oa.notify_token_ref,
  encode(sha256(convert_to(oa.notify_token_ref, 'UTF8')), 'hex'),
  oa.updated_at::text,
  'active',
  ra.maintainer_user_id,
  oa.updated_at::text,
  oa.updated_at::text
FROM iam_user_official_account oa
JOIN iam_oauth_resource_account ra
  ON ra.id = oa.id
 AND ra.tenant_id = oa.tenant_id
 AND ra.provider_code = 'wechat'
 AND ra.resource_account_kind = 'official_account'
JOIN iam_oauth_webhook_config w
  ON w.tenant_id = ra.tenant_id
 AND w.resource_account_id = ra.id
 AND w.webhook_kind = 'message_push'
WHERE oa.notify_token_ref IS NOT NULL
  AND btrim(oa.notify_token_ref) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_secret s
    WHERE s.tenant_id = w.tenant_id
      AND s.webhook_config_id = w.id
      AND s.secret_kind = 'verification_token'
      AND s.status = 'active'
  );

INSERT INTO iam_oauth_secret (
  id, uuid, tenant_id, organization_id, secret_owner_kind, secret_owner_id,
  resource_account_id, webhook_config_id, secret_kind, secret_ref, secret_hash,
  active_from, status, created_by, created_at, updated_at
)
SELECT
  'iamos-oa-' || md5(w.id || ':encoding_aes_key'),
  gen_random_uuid()::text,
  w.tenant_id,
  '0',
  'webhook_config',
  w.id,
  w.resource_account_id,
  w.id,
  'encoding_aes_key',
  oa.notify_encoding_aes_key_ref,
  encode(sha256(convert_to(oa.notify_encoding_aes_key_ref, 'UTF8')), 'hex'),
  oa.updated_at::text,
  'active',
  ra.maintainer_user_id,
  oa.updated_at::text,
  oa.updated_at::text
FROM iam_user_official_account oa
JOIN iam_oauth_resource_account ra
  ON ra.id = oa.id
 AND ra.tenant_id = oa.tenant_id
 AND ra.provider_code = 'wechat'
 AND ra.resource_account_kind = 'official_account'
JOIN iam_oauth_webhook_config w
  ON w.tenant_id = ra.tenant_id
 AND w.resource_account_id = ra.id
 AND w.webhook_kind = 'message_push'
WHERE oa.notify_encoding_aes_key_ref IS NOT NULL
  AND btrim(oa.notify_encoding_aes_key_ref) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_secret s
    WHERE s.tenant_id = w.tenant_id
      AND s.webhook_config_id = w.id
      AND s.secret_kind = 'encoding_aes_key'
      AND s.status = 'active'
  );

-- 10. Provider identity is unique per tenant/organization/kind once the
--     migration has run. The index is created last so the inserts above could
--     never be blocked by an index that does not match the migrated rows yet.
CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_oauth_resource_account_provider_id
  ON iam_oauth_resource_account (tenant_id, organization_id, provider_code, resource_account_kind, provider_account_id);

-- 11. Report the isolation outcome without blocking the deployment: the count
--     is a notice an operator reads from the migration log.
DO $$
DECLARE
  isolated_count BIGINT;
BEGIN
  SELECT COUNT(1) INTO isolated_count FROM iam_official_account_migration_orphan;
  RAISE NOTICE 'official account unification (0033): % legacy row(s) isolated in iam_official_account_migration_orphan (reason provider_account_conflict or migration_source_unresolved); review them before the legacy table is dropped', isolated_count;
END
$$;

COMMIT;
