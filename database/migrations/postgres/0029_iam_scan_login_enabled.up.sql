-- sdkwork:migration
-- id: 0029_iam_scan_login_enabled
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the tenant-level scan-login master switch so an operator can
--   turn QR login on or off as a whole from the backend-admin
--   `iam.oauth.scanLoginSettings` surface. When disabled:
--     - `/app/v3/api/oauth/scan_login_modes` advertises no QR modes, so the
--       login/register page hides the QR rail instead of falling back to the
--       built-in default modes
--     - `oauth.deviceAuthorizations.create` refuses to mint a new QR session
--   The existing per-mode flags (`url_login_enabled`, `modes_json` entries,
--   `iam_oauth_resource_account.qr_default_enabled`) keep their values, so
--   re-enabling restores the operator's last configuration. Defaults to 1 so
--   existing deployments keep the pre-switch behavior.
-- reversible: false
-- rollback: forward-fix (dropping the column would discard the operator's
--   master-switch state; the pre-switch behavior can be restored by setting
--   the column to 1 instead, so no lossy down migration is provided per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_oauth_scan_login_config
  ADD COLUMN IF NOT EXISTS scan_login_enabled INTEGER NOT NULL DEFAULT 1;

COMMIT;
