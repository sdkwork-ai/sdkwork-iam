-- sdkwork:migration
-- id: 0048_iam_login_follow_qr
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Persist the tenant-level "follow our official account" QR shown on
--   the hosted desktop login-success page (`/auth/desktop/launch`). An
--   operator picks one WeChat official account in the OAuth admin surface; the
--   backend generates that account's permanent parameterized follow QR once
--   and stores it here, so the success page can render the image without
--   calling WeChat (or holding the AppSecret) on every login.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard the operator's
--   selected account and its generated QR; clearing them restores the
--   "no follow QR" state without a lossy down migration, per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_oauth_scan_login_config
  ADD COLUMN IF NOT EXISTS login_follow_qr_enabled INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS login_follow_qr_account_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS login_follow_qr_account_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS login_follow_qr_image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS login_follow_qr_scene TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS login_follow_qr_updated_at TEXT NOT NULL DEFAULT '';

COMMIT;
