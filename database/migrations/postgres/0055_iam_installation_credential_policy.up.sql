-- sdkwork:migration
-- id: 0055_iam_installation_credential_policy
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Promote the installation credential from a write-only registration
--   to a real OAuth client policy: trusted browser origins, the publication /
--   review state of the client, and a reviewer note. The credential row already
--   carried client_id, the Argon2id secret hash, redirect URIs and granted
--   scopes, but nothing read it at authorization time and there was no place to
--   say "this client is still under review" or "only these origins may call it".
--   The authorization server now falls back to this table when no
--   runtime_config relying party names the client, and enforces the origin
--   allow-list when one is present.
--   See docs/architecture/tech/TECH-application-enterprise-authorization.md
--   section 9 and the application-identity notes in IAM_OAUTH_SPEC.md.
-- reversible: true
-- rollback: down-migration (drops the four added columns; existing credential
--   rows keep every value the previous schema carried)
-- transactional: true
-- lock: access-exclusive on iam_application_installation_credential; the table
--   holds one row per environment credential, so the rewrite is small
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_application_installation_credential
    -- Trusted browser origins. Empty array means "no per-client origin
    -- restriction", which is the behaviour every pre-existing row must keep.
    ADD COLUMN IF NOT EXISTS allowed_origins_json JSONB NOT NULL DEFAULT '[]',
    -- Publication state of the client itself, orthogonal to
    -- `credential_status` (active/rotated/retired = secret lifecycle):
    --   pending_review -> registered, waiting for a reviewer
    --   enabled        -> the authorization server may resolve it
    --   rejected       -> review refused; the row is kept for the author
    --   disabled       -> previously enabled, now switched off
    ADD COLUMN IF NOT EXISTS client_status TEXT NOT NULL DEFAULT 'enabled',
    -- Reviewer note shown back to the application author, most useful on a
    -- rejection; free text, never used for authorization decisions.
    ADD COLUMN IF NOT EXISTS review_note TEXT,
    -- When the review decision was recorded.
    ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

ALTER TABLE iam_application_installation_credential
    ADD CONSTRAINT ck_iam_application_installation_credential_client_status
    CHECK (client_status IN ('pending_review', 'enabled', 'rejected', 'disabled'));

ALTER TABLE iam_application_installation_credential
    ADD CONSTRAINT ck_iam_application_installation_credential_origins
    CHECK (jsonb_typeof(allowed_origins_json) = 'array');

-- The authorization server resolves a client by its globally unique client id;
-- the partial index keeps the dual-read fallback from scanning retired rows.
CREATE INDEX IF NOT EXISTS ix_iam_application_installation_credential_resolvable
    ON iam_application_installation_credential (client_id, credential_status, client_status);

-- The review queue, per tenant environment.
CREATE INDEX IF NOT EXISTS ix_iam_application_installation_credential_review
    ON iam_application_installation_credential
        (tenant_id, installation_environment_id, client_status, updated_at DESC, id);

COMMENT ON COLUMN iam_application_installation_credential.allowed_origins_json IS
    'Trusted browser origins (scheme://host[:port]). Empty array = no per-client origin restriction. Enforced at /iam/v3/oauth/authorize when non-empty.';
COMMENT ON COLUMN iam_application_installation_credential.client_status IS
    'Client publication state: pending_review | enabled | rejected | disabled. Orthogonal to credential_status, which tracks the secret lifecycle.';
COMMENT ON COLUMN iam_application_installation_credential.review_note IS
    'Reviewer note returned to the application author; free text, not used for authorization decisions.';

COMMIT;
