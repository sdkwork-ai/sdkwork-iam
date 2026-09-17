-- sdkwork:migration
-- id: 0018_iam_provider_account_organization_scope_and_identity_kind
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Two coupled changes to the cloud account center, both required by the
--   three-level ownership model the console exposes.
--
--   (1) A fourth scope level. 0017 shipped three scopes -- 'platform' (global
--   default kept by platform operators), 'tenant' (application-tenant default)
--   and 'user' (one end user's personal account). A tenant also needs to keep an
--   account that only one organization inside it may administer, so
--   scope_type accepts 'organization' from here on. Resolution becomes
--   narrowest-first over four levels: user, organization, tenant, platform.
--   A 'organization'-scoped row must name a real organization: the root
--   organization sentinel '0' is rejected, because
--   (scope_type = 'organization', organization_id = '0') would mean exactly the
--   same thing as a tenant-wide default while being a distinct scope level to
--   the resolver. Two rows would then compete for the same "tenant default"
--   slot and the resolver's deliberate no-guessing Conflict path would fire on
--   data that a correct model cannot produce.
--
--   (2) account_type stops being a relationship label and becomes an identity
--   shape, aligned with how the mainstream clouds classify a programmatic
--   identity: long-term key material, STS-style temporary credentials, service
--   accounts, service-linked roles, federated identities, managed identities and
--   plain API keys. The previous values ('standard', 'partner', 'delegated')
--   described the relationship to the account owner, not the credential shape,
--   so they could not drive credential rotation or audit policy -- which is the
--   whole point of typing an account. Existing rows keep their information: the
--   migration copies the old token into metadata_json under 'legacyAccountType'
--   before rewriting account_type, so nothing is silently lost.
--
-- Existing rows were all created before scopes existed and stay
-- scope_type = 'tenant' with owner_user_id NULL, so their behaviour is
-- unchanged: they remain the tenant-wide default, and now additionally become
-- invisible to a caller that does not hold iam.provider_accounts.read.
--
-- Rollback: there is no paired .down.sql on purpose, and none may be added.
--   Reversing this migration would rewrite every 'organization'-scoped row back
--   into some other scope level and collapse seven identity kinds into three
--   relationship labels, which is a lossy reversal rather than a bounded,
--   data-preserving one (DATABASE_FRAMEWORK_SPEC.md section 7.1). The
--   pre-0018 CHECK on account_type also cannot be re-established once rows carry
--   an identity kind, so recreating it fails on real data. Roll back with a
--   reviewed forward migration instead (section 7.4).
-- reversible: false
-- rollback: forward-fix (reversing this migration would rewrite organization-scoped rows into another scope level and collapse the identity kinds, both lossy)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

-- ---------------------------------------------------------------------------
-- (2a) Preserve the relationship label before the column is repurposed.
--      Guarded on a well-formed JSON object so a row written by an older build
--      cannot abort the migration on a cast error.
-- ---------------------------------------------------------------------------
UPDATE iam_provider_account
   SET metadata_json = (
         CASE
           WHEN btrim(metadata_json) LIKE '{%'
             THEN (btrim(metadata_json)::jsonb
                   || jsonb_build_object('legacyAccountType', account_type))::text
           ELSE jsonb_build_object('legacyAccountType', account_type)::text
         END)
 WHERE account_type IN ('standard', 'partner', 'delegated');

-- ---------------------------------------------------------------------------
-- (2b) Map the relationship label onto the identity shape it was standing in
--      for. 'standard' and 'partner' accounts were both created from a long-term
--      key pair (0016 made credential_kind default to 'access_key_pair'), and
--      'delegated' described an account the platform was authorised to act
--      through, which is what a service-linked role is.
-- ---------------------------------------------------------------------------
UPDATE iam_provider_account
   SET account_type = CASE account_type
                        WHEN 'delegated' THEN 'service_linked_role'
                        ELSE 'long_term_key'
                      END,
       updated_at   = CURRENT_TIMESTAMP
 WHERE account_type IN ('standard', 'partner', 'delegated');

-- ---------------------------------------------------------------------------
-- (2c) Swap the account_type CHECK and default. Constraints are dropped by name
--      and re-added inside the same transaction so no window exists where the
--      column is unconstrained.
-- ---------------------------------------------------------------------------
ALTER TABLE iam_provider_account
  ALTER COLUMN account_type SET DEFAULT 'long_term_key';

ALTER TABLE iam_provider_account
  DROP CONSTRAINT IF EXISTS ck_iam_provider_account_account_type;

ALTER TABLE iam_provider_account
  ADD CONSTRAINT ck_iam_provider_account_account_type
  CHECK (account_type IN (
    'long_term_key',
    'temporary_credential',
    'service_account',
    'service_linked_role',
    'federated_identity',
    'managed_identity',
    'api_key'
  ));

-- ---------------------------------------------------------------------------
-- (1a) Admit the fourth scope level.
-- ---------------------------------------------------------------------------
ALTER TABLE iam_provider_account
  DROP CONSTRAINT IF EXISTS ck_iam_provider_account_scope;

ALTER TABLE iam_provider_account
  ADD CONSTRAINT ck_iam_provider_account_scope
  CHECK (scope_type IN ('platform', 'tenant', 'organization', 'user'));

-- ---------------------------------------------------------------------------
-- (1b) An organization-scoped account must name a real organization. The root
--      sentinel '0' is excluded so it cannot shadow the tenant-wide default
--      (see the purpose block).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ck_iam_provider_account_organization_scope_org'
      AND conrelid = 'iam_provider_account'::regclass
  ) THEN
    ALTER TABLE iam_provider_account
      ADD CONSTRAINT ck_iam_provider_account_organization_scope_org
      CHECK (scope_type <> 'organization'
             OR (organization_id IS NOT NULL
                 AND btrim(organization_id) <> ''
                 AND organization_id <> '0'));
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- (1c) Indexes need no new uniqueness: the shared/owned unique index pair and
--      the default-uniqueness pair added by 0017 already key on
--      (scope_type, tenant_id, organization_id, ...), so organization-scoped
--      rows get the same "one default per vendor and environment" guarantee as
--      every other level without a new index.
--
--      The resolution index DOES need replacing. 0017 built it without
--      organization_id, which was correct while only three scope levels existed
--      (tenant-wide defaults had no organization to key on). Now that a fourth
--      level resolves per organization, the per-level lookup must be index
--      driven on organization_id too. A plain CREATE INDEX IF NOT EXISTS would
--      silently keep the old column list because the name already exists, so
--      drop first and recreate.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_iam_provider_account_resolution;

CREATE INDEX IF NOT EXISTS idx_iam_provider_account_resolution
  ON iam_provider_account (vendor_code, scope_type, tenant_id, organization_id, owner_user_id, is_default)
  WHERE status = 'active' AND deleted_at IS NULL;

COMMIT;
