-- zh-CN display labels for IMF-materialized IAM directory, platform, and domain standard roles.
-- Idempotent updates. Re-applied after catalog materialization in IamDatabaseModule::after_seed.

UPDATE iam_tenant
SET name = 'SDKWork 默认租户', updated_at = CURRENT_TIMESTAMP
WHERE id = '100001';

UPDATE iam_organization
SET name = '根组织', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'root';

UPDATE iam_department
SET name = '综合部', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'general';

UPDATE iam_department
SET name = '商务部', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'commerce';

UPDATE iam_department
SET name = '财务部', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'finance';

UPDATE iam_role SET name = '应用用户', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'app_user';

UPDATE iam_role SET name = '组织管理员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'org_admin';

UPDATE iam_role SET name = '组织助理', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'org_assistant';

UPDATE iam_role SET name = '组织审计员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'org_auditor';

UPDATE iam_role SET name = '组织财务', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'org_finance';

UPDATE iam_role SET name = '组织运营', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'org_operations';

UPDATE iam_role SET name = '平台系统管理员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'platform_system_admin';

UPDATE iam_role SET name = '平台超级管理员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'platform_super_admin';

-- Domain standard roles declared by iam/modules/<module>/iam.module.manifest.json.
UPDATE iam_role SET name = '学员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'course_learner';

UPDATE iam_role SET name = '课程讲师', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'course_instructor';

UPDATE iam_role SET name = '助教', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'course_assistant';

UPDATE iam_role SET name = '课程审核员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'course_reviewer';

UPDATE iam_role SET name = '员工', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'apps_employee';

UPDATE iam_role SET name = '合作伙伴', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'apps_partner';

UPDATE iam_role SET name = '访客', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'apps_guest';

UPDATE iam_role SET name = '客服专员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'ops_support_agent';

UPDATE iam_role SET name = '内容审核员', updated_at = CURRENT_TIMESTAMP
WHERE tenant_id = '100001' AND code = 'ops_content_moderator';
