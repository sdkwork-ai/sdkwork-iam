-- Persona catalog seed: the selectable roles and interest directions the
-- onboarding picker and recommendation surfaces offer.
--
-- Ownership: every row is platform-owned (owner_tenant_id = '0'), following the
-- iam_oauth_provider_catalog convention, so no seed pins a tenant literal and
-- every tenant reads the same catalog. A tenant that later needs its own
-- taxonomy inserts rows with its tenant id; read paths prefer the tenant row
-- over the platform row.
--
-- Language-neutral columns only: codes, order, status, and the optional
-- iam_role_code mapping onto the authorization role catalog. Display labels are
-- locale data and live in seeds/locales/<locale>/ (I18N_SPEC.md section 11), so
-- this file never carries user-visible copy.
--
-- Idempotency: INSERT ... ON CONFLICT (owner_tenant_id, code) DO UPDATE refreshes
-- catalog metadata, keeps the existing primary key, never touches label_i18n /
-- description_i18n (locale seeds own them), and never deletes rows. Re-running
-- is safe.

INSERT INTO iam_persona_role (
  id, owner_tenant_id, code, iam_role_code, sort_order, status, created_at, updated_at
)
VALUES
  ('iam-persona-role-learner', '0', 'learner', 'course_learner', 10, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-employee', '0', 'employee', 'apps_employee', 20, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-teacher', '0', 'teacher', 'course_instructor', 30, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-partner', '0', 'partner', 'apps_partner', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-manager', '0', 'manager', NULL, 50, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-developer', '0', 'developer', NULL, 60, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-creator', '0', 'creator', 'ops_content_moderator', 70, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-role-visitor', '0', 'visitor', 'apps_guest', 80, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (owner_tenant_id, code) DO UPDATE
SET iam_role_code = EXCLUDED.iam_role_code,
    sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO iam_persona_interest (
  id, owner_tenant_id, code, sort_order, status, created_at, updated_at
)
VALUES
  ('iam-persona-interest-postgraduate', '0', 'postgraduate', 10, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-recommendation', '0', 'recommendation', 20, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-employment', '0', 'employment', 30, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-civil-service', '0', 'civil-service', 40, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-study-abroad', '0', 'study-abroad', 50, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-certification', '0', 'certification', 60, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-language', '0', 'language', 70, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-k12', '0', 'k12', 80, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-ai-skills', '0', 'ai-skills', 90, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-development', '0', 'development', 100, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-content', '0', 'content', 110, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('iam-persona-interest-management', '0', 'management', 120, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (owner_tenant_id, code) DO UPDATE
SET sort_order = EXCLUDED.sort_order,
    status = EXCLUDED.status,
    updated_at = CURRENT_TIMESTAMP;
