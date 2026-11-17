-- sdkwork:migration
-- id: 0039_application_installation_environment_and_credential
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Reverse the phase-4 additive schema.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

BEGIN;

DROP TABLE IF EXISTS iam_application_installation_credential;
DROP TABLE IF EXISTS iam_application_installation_environment;

COMMIT;
