-- Default platform installation for IAM bootstrap and dev seeds.
-- Application templates are retired (migrations 0041/0042): an installation is
-- created from its deploy application plus explicit attributes, and the
-- deterministic row id keeps the historical `sdkwork_platform` suffix.
-- Runtime app_id values follow app_{tenant_id} for standard SDKWork tenant ids.

-- The platform application row carries three unique identities (id, app_id,
-- and the partial (tenant_id, primary_domain) index), and long-lived shared
-- databases drift on which of them an older seed run provisioned. Update by
-- id and insert only when the row is genuinely absent, so re-seeding never
-- violates a sibling key.
UPDATE iam_application_installation SET
  app_id = 'app_100001',
  tenant_id = '100001',
  organization_id = '0',
  instance_key = 'default',
  display_name = 'SDKWork Default',
  environment = 'prod',
  application_type = 'pc',
  status = 'enabled',
  primary_domain = 'app_100001.localhost',
  domain_config_json = '{}'::jsonb,
  access_permissions_json = '["iam.self"]'::jsonb,
  activated_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'tapp_100001_0_sdkwork_platform';

INSERT INTO iam_application_installation (
  id,
  app_id,
  tenant_id,
  organization_id,
  instance_key,
  display_name,
  environment,
  application_type,
  status,
  primary_domain,
  domain_config_json,
  access_permissions_json,
  runtime_config_json,
  provisioned_at,
  activated_at,
  created_at,
  updated_at
)
SELECT
  'tapp_100001_0_sdkwork_platform',
  'app_100001',
  '100001',
  '0',
  'default',
  'SDKWork Default',
  'prod',
  'pc',
  'enabled',
  'app_100001.localhost',
  '{}'::jsonb,
  '["iam.self"]'::jsonb,
  '{}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM iam_application_installation WHERE id = 'tapp_100001_0_sdkwork_platform'
);
