-- sdkwork:migration
-- id: 0028_iam_tenant_profile
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Add the operator-managed tenant profile columns so the
--   backend-admin tenant directory can create and edit a complete tenant
--   record instead of only code/name/status:
--     - logo_resource_snapshot: JSON media-resource snapshot for the tenant
--       logo, following the iam_user avatar and iam_organization logo
--       precedent (bounded by the 128 KiB snapshot ceiling)
--     - industry_category: industry classification token
--       (e.g. internet / finance / manufacturing)
--     - description: free-text tenant introduction
--     - contact_phone / contact_email / address: tenant contact details
--   All columns are nullable with no default: existing tenants keep their
--   current shape, and the backend only writes them when the operator supplies
--   or explicitly clears a value.
-- reversible: false
-- rollback: forward-fix (dropping the columns would discard operator-entered
--   tenant profile data; a bounded data-preserving reversal cannot restore
--   values that were removed, so this migration is irreversible per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_tenant
  ADD COLUMN IF NOT EXISTS logo_resource_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS industry_category TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

COMMIT;
