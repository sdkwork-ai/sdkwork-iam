-- IAM role catalog seed for the default bootstrap tenant 100001.
--
-- This seed mirrors the IMF catalog materializer so that `db:seed` alone yields a complete
-- role catalog: role ids are the deterministic `iam-role-<tenant_id>-<code normalized>`
-- identifiers produced by `standard_role_id` in
-- `crates/sdkwork-iam-module-registry/src/materialize.rs`, where every character outside
-- `[a-z0-9]` is replaced by `-`.
--
-- Coverage: the eight immutable platform standard roles owned by `iam-kernel` (surface
-- `app` / `organization` / `platform`, `role_class = platform_standard`), plus every
-- domain standard role declared under `roles.domainStandardRoles` in
-- `iam/modules/<moduleId>/iam.module.manifest.json` for the modules enabled in
-- `iam/registry/iam-registry.config.json` (`role_class = domain_standard`, with module_id,
-- surface, assignable, standard, and binding_principal_kind copied from those manifest
-- entries). Optional/disabled modules such as `iot` are intentionally excluded, per
-- IAM_MODULE_MANIFEST_SPEC R7 ("disabled modules are excluded from seed materialization").
--
-- Permissions are deliberately NOT initialized here. This database module has no
-- established `iam_permission` / `iam_role_permission` seed pattern (see
-- `001_bootstrap.sql`, `002_default_iam_subject.sql`, `003_iam_application_bootstrap_seed.sql`),
-- so permission rows and role-to-permission grants remain owned by catalog materialization
-- (`materialize_postgres_catalog`, re-run from `IamDatabaseModule::after_seed`). Until that
-- materialization runs, the roles below exist with no permission grants.
--
-- Localized display text is NOT owned here. `label_i18n` / `description_i18n` are
-- locale maps seeded one locale per file under `seeds/locales/<locale>/`
-- (I18N_SPEC.md section 11): `003_iam_role_labels.sql` owns `zh-CN` and
-- `002_iam_role_labels.sql` owns `en-US`, both selected by `standard = 1` so no
-- locale seed pins a tenant literal. `name` below is the catalog's canonical
-- fallback label, shown only when the requested locale has no map entry and for
-- tenant-created roles, whose `name` is operator-entered account data rather
-- than seeded copy. Adding or activating a locale therefore needs no schema
-- change and no edit to this file.
--
-- Idempotency: INSERT ... ON CONFLICT (tenant_id, code) DO UPDATE only refreshes catalog
-- metadata, keeps the existing primary key, leaves `label_i18n` /
-- `description_i18n` untouched, and never deletes roles. Re-running is safe.

INSERT INTO iam_role (
  id,
  tenant_id,
  code,
  name,
  status,
  role_class,
  module_id,
  surface,
  assignable,
  standard,
  binding_principal_kind,
  created_at,
  updated_at
)
VALUES
  ('iam-role-100001-app-user', '100001', 'app_user', 'App User', 'active', 'platform_standard', 'iam-kernel', 'app', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-org-admin', '100001', 'org_admin', 'Organization Admin', 'active', 'platform_standard', 'iam-kernel', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-org-assistant', '100001', 'org_assistant', 'Organization Assistant', 'active', 'platform_standard', 'iam-kernel', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-org-auditor', '100001', 'org_auditor', 'Organization Auditor', 'active', 'platform_standard', 'iam-kernel', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-org-finance', '100001', 'org_finance', 'Organization Finance', 'active', 'platform_standard', 'iam-kernel', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-org-operations', '100001', 'org_operations', 'Organization Operations', 'active', 'platform_standard', 'iam-kernel', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-platform-system-admin', '100001', 'platform_system_admin', 'Platform System Admin', 'active', 'platform_standard', 'iam-kernel', 'platform', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-platform-super-admin', '100001', 'platform_super_admin', 'Platform Super Admin', 'active', 'platform_standard', 'iam-kernel', 'platform', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-course-learner', '100001', 'course_learner', 'Course Learner', 'active', 'domain_standard', 'courses', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-course-instructor', '100001', 'course_instructor', 'Course Instructor', 'active', 'domain_standard', 'courses', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-course-assistant', '100001', 'course_assistant', 'Course Teaching Assistant', 'active', 'domain_standard', 'courses', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-course-reviewer', '100001', 'course_reviewer', 'Course Catalog Reviewer', 'active', 'domain_standard', 'courses', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-apps-employee', '100001', 'apps_employee', 'Apps Employee', 'active', 'domain_standard', 'apps', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-apps-partner', '100001', 'apps_partner', 'Apps Partner', 'active', 'domain_standard', 'apps', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-apps-guest', '100001', 'apps_guest', 'Apps Guest', 'active', 'domain_standard', 'apps', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-ops-support-agent', '100001', 'ops_support_agent', 'Ops Support Agent', 'active', 'domain_standard', 'ops', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-ops-content-moderator', '100001', 'ops_content_moderator', 'Ops Content Moderator', 'active', 'domain_standard', 'ops', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-skills-admin-operator', '100001', 'skills_admin_operator', 'Skills Admin Operator', 'active', 'domain_standard', 'skills', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-skills-marketplace-user', '100001', 'skills_marketplace_user', 'Skills Marketplace User', 'active', 'domain_standard', 'skills', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-mcp-admin-operator', '100001', 'mcp_admin_operator', 'MCP Admin Operator', 'active', 'domain_standard', 'mcp', 'organization', 1, 1, 'organization_membership', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-mcp-workspace-user', '100001', 'mcp_workspace_user', 'MCP Workspace User', 'active', 'domain_standard', 'mcp', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-appstore-admin-operator', '100001', 'appstore_admin_operator', 'App Store Admin Operator', 'active', 'domain_standard', 'appstore', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-role-100001-appstore-publisher', '100001', 'appstore_publisher', 'App Store Publisher', 'active', 'domain_standard', 'appstore', 'application', 1, 1, 'user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (tenant_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  role_class = EXCLUDED.role_class,
  module_id = EXCLUDED.module_id,
  surface = EXCLUDED.surface,
  assignable = EXCLUDED.assignable,
  standard = EXCLUDED.standard,
  binding_principal_kind = EXCLUDED.binding_principal_kind,
  status = EXCLUDED.status,
  updated_at = CURRENT_TIMESTAMP;
