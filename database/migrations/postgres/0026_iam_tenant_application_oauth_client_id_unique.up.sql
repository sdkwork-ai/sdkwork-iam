-- sdkwork:migration
-- id: 0026_iam_tenant_application_oauth_client_id_unique
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Enforce one OAuth relying-party client id per tenant application
--   namespace. Desktop browser login redeems the authorization code without a
--   tenant hint, so `resolve_relying_party_client` MUST find exactly one row
--   for a presented clientId. The application layer already checks for
--   conflicts before writing, but two concurrent updates can both pass that
--   check; this unique expression index makes the database the authority and
--   fails closed on duplicates instead of leaving an ambiguous client id.
--   A row without an explicit clientId uses its globally unique app_id, so the
--   index covers both forms.
-- reversible: false
-- rollback: forward-fix (dropping the unique index would re-open ambiguous
--   client-id resolution; a bounded reversal cannot prove which duplicate row
--   was legitimate, so this is irreversible)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS uk_iam_tenant_application_oauth_client_id
  ON iam_tenant_application (
    (COALESCE(runtime_config_json #>> '{oauth,relyingParty,clientId}', app_id))
  );

COMMIT;
