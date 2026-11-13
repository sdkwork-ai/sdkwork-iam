-- sdkwork:migration
-- id: 0030_iam_authz_epoch
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Version the per-session authorization snapshot so a permission
--   catalog change, a role grant/revoke, or a role-binding change takes effect
--   without forcing users to log in again.
--   `iam_session.permission_scope_json` is written at login. Before this
--   migration it was authoritative for the whole session lifetime, so a new
--   function/catalog on deploy only reached users after re-authentication, and
--   a revoked permission stayed effective until session expiry. The new
--   `iam_authz_epoch` counter is advanced by statement triggers on every write
--   to the RBAC grant tables; the session resolver compares the session's
--   `authz_epoch` with the current counter and re-resolves the snapshot from the
--   authoritative bindings when it is stale (AUTHORIZATION_STATE_SPEC.md
--   section 3). Existing sessions are NULL and refresh on their next request.
-- reversible: true
-- rollback: down-migration (drops only derived authorization-state bookkeeping —
--   the epoch counter, its triggers, and the session snapshot version column —
--   no business grant, role, or binding row is touched)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE TABLE IF NOT EXISTS iam_authz_epoch (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  epoch BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO iam_authz_epoch (id, epoch) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION iam_bump_authz_epoch() RETURNS trigger AS $$
BEGIN
  UPDATE iam_authz_epoch
     SET epoch = epoch + 1,
         updated_at = CURRENT_TIMESTAMP
   WHERE id = 1;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE iam_session
  ADD COLUMN IF NOT EXISTS authz_epoch BIGINT;

DROP TRIGGER IF EXISTS trg_iam_role_authz_epoch ON iam_role;
CREATE TRIGGER trg_iam_role_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_role
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

DROP TRIGGER IF EXISTS trg_iam_role_permission_authz_epoch ON iam_role_permission;
CREATE TRIGGER trg_iam_role_permission_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_role_permission
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

DROP TRIGGER IF EXISTS trg_iam_permission_authz_epoch ON iam_permission;
CREATE TRIGGER trg_iam_permission_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_permission
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

DROP TRIGGER IF EXISTS trg_iam_role_binding_authz_epoch ON iam_role_binding;
CREATE TRIGGER trg_iam_role_binding_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_role_binding
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

DROP TRIGGER IF EXISTS trg_iam_role_exclusion_authz_epoch ON iam_role_exclusion;
CREATE TRIGGER trg_iam_role_exclusion_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_role_exclusion
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

DROP TRIGGER IF EXISTS trg_iam_catalog_materialization_authz_epoch ON iam_catalog_materialization;
CREATE TRIGGER trg_iam_catalog_materialization_authz_epoch
  AFTER INSERT OR UPDATE OR DELETE ON iam_catalog_materialization
  FOR EACH STATEMENT EXECUTE FUNCTION iam_bump_authz_epoch();

COMMIT;
