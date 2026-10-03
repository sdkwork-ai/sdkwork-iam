-- sdkwork:migration
-- id: 0019_iam_user_profile_columns
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the operator-managed profile columns to iam_user so the
--   backend-admin user directory can create and edit the basic identity
--   attributes the admin console collects:
--     - gender: self-described gender token ('male' | 'female' | 'unknown'),
--       written by backend users.create / users.update and returned by
--       users.list / users.retrieve
--     - birth_date: ISO calendar date 'YYYY-MM-DD' stored as TEXT, matching
--       the TEXT timestamp convention this baseline already uses everywhere
--     - country: ISO 3166-1 alpha-2 code selected in the admin console
--   All three are nullable with no default: existing rows keep their current
--   shape, and the backend only writes them when the operator supplies a
--   value. The avatar already has storage columns
--   (avatar_media_resource_id / avatar_object_blob_id /
--   avatar_resource_snapshot), so no avatar storage is added here.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard operator-entered
--   profile data; a bounded data-preserving reversal cannot restore values
--   that were removed, so this migration is irreversible per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_user
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS birth_date TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

COMMIT;
