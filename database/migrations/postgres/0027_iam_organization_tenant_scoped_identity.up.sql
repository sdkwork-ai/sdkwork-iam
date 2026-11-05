-- sdkwork:migration
-- id: 0027_iam_organization_tenant_scoped_identity
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Scope the organization primary key by tenant and provision the
--   personal-login organization sentinel per tenant. Personal logins persist
--   `organization_id = "0"`, but the old global `id` primary key allowed only
--   the bootstrap tenant to own that row. Any other tenant failed the
--   `iam_session_org_fk` foreign key on login. The primary key becomes
--   `(tenant_id, id)`, and every existing tenant receives its own `"0"`
--   sentinel before new sessions can reference it.
-- reversible: false
-- rollback: forward-fix (restoring the global `id` primary key requires
--   deleting every non-bootstrap sentinel and the sessions that reference it)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 120s

BEGIN;

ALTER TABLE iam_organization DROP CONSTRAINT IF EXISTS iam_organization_pkey;

ALTER TABLE iam_organization
  ADD CONSTRAINT iam_organization_pkey PRIMARY KEY (tenant_id, id);

INSERT INTO iam_organization (
  id,
  tenant_id,
  parent_organization_id,
  code,
  name,
  organization_kind,
  tenant_boundary_kind,
  data_boundary_kind,
  app_boundary_enabled,
  verification_status,
  path,
  status,
  created_at,
  updated_at
)
SELECT
  '0',
  t.id,
  NULL,
  '__personal_login__',
  'Root Organization',
  'team',
  'exclusive',
  'tenant',
  0,
  'verified',
  '/0',
  'active',
  now()::text,
  now()::text
FROM iam_tenant t
WHERE NOT EXISTS (
  SELECT 1 FROM iam_organization o
  WHERE o.tenant_id = t.id AND o.id = '0'
)
ON CONFLICT DO NOTHING;

COMMIT;
