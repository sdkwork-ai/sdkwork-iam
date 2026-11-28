-- Down migration for 0055_iam_installation_credential_policy.
--
-- Drops the four columns added by the up migration. Every value the previous
-- schema carried is untouched; only the new policy axis is removed.

BEGIN;

DROP INDEX IF EXISTS ix_iam_application_installation_credential_review;
DROP INDEX IF EXISTS ix_iam_application_installation_credential_resolvable;

ALTER TABLE iam_application_installation_credential
    DROP CONSTRAINT IF EXISTS ck_iam_application_installation_credential_origins;

ALTER TABLE iam_application_installation_credential
    DROP CONSTRAINT IF EXISTS ck_iam_application_installation_credential_client_status;

ALTER TABLE iam_application_installation_credential
    DROP COLUMN IF EXISTS reviewed_at,
    DROP COLUMN IF EXISTS review_note,
    DROP COLUMN IF EXISTS client_status,
    DROP COLUMN IF EXISTS allowed_origins_json;

COMMIT;
