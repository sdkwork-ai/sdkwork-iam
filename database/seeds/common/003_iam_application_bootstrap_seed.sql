-- Platform application template and default tenant applications for IAM bootstrap and dev seeds.
-- Runtime app_id values follow app_{tenant_id} for standard SDKWork tenant ids.

INSERT INTO iam_application_template (
  id,
  owner_tenant_id,
  app_key,
  name,
  display_name,
  app_type,
  version,
  channel,
  status,
  runtime_config_json,
  artifacts_config_json,
  default_access_permissions_json,
  created_at,
  updated_at
)
VALUES (
  'tmpl_sdkwork_platform',
  '0',
  'sdkwork-platform',
  'sdkwork-platform',
  'SDKWork Platform',
  'WEB',
  '1.0.0',
  'stable',
  'active',
  '{}'::jsonb,
  '{}'::jsonb,
  '["iam.self"]'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  app_key = EXCLUDED.app_key,
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  app_type = EXCLUDED.app_type,
  version = EXCLUDED.version,
  channel = EXCLUDED.channel,
  status = EXCLUDED.status,
  default_access_permissions_json = EXCLUDED.default_access_permissions_json,
  updated_at = CURRENT_TIMESTAMP;

-- The platform application row carries three unique identities (id, app_id,
-- and the partial (tenant_id, primary_domain) index), and long-lived shared
-- databases drift on which of them an older seed run provisioned. Update by
-- id and insert only when the row is genuinely absent, so re-seeding never
-- violates a sibling key.
UPDATE iam_tenant_application SET
  app_id = 'app_100001',
  tenant_id = '100001',
  organization_id = '0',
  template_id = 'tmpl_sdkwork_platform',
  template_version = '1.0.0',
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

INSERT INTO iam_tenant_application (
  id,
  app_id,
  tenant_id,
  organization_id,
  template_id,
  template_version,
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
  'tmpl_sdkwork_platform',
  '1.0.0',
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
  SELECT 1 FROM iam_tenant_application WHERE id = 'tapp_100001_0_sdkwork_platform'
);
