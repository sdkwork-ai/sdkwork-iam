-- sdkwork:migration
-- id: 0035_official_account_orphan_client_cleanup
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Remove the OAuth client and web-surface rows that
--   0033_official_account_unification created for a legacy official-account row
--   it then isolated instead of carrying over. 0033 creates one WeChat client
--   (and its web surface) per distinct (tenant, AppID) BEFORE it isolates a
--   provider-identity conflict, so a legacy row whose AppID is already owned by
--   another canonical resource account still leaves an enabled client plus an
--   enabled web surface behind that no account references.
--   Those artifact rows are not harmless: the backend enriches an integration
--   with the providerClientId of its first enabled client (and the admin
--   quick-setup matches an existing integration by that AppID), so the stray
--   client can make the integration report the wrong WeChat AppID, and the
--   enabled surface presents a WeChat login surface for a channel the operator
--   already manages under a different integration.
--   A client row is removed only when every one of these holds:
--     1. it is an official-account client created by the migration
--        (`client_code LIKE 'official-account-<appId>-client'`),
--     2. no `iam_oauth_resource_account` references it (the app-api and
--        backend-api always bind the account they create in the same
--        transaction, so an unbound official-account client can only be the
--        pre-isolation half of 0033),
--     3. another canonical official account already owns its provider identity
--        and is bound to a different client (exactly the conflict 0033 records
--        in its isolation ledger),
--     4. nothing else has used it: no grant and no flow config references it.
--   Its web surfaces are deleted first. The canonical resource account, its
--   client, its webhook, and its secrets are never touched, and the migration
--   is a no-op on a greenfield install (the legacy table is empty there).
-- reversible: false
-- rollback: forward-fix (the deleted rows are migration artifacts of 0033 that
--   no account references; recreating them would restore the defect)
-- transactional: true
-- lock: none beyond the deleted rows (no other table references
--   iam_oauth_client / iam_oauth_surface)
-- lock_timeout: 2s
-- statement_timeout: 30s
--
-- Preflight (read-only; must resolve the same set the DELETE resolves):
--   SELECT c.id, c.tenant_id, c.provider_client_id, c.client_code, c.enabled
--     FROM iam_oauth_client c
--    WHERE c.provider_code = 'wechat'
--      AND c.client_code LIKE 'official-account-%-client'
--      AND NOT EXISTS (SELECT 1 FROM iam_oauth_resource_account ra
--                       WHERE ra.oauth_client_id = c.id)
--      AND EXISTS (SELECT 1 FROM iam_oauth_resource_account occ
--                   WHERE occ.tenant_id = c.tenant_id
--                     AND occ.organization_id = c.organization_id
--                     AND occ.provider_code = 'wechat'
--                     AND occ.resource_account_kind = 'official_account'
--                     AND occ.provider_account_id = c.provider_client_id
--                     AND occ.oauth_client_id IS DISTINCT FROM c.id)
--      AND NOT EXISTS (SELECT 1 FROM iam_oauth_grant g WHERE g.oauth_client_id = c.id)
--      AND NOT EXISTS (SELECT 1 FROM iam_oauth_flow_config f WHERE f.oauth_client_id = c.id)
--    ORDER BY c.tenant_id, c.provider_client_id;

BEGIN;

-- 1. Web surfaces bound to a stray client. Deleted first so no surface is left
--    pointing at a client that no longer exists.
DELETE FROM iam_oauth_surface s
USING iam_oauth_client c
WHERE s.oauth_client_id = c.id
  AND s.tenant_id = c.tenant_id
  AND c.provider_code = 'wechat'
  AND c.client_code LIKE 'official-account-%-client'
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_resource_account ra
    WHERE ra.oauth_client_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM iam_oauth_resource_account occ
    WHERE occ.tenant_id = c.tenant_id
      AND occ.organization_id = c.organization_id
      AND occ.provider_code = 'wechat'
      AND occ.resource_account_kind = 'official_account'
      AND occ.provider_account_id = c.provider_client_id
      AND occ.oauth_client_id IS DISTINCT FROM c.id
  )
  AND NOT EXISTS (SELECT 1 FROM iam_oauth_grant g WHERE g.oauth_client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM iam_oauth_flow_config f WHERE f.oauth_client_id = c.id);

-- 2. The stray client rows themselves.
DELETE FROM iam_oauth_client c
WHERE c.provider_code = 'wechat'
  AND c.client_code LIKE 'official-account-%-client'
  AND NOT EXISTS (
    SELECT 1 FROM iam_oauth_resource_account ra
    WHERE ra.oauth_client_id = c.id
  )
  AND EXISTS (
    SELECT 1 FROM iam_oauth_resource_account occ
    WHERE occ.tenant_id = c.tenant_id
      AND occ.organization_id = c.organization_id
      AND occ.provider_code = 'wechat'
      AND occ.resource_account_kind = 'official_account'
      AND occ.provider_account_id = c.provider_client_id
      AND occ.oauth_client_id IS DISTINCT FROM c.id
  )
  AND NOT EXISTS (SELECT 1 FROM iam_oauth_grant g WHERE g.oauth_client_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM iam_oauth_flow_config f WHERE f.oauth_client_id = c.id);

-- 3. Report the cleanup without blocking the deployment.
DO $$
DECLARE
  stray_clients BIGINT;
  stray_surfaces BIGINT;
BEGIN
  SELECT COUNT(1) INTO stray_clients
    FROM iam_oauth_client c
   WHERE c.provider_code = 'wechat'
     AND c.client_code LIKE 'official-account-%-client'
     AND NOT EXISTS (SELECT 1 FROM iam_oauth_resource_account ra WHERE ra.oauth_client_id = c.id)
     AND EXISTS (
       SELECT 1 FROM iam_oauth_resource_account occ
       WHERE occ.tenant_id = c.tenant_id
         AND occ.organization_id = c.organization_id
         AND occ.provider_code = 'wechat'
         AND occ.resource_account_kind = 'official_account'
         AND occ.provider_account_id = c.provider_client_id
         AND occ.oauth_client_id IS DISTINCT FROM c.id
     );
  SELECT COUNT(1) INTO stray_surfaces
    FROM iam_oauth_surface s
   WHERE s.surface_code LIKE 'official-account-%-client-web'
     AND NOT EXISTS (SELECT 1 FROM iam_oauth_client c WHERE c.id = s.oauth_client_id);
  IF stray_clients > 0 OR stray_surfaces > 0 THEN
    RAISE WARNING 'official account orphan client cleanup (0035): % unbound official-account client(s) and % orphaned surface(s) remain after cleanup; inspect them against the 0033 preflight',
      stray_clients, stray_surfaces;
  ELSE
    RAISE NOTICE 'official account orphan client cleanup (0035): no 0033 artifact client or surface remained';
  END IF;
END
$$;

COMMIT;
