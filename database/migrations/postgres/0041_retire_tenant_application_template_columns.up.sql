-- sdkwork:migration
-- id: 0041_retire_tenant_application_template_columns
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Retire the application-template anchor of an installation. An
--   installation is created from a deploy application plus explicit attributes
--   (`APPLICATION_IDENTITY_SPEC.md` §9 supersedes the template as a third
--   application definition), so `iam_tenant_application` must stop carrying
--   `template_id`/`template_version` and the (tenant, organization, template)
--   dedupe index must go. The deploy application anchor and the instance key
--   already enforce installation identity.
-- reversible: false
-- rollback: forward-fix (dropping a column discards its stored values; the
--   template tables are dropped by 0042 and no runtime reader remains, so the
--   retirement is completed by a forward fix, not by re-creating the columns)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_tenant_application
-- lock_timeout: 2s
-- statement_timeout: 60s
--
-- Preflight (must return 0 before applying):
--   SELECT count(*) FROM iam_tenant_application WHERE template_id IS NULL;
--   (every existing row still carries the legacy anchor)
-- Deployments that intend to keep the template assignment can read it before
-- the migration:
--   SELECT id, app_id, template_id, template_version FROM iam_tenant_application;

BEGIN;

DROP INDEX IF EXISTS uk_iam_tenant_application_org_template;
DROP INDEX IF EXISTS idx_iam_tenant_application_template;

ALTER TABLE iam_tenant_application
    DROP COLUMN IF EXISTS template_id,
    DROP COLUMN IF EXISTS template_version;

COMMIT;
