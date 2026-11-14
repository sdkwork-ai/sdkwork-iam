-- Simplified Chinese labels for the authorization role catalog (zh-CN seed locale).
--
-- One locale per file (I18N_SPEC.md section 11). Every statement merges this
-- locale's key into the catalog row and never touches another locale, so
-- re-running replaces the same key and activating a further locale needs no
-- schema change.
--
-- Target selection is `standard = 1` rather than a tenant literal: the standard
-- catalog is materialized per tenant from the same IAM module manifests, so
-- every tenant that already owns those rows receives the same localized label
-- without this file pinning a bootstrap tenant id. Tenant-created
-- (`role_class = 'tenant_custom'`) roles keep their operator-entered `name` and
-- an empty map, which is why they are excluded.
--
-- `name` is left untouched: it stays the canonical fallback label and the last
-- resort for a locale this file does not cover. Role codes come from
-- seeds/common/004_iam_role_catalog_seed.sql.

UPDATE iam_role AS r
SET label_i18n = (r.label_i18n::jsonb || v.label)::text,
    description_i18n = (r.description_i18n::jsonb || v.description)::text,
    updated_at = CURRENT_TIMESTAMP::text
FROM (VALUES
  ('app_user', jsonb_build_object('zh-CN', '应用用户'), jsonb_build_object('zh-CN', '以基础权限使用组织应用')),
  ('org_admin', jsonb_build_object('zh-CN', '组织管理员'), jsonb_build_object('zh-CN', '管理组织成员、角色与授权')),
  ('org_assistant', jsonb_build_object('zh-CN', '组织助理'), jsonb_build_object('zh-CN', '协助组织日常事务与成员服务')),
  ('org_auditor', jsonb_build_object('zh-CN', '组织审计员'), jsonb_build_object('zh-CN', '查阅与核对组织操作及安全记录')),
  ('org_finance', jsonb_build_object('zh-CN', '组织财务'), jsonb_build_object('zh-CN', '管理组织账单、发票与结算')),
  ('org_operations', jsonb_build_object('zh-CN', '组织运营'), jsonb_build_object('zh-CN', '负责组织内容、活动与运营数据')),
  ('platform_system_admin', jsonb_build_object('zh-CN', '平台系统管理员'), jsonb_build_object('zh-CN', '维护平台配置、模块与运行状态')),
  ('platform_super_admin', jsonb_build_object('zh-CN', '平台超级管理员'), jsonb_build_object('zh-CN', '拥有平台全部权限的最高管理者')),
  ('course_learner', jsonb_build_object('zh-CN', '课程学员'), jsonb_build_object('zh-CN', '学习课程内容并完成练习')),
  ('course_instructor', jsonb_build_object('zh-CN', '课程讲师'), jsonb_build_object('zh-CN', '授课、备课与答疑')),
  ('course_assistant', jsonb_build_object('zh-CN', '课程助教'), jsonb_build_object('zh-CN', '协助讲师管理课程与学员')),
  ('course_reviewer', jsonb_build_object('zh-CN', '课程审核员'), jsonb_build_object('zh-CN', '审核课程目录与上架内容')),
  ('apps_employee', jsonb_build_object('zh-CN', '应用员工'), jsonb_build_object('zh-CN', '使用企业应用完成日常工作')),
  ('apps_partner', jsonb_build_object('zh-CN', '应用合作伙伴'), jsonb_build_object('zh-CN', '以渠道身份使用与共建应用')),
  ('apps_guest', jsonb_build_object('zh-CN', '应用访客'), jsonb_build_object('zh-CN', '受限访问应用的临时用户')),
  ('ops_support_agent', jsonb_build_object('zh-CN', '运营客服'), jsonb_build_object('zh-CN', '受理并跟进用户支持请求')),
  ('ops_content_moderator', jsonb_build_object('zh-CN', '运营内容审核'), jsonb_build_object('zh-CN', '审核社区与内容合规')),
  ('skills_admin_operator', jsonb_build_object('zh-CN', '技能管理运营'), jsonb_build_object('zh-CN', '维护技能目录与上架策略')),
  ('skills_marketplace_user', jsonb_build_object('zh-CN', '技能市场用户'), jsonb_build_object('zh-CN', '浏览、安装与使用技能')),
  ('mcp_admin_operator', jsonb_build_object('zh-CN', 'MCP 管理运营'), jsonb_build_object('zh-CN', '维护 MCP 服务与接入配置')),
  ('mcp_workspace_user', jsonb_build_object('zh-CN', 'MCP 工作区用户'), jsonb_build_object('zh-CN', '在工作区中使用 MCP 服务')),
  ('appstore_admin_operator', jsonb_build_object('zh-CN', '应用商店管理运营'), jsonb_build_object('zh-CN', '审核应用并维护商店运营')),
  ('appstore_publisher', jsonb_build_object('zh-CN', '应用商店发布者'), jsonb_build_object('zh-CN', '发布与维护上架应用'))
) AS v(code, label, description)
WHERE r.standard = 1
  AND r.code = v.code;
