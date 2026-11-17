-- sdkwork:migration
-- id: 0044_application_installation_ownership_scope
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Give an installation its release scope, and give a session the scope it
--   was issued for.
--
--   One source tree produces different deployments and therefore different
--   access tokens; the only difference is the level the application was
--   published at (`APPLICATION_IDENTITY_SPEC.md` section 4.1):
--
--   - `ownership_scope` = TENANT (default) | ORGANIZATION | USER. The default is
--     the column default, so an installation created by an older code path is
--     TENANT and never something narrower.
--   - `owner_user_id` is the owner pointer of a USER-scoped installation. The
--     other two levels have no owner.
--
--   Existing rows are derived from `organization_id`, which already encoded the
--   tenant-vs-organization distinction: `0` means tenant-level, a positive
--   numeric id means an organization release. A non-numeric or blank
--   `organization_id` cannot be derived and the migration STOPS and reports the
--   rows instead of guessing a level.
--
--   `iam_session.scope_kind` records the installation scope a session was
--   issued for, so the resolver projects the scope it authorized against
--   instead of re-deriving it from `login_scope` (a USER release keeps
--   `login_scope = TENANT`, because it is a personal session, not an
--   organization one).
--
--   Database CHECK constraints make the scope/pointer agreement an invariant
--   rather than a convention, mirroring `deploy_app`'s owner pointer rules so
--   the deployment inventory and the identity plane classify a release alike.
-- reversible: false
-- rollback: forward-fix (the down direction would drop `owner_user_id`, losing
--   the only record of which person a USER-scoped installation belongs to)
-- transactional: true
-- lock: ACCESS EXCLUSIVE on iam_application_installation and iam_session for the
--   added columns and validated constraints
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

-- 1. Release scope and owner pointer.
ALTER TABLE iam_application_installation
    ADD COLUMN IF NOT EXISTS ownership_scope TEXT NOT NULL DEFAULT 'TENANT',
    ADD COLUMN IF NOT EXISTS owner_user_id TEXT;

-- 2. Refuse to guess: an organization id that is not a positive decimal cannot
--    be classified, so every such row is reported in one failure message.
DO $$
DECLARE
    undecidable TEXT;
BEGIN
    SELECT STRING_AGG(
               FORMAT('id=%s tenant_id=%s organization_id=%L', id, tenant_id, organization_id),
               '; ' ORDER BY id)
      INTO undecidable
      FROM iam_application_installation
     WHERE ownership_scope = 'TENANT'
       AND owner_user_id IS NULL
       AND organization_id IS NOT NULL
       AND TRIM(organization_id) <> ''
       AND TRIM(organization_id) <> '0'
       AND TRIM(organization_id) !~ '^[0-9]+$';

    IF undecidable IS NOT NULL THEN
        RAISE EXCEPTION
            '0044 cannot derive ownership_scope: % installation row(s) carry a non-numeric organization_id; '
            'resolve them explicitly before applying this migration', undecidable
            USING ERRCODE = 'check_violation';
    END IF;
END $$;

-- 3. Derive the stored level from the existing scope. Rows that already carry an
--    owner pointer are left alone, so re-running the migration in a development
--    database never rewrites a USER release to TENANT.
UPDATE iam_application_installation
   SET ownership_scope = CASE
           WHEN TRIM(organization_id) = '0' THEN 'TENANT'
           ELSE 'ORGANIZATION'
       END
 WHERE owner_user_id IS NULL
   AND ownership_scope <> CASE
           WHEN TRIM(organization_id) = '0' THEN 'TENANT'
           ELSE 'ORGANIZATION'
       END;

-- 4. Domain of the vocabulary, then the pointer agreement, in that order so a
--    typo reports "not a scope" rather than an alignment mismatch.
ALTER TABLE iam_application_installation
    DROP CONSTRAINT IF EXISTS chk_iam_application_installation_ownership_scope;
ALTER TABLE iam_application_installation
    ADD CONSTRAINT chk_iam_application_installation_ownership_scope
    CHECK (ownership_scope IN ('TENANT', 'ORGANIZATION', 'USER'));

ALTER TABLE iam_application_installation
    DROP CONSTRAINT IF EXISTS chk_iam_application_installation_ownership_alignment;
ALTER TABLE iam_application_installation
    ADD CONSTRAINT chk_iam_application_installation_ownership_alignment
    CHECK (
        (ownership_scope = 'TENANT'
            AND organization_id = '0'
            AND owner_user_id IS NULL)
        OR (ownership_scope = 'ORGANIZATION'
            AND organization_id <> '0'
            AND TRIM(organization_id) ~ '^[0-9]+$'
            AND owner_user_id IS NULL)
        OR (ownership_scope = 'USER'
            AND organization_id = '0'
            AND owner_user_id IS NOT NULL
            AND TRIM(owner_user_id) <> '')
    );

-- Personal reach is resolved per owner inside one tenant; the tenant release does
-- not need this index and partial keeps it small.
CREATE INDEX IF NOT EXISTS idx_iam_application_installation_owner
    ON iam_application_installation (tenant_id, owner_user_id)
    WHERE owner_user_id IS NOT NULL;

-- The scope itself is a filter on the tenant's ledger.
CREATE INDEX IF NOT EXISTS idx_iam_application_installation_ownership
    ON iam_application_installation (tenant_id, ownership_scope, organization_id, status, updated_at, id);

-- 5. Session snapshot of the installation scope it was issued for.
ALTER TABLE iam_session
    ADD COLUMN IF NOT EXISTS scope_kind TEXT NOT NULL DEFAULT 'TENANT';

-- Report a session whose login context already contradicts its organization
-- scope, instead of silently reclassifying it below: `login_scope = TENANT`
-- requires the sentinel and `ORGANIZATION` requires a non-zero organization id.
DO $$
DECLARE
    contradictory TEXT;
BEGIN
    SELECT STRING_AGG(
               FORMAT('id=%s tenant_id=%s organization_id=%L login_scope=%s',
                      id, tenant_id, organization_id, login_scope),
               '; ' ORDER BY id)
      INTO contradictory
      FROM iam_session
     WHERE (login_scope = 'ORGANIZATION' AND organization_id = '0')
        OR (login_scope <> 'ORGANIZATION' AND organization_id <> '0');

    IF contradictory IS NOT NULL THEN
        RAISE EXCEPTION
            '0044 cannot classify % iam_session row(s): login_scope and organization_id contradict each other',
            contradictory
            USING ERRCODE = 'check_violation';
    END IF;
END $$;

UPDATE iam_session
   SET scope_kind = 'ORGANIZATION'
 WHERE scope_kind = 'TENANT'
   AND organization_id <> '0';

-- A session row that pairs an organization release with the tenant sentinel (or a
-- personal release with an organization id) is contradictory: report it rather
-- than letting the constraint fail with a bare violation later.
DO $$
DECLARE
    contradictory TEXT;
BEGIN
    SELECT STRING_AGG(
               FORMAT('id=%s tenant_id=%s organization_id=%L scope_kind=%s',
                      id, tenant_id, organization_id, scope_kind),
               '; ' ORDER BY id)
      INTO contradictory
      FROM iam_session
     WHERE (scope_kind = 'ORGANIZATION' AND organization_id = '0')
        OR (scope_kind = 'USER' AND organization_id <> '0');

    IF contradictory IS NOT NULL THEN
        RAISE EXCEPTION
            '0044 cannot classify % iam_session row(s): scope_kind and organization_id contradict each other',
            contradictory
            USING ERRCODE = 'check_violation';
    END IF;
END $$;

ALTER TABLE iam_session
    DROP CONSTRAINT IF EXISTS chk_iam_session_scope_kind;
ALTER TABLE iam_session
    ADD CONSTRAINT chk_iam_session_scope_kind
    CHECK (scope_kind IN ('TENANT', 'ORGANIZATION', 'USER'));

-- The release level and the session's organization are orthogonal for a
-- tenant-released application (an organization login keeps its organization) but
-- not for the other two: an organization release must carry a non-zero
-- organization, and a personal release is tenant-level by definition.
ALTER TABLE iam_session
    DROP CONSTRAINT IF EXISTS chk_iam_session_scope_kind_alignment;
ALTER TABLE iam_session
    ADD CONSTRAINT chk_iam_session_scope_kind_alignment
    CHECK (
        scope_kind = 'TENANT'
        OR (scope_kind = 'ORGANIZATION' AND organization_id <> '0')
        OR (scope_kind = 'USER' AND organization_id = '0')
    );

COMMIT;
