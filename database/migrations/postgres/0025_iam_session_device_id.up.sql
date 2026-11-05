-- sdkwork:migration
-- id: 0025_iam_session_device_id
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the optional opaque device identity to iam_session so one user
--   can keep one session per device for the same application instead of one
--   session per application. Desktop logins send a stable per-install device
--   id; a new login replaces only the previous session of the same
--   application on that device, while another device or a browser session
--   without a device id keeps its session. Existing rows stay NULL and keep
--   the previous "one session per application" replacement behavior.
-- reversible: false
-- rollback: forward-fix (dropping the column would discard the device binding;
--   a bounded data-preserving reversal cannot restore values that were
--   removed, so this migration is irreversible per DATABASE_FRAMEWORK_SPEC.md
--   section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_session ADD COLUMN IF NOT EXISTS device_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_iam_session_device_id'
  ) THEN
    ALTER TABLE iam_session
      ADD CONSTRAINT ck_iam_session_device_id
      CHECK (
        device_id IS NULL
        OR (length(device_id) BETWEEN 1 AND 128 AND device_id ~ '^[A-Za-z0-9._:-]+$')
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_iam_session_tenant_user_device
  ON iam_session (tenant_id, user_id, app_id, device_id, revoked_at);

COMMIT;
