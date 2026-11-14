-- sdkwork:migration
-- id: 0030_iam_authz_epoch
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Bounded, data-preserving reversal of 0030_iam_authz_epoch. Drops
--   only the derived authorization-state bookkeeping (epoch counter, triggers,
--   and the session snapshot version column). No business grant, role, or
--   binding row is modified; sessions simply fall back to the login-time
--   snapshot they already hold.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

DROP TRIGGER IF EXISTS trg_iam_role_authz_epoch ON iam_role;
DROP TRIGGER IF EXISTS trg_iam_role_permission_authz_epoch ON iam_role_permission;
DROP TRIGGER IF EXISTS trg_iam_permission_authz_epoch ON iam_permission;
DROP TRIGGER IF EXISTS trg_iam_role_binding_authz_epoch ON iam_role_binding;
DROP TRIGGER IF EXISTS trg_iam_role_exclusion_authz_epoch ON iam_role_exclusion;
DROP TRIGGER IF EXISTS trg_iam_catalog_materialization_authz_epoch ON iam_catalog_materialization;

DROP FUNCTION IF EXISTS iam_bump_authz_epoch();

ALTER TABLE iam_session
  DROP COLUMN IF EXISTS authz_epoch;

DROP TABLE IF EXISTS iam_authz_epoch;

COMMIT;
