-- sdkwork:migration
-- id: 0047_rename_installation_permissions
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Rename the installation permission family from the historical
--   `tenant_applications` spelling to canonical `installations`.
-- reversible: true
-- rollback: down-migration (renames codes back and re-points grants; a bounded,
--   data-preserving reversal)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

-- If a canonical row already exists (a partially migrated environment), the
-- legacy grants are moved onto the canonical row first and the duplicate legacy
-- row is removed, so the unique `iam_permission.code` constraint holds.

-- 1. Re-point grants from a legacy row to its canonical twin, when both exist.
UPDATE iam_role_permission AS rp
SET permission_id = canonical.id
FROM iam_permission AS legacy
JOIN iam_permission AS canonical
  ON canonical.code = replace(legacy.code, 'iam.tenant_applications.', 'iam.installations.')
WHERE legacy.code LIKE 'iam.tenant_applications.%'
  AND rp.permission_id = legacy.id;

-- 2. Drop the now-ungranted legacy duplicates.
DELETE FROM iam_permission AS legacy
WHERE legacy.code LIKE 'iam.tenant_applications.%'
  AND EXISTS (
    SELECT 1
    FROM iam_permission AS canonical
    WHERE canonical.code = replace(legacy.code, 'iam.tenant_applications.', 'iam.installations.')
  );

-- 3. Rename the remaining legacy rows in place.
UPDATE iam_permission
SET code = replace(code, 'iam.tenant_applications.', 'iam.installations.'),
    resource = replace(resource, 'iam.tenant_applications', 'iam.installations'),
    name = replace(replace(name, 'tenant applications', 'installations'), 'Tenant applications', 'Installations')
WHERE code LIKE 'iam.tenant_applications.%';
