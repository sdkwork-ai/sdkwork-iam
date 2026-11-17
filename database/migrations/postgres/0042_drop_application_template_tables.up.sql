-- sdkwork:migration
-- id: 0042_drop_application_template_tables
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Drop the two retired application-template tables. Their last runtime
--   reader/writer disappeared with `register_application_template` and the
--   template-backed provisioning path; 0041 removed the installation's
--   `template_id` foreign key, so the parent table has no dependent column.
--   The package table goes first because it references the parent.
-- reversible: false
-- rollback: forward-fix (dropped definition rows cannot be restored; a database
--   that still needs them must be read before applying, and a restore is a
--   deliberate forward change, not a down migration)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_application_template_package and
--   iam_application_template
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Preflight (must both return 0 before applying):
--   SELECT count(*) FROM iam_tenant_application WHERE template_id IS NOT NULL;
--   SELECT count(*) FROM iam_application_template_package
--    WHERE template_id NOT IN (SELECT id FROM iam_application_template);
-- 0041 must have run first; it drops the installation column that references
-- iam_application_template.

BEGIN;

DROP TABLE IF EXISTS iam_application_template_package;
DROP TABLE IF EXISTS iam_application_template;

COMMIT;
