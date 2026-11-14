-- English labels for the authorization role catalog (en-US seed locale).
--
-- One locale per file (I18N_SPEC.md section 11). Every statement merges this
-- locale's key into the catalog row and never touches another locale, so
-- re-running replaces the same key and activating a further locale needs no
-- schema change.
--
-- Target selection is `standard = 1` rather than a tenant literal: the standard
-- catalog is materialized per tenant from the same IAM module manifests, so
-- every tenant that already owns those rows receives the same localized label
-- without this file pinning a bootstrap tenant id. Tenant-created
-- (`role_class = 'tenant_custom'`) roles keep their operator-entered `name` and
-- an empty map, which is why they are excluded.
--
-- `name` is left untouched: it stays the canonical fallback label and the last
-- resort for a locale this file does not cover. Role codes come from
-- seeds/common/004_iam_role_catalog_seed.sql.

UPDATE iam_role AS r
SET label_i18n = (r.label_i18n::jsonb || v.label)::text,
    description_i18n = (r.description_i18n::jsonb || v.description)::text,
    updated_at = CURRENT_TIMESTAMP::text
FROM (VALUES
  ('app_user', jsonb_build_object('en-US', 'App User'), jsonb_build_object('en-US', 'Uses the organization applications with baseline permissions')),
  ('org_admin', jsonb_build_object('en-US', 'Organization Admin'), jsonb_build_object('en-US', 'Manages organization members, roles, and authorization')),
  ('org_assistant', jsonb_build_object('en-US', 'Organization Assistant'), jsonb_build_object('en-US', 'Supports day-to-day organization operations and member services')),
  ('org_auditor', jsonb_build_object('en-US', 'Organization Auditor'), jsonb_build_object('en-US', 'Reviews organization activity and security records')),
  ('org_finance', jsonb_build_object('en-US', 'Organization Finance'), jsonb_build_object('en-US', 'Manages organization billing, invoices, and settlement')),
  ('org_operations', jsonb_build_object('en-US', 'Organization Operations'), jsonb_build_object('en-US', 'Runs organization content, campaigns, and operational data')),
  ('platform_system_admin', jsonb_build_object('en-US', 'Platform System Admin'), jsonb_build_object('en-US', 'Maintains platform configuration, modules, and runtime state')),
  ('platform_super_admin', jsonb_build_object('en-US', 'Platform Super Admin'), jsonb_build_object('en-US', 'Holds every platform permission')),
  ('course_learner', jsonb_build_object('en-US', 'Course Learner'), jsonb_build_object('en-US', 'Studies course content and completes exercises')),
  ('course_instructor', jsonb_build_object('en-US', 'Course Instructor'), jsonb_build_object('en-US', 'Teaches courses, prepares material, and answers questions')),
  ('course_assistant', jsonb_build_object('en-US', 'Course Teaching Assistant'), jsonb_build_object('en-US', 'Supports instructors with courses and learners')),
  ('course_reviewer', jsonb_build_object('en-US', 'Course Catalog Reviewer'), jsonb_build_object('en-US', 'Reviews course catalog content before publication')),
  ('apps_employee', jsonb_build_object('en-US', 'Apps Employee'), jsonb_build_object('en-US', 'Uses enterprise applications for daily work')),
  ('apps_partner', jsonb_build_object('en-US', 'Apps Partner'), jsonb_build_object('en-US', 'Uses and co-builds applications as a channel partner')),
  ('apps_guest', jsonb_build_object('en-US', 'Apps Guest'), jsonb_build_object('en-US', 'Temporary user with limited application access')),
  ('ops_support_agent', jsonb_build_object('en-US', 'Ops Support Agent'), jsonb_build_object('en-US', 'Handles and follows up on user support requests')),
  ('ops_content_moderator', jsonb_build_object('en-US', 'Ops Content Moderator'), jsonb_build_object('en-US', 'Reviews community and content compliance')),
  ('skills_admin_operator', jsonb_build_object('en-US', 'Skills Admin Operator'), jsonb_build_object('en-US', 'Maintains the skill catalog and publishing policy')),
  ('skills_marketplace_user', jsonb_build_object('en-US', 'Skills Marketplace User'), jsonb_build_object('en-US', 'Browses, installs, and uses skills')),
  ('mcp_admin_operator', jsonb_build_object('en-US', 'MCP Admin Operator'), jsonb_build_object('en-US', 'Maintains MCP services and connection configuration')),
  ('mcp_workspace_user', jsonb_build_object('en-US', 'MCP Workspace User'), jsonb_build_object('en-US', 'Uses MCP services inside a workspace')),
  ('appstore_admin_operator', jsonb_build_object('en-US', 'App Store Admin Operator'), jsonb_build_object('en-US', 'Reviews applications and runs the store')),
  ('appstore_publisher', jsonb_build_object('en-US', 'App Store Publisher'), jsonb_build_object('en-US', 'Publishes and maintains listed applications'))
) AS v(code, label, description)
WHERE r.standard = 1
  AND r.code = v.code;
