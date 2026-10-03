-- sdkwork:migration
-- id: 0020_iam_organization_profile
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the operator-managed profile columns to iam_organization so
--   the backend-admin organization directory can create and edit the
--   company-level attributes the admin console collects:
--     - logo_resource_snapshot: JSON media-resource snapshot for the
--       organization logo, following the iam_user avatar precedent
--       (data URL or external URL, bounded by the 128 KiB snapshot ceiling)
--     - organization_kind: already NOT NULL — no storage change; the console
--       now submits it instead of the backend hard-coding 'enterprise'
--     - organization_category: tenant-local classification token
--       (e.g. group / subsidiary / business-unit)
--     - industry_category: industry classification token
--       (e.g. manufacturing / internet / finance)
--     - description: free-text organization / company introduction
--     - contact_phone / contact_email / address: company basic contact info
--   All seven are nullable with no default: existing rows keep their current
--   shape, and the backend only writes them when the operator supplies a
--   value. parent_organization_id already exists; moving a node is served by
--   the iam_organization_closure rebuild in the backend update handler.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard operator-entered
--   organization profile data; a bounded data-preserving reversal cannot
--   restore values that were removed, so this migration is irreversible per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_organization
  ADD COLUMN IF NOT EXISTS logo_resource_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS organization_category TEXT,
  ADD COLUMN IF NOT EXISTS industry_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMIT;
