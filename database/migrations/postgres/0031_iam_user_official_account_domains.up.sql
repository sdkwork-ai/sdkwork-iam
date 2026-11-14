-- sdkwork:migration
-- id: 0031_iam_user_official_account_domains
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Align the per-user official-account configuration with the WeChat
--   公众号 settings an integration actually needs: the three protected-domain
--   sets (JS interface security, web authorization, business) and the
--   message-push encryption mode. Each domain set is stored as a JSON array of
--   normalized host names; the encryption mode selects plaintext, compatible,
--   or safe message handling for the configured callback URL.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard every configured
--   domain set and encryption mode; DATABASE_FRAMEWORK_SPEC.md section 7.1 keeps
--   the migration irreversible with a forward-fix instead of a lossy down
--   migration)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_user_official_account
  ADD COLUMN IF NOT EXISTS js_secure_domains TEXT NOT NULL DEFAULT '[]';

ALTER TABLE iam_user_official_account
  ADD COLUMN IF NOT EXISTS web_auth_domains TEXT NOT NULL DEFAULT '[]';

ALTER TABLE iam_user_official_account
  ADD COLUMN IF NOT EXISTS business_domains TEXT NOT NULL DEFAULT '[]';

ALTER TABLE iam_user_official_account
  ADD COLUMN IF NOT EXISTS notify_encrypt_mode TEXT NOT NULL DEFAULT 'plaintext';

ALTER TABLE iam_user_official_account
  DROP CONSTRAINT IF EXISTS ck_iam_user_official_account_js_secure_domains;
ALTER TABLE iam_user_official_account
  DROP CONSTRAINT IF EXISTS ck_iam_user_official_account_web_auth_domains;
ALTER TABLE iam_user_official_account
  DROP CONSTRAINT IF EXISTS ck_iam_user_official_account_business_domains;
ALTER TABLE iam_user_official_account
  DROP CONSTRAINT IF EXISTS ck_iam_user_official_account_notify_encrypt_mode;

ALTER TABLE iam_user_official_account
  ADD CONSTRAINT ck_iam_user_official_account_js_secure_domains
    CHECK (jsonb_typeof(js_secure_domains::jsonb) = 'array'),
  ADD CONSTRAINT ck_iam_user_official_account_web_auth_domains
    CHECK (jsonb_typeof(web_auth_domains::jsonb) = 'array'),
  ADD CONSTRAINT ck_iam_user_official_account_business_domains
    CHECK (jsonb_typeof(business_domains::jsonb) = 'array'),
  ADD CONSTRAINT ck_iam_user_official_account_notify_encrypt_mode
    CHECK (notify_encrypt_mode IN ('plaintext', 'compatible', 'safe'));

COMMIT;
