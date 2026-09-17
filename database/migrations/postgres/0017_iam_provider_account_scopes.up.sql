-- sdkwork:migration
-- id: 0017_iam_provider_account_scopes
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Give a cloud account a scope so one account is reused across every
--   cloud resource instead of being copied per consumer, and so three levels
--   of ownership can coexist on one surface:
--     * scope_type = 'platform' -- a global default kept by platform
--       operators and resolvable from every tenant.
--     * scope_type = 'tenant'   -- an application-tenant default kept by the
--       tenant administrator and visible to every member of that tenant.
--     * scope_type = 'user'     -- a personal account created by one end user,
--       visible to that user alone and preferred over the wider scopes.
--   is_default marks the account a resolver picks inside its scope level.
--   Existing rows were all created per tenant before scopes existed, so they
--   become scope_type = 'tenant' and keep their current behaviour exactly.
--   A partial unique index pair replaces the previous one because Postgres
--   treats NULL as distinct: a single column list over owner_user_id would let
--   two shared accounts collide on the same account_code.
--
-- Rollback: there is no paired .down.sql on purpose, and none may be added.
--   Reversing this migration would drop scope_type, owner_user_id and
--   is_default, which is a lossy reversal rather than a bounded, data-preserving
--   one (DATABASE_FRAMEWORK_SPEC.md section 7.1). It is also no longer
--   mechanically possible once the scope model is in use: the model lets the
--   same account_code exist in a user scope and a tenant scope at once, which
--   the pre-0017 three-column unique index could not represent, so recreating
--   that index fails on real data. Roll back with a reviewed forward migration
--   instead (section 7.4).
-- reversible: false
-- rollback: forward-fix (reversing this migration drops the scope columns and cannot rebuild the pre-0017 unique index once account codes exist in more than one scope)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_provider_account
  ADD COLUMN IF NOT EXISTS scope_type TEXT NOT NULL DEFAULT 'tenant';

ALTER TABLE iam_provider_account
  ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

ALTER TABLE iam_provider_account
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

-- Adding a NOT NULL column with a DEFAULT already stamps existing rows, but be
-- explicit so a row inserted by an older build mid-upgrade cannot stay blank.
UPDATE iam_provider_account
   SET scope_type = 'tenant'
 WHERE scope_type IS NULL OR scope_type = '';

-- Constraints first, then the indexes: a bad payload must fail on the CHECK
-- with a readable name rather than on an index collision.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_iam_provider_account_scope'
      AND conrelid = 'iam_provider_account'::regclass
  ) THEN
    ALTER TABLE iam_provider_account
      ADD CONSTRAINT ck_iam_provider_account_scope
      CHECK (scope_type IN ('platform', 'tenant', 'user'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_iam_provider_account_scope_owner'
      AND conrelid = 'iam_provider_account'::regclass
  ) THEN
    ALTER TABLE iam_provider_account
      ADD CONSTRAINT ck_iam_provider_account_scope_owner
      CHECK ((scope_type = 'user') = (owner_user_id IS NOT NULL));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_iam_provider_account_owner_user_id'
      AND conrelid = 'iam_provider_account'::regclass
  ) THEN
    ALTER TABLE iam_provider_account
      ADD CONSTRAINT ck_iam_provider_account_owner_user_id
      CHECK (owner_user_id IS NULL
             OR (owner_user_id = btrim(owner_user_id)
                 AND length(owner_user_id) BETWEEN 1 AND 64));
  END IF;
END
$$;

-- Replaced by the six-column shared/owned pair below.
DROP INDEX IF EXISTS ux_iam_provider_account_scope_code;

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_shared_code
  ON iam_provider_account (scope_type, tenant_id, organization_id, account_code)
  WHERE owner_user_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_owned_code
  ON iam_provider_account (scope_type, tenant_id, organization_id, owner_user_id, account_code)
  WHERE owner_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_shared_default
  ON iam_provider_account (scope_type, tenant_id, organization_id, vendor_code, environment)
  WHERE is_default AND owner_user_id IS NULL AND deleted_at IS NULL AND status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS ux_iam_provider_account_owned_default
  ON iam_provider_account (scope_type, tenant_id, organization_id, owner_user_id, vendor_code, environment)
  WHERE is_default AND owner_user_id IS NOT NULL AND deleted_at IS NULL AND status = 'active';

CREATE INDEX IF NOT EXISTS idx_iam_provider_account_resolution
  ON iam_provider_account (vendor_code, scope_type, tenant_id, owner_user_id, is_default)
  WHERE status = 'active' AND deleted_at IS NULL;

COMMIT;
