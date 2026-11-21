-- sdkwork:migration
-- id: 0047_rename_installation_permissions
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Reverse 0047 and restore the historical permission spelling.
-- reversible: true
-- rollback: down-migration
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 60s

UPDATE iam_role_permission AS rp
SET permission_id = legacy.id
FROM iam_permission AS canonical
JOIN iam_permission AS legacy
  ON legacy.code = replace(canonical.code, 'iam.installations.', 'iam.tenant_applications.')
WHERE canonical.code LIKE 'iam.installations.%'
  AND rp.permission_id = canonical.id;

DELETE FROM iam_permission AS canonical
WHERE canonical.code LIKE 'iam.installations.%'
  AND EXISTS (
    SELECT 1
    FROM iam_permission AS legacy
    WHERE legacy.code = replace(canonical.code, 'iam.installations.', 'iam.tenant_applications.')
  );

UPDATE iam_permission
SET code = replace(code, 'iam.installations.', 'iam.tenant_applications.'),
    resource = replace(resource, 'iam.installations', 'iam.tenant_applications'),
    name = replace(replace(name, 'installations', 'tenant applications'), 'Installations', 'Tenant applications')
WHERE code LIKE 'iam.installations.%';
