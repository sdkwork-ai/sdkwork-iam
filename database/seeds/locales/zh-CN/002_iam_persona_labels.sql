-- Simplified Chinese labels for the persona catalog (zh-CN seed locale).
--
-- One locale per file (I18N_SPEC.md section 11). Each statement merges this
-- locale's key into the platform-owned catalog row, so re-running replaces the
-- same key and never touches another locale. Catalog codes come from
-- seeds/common/005_iam_persona_catalog_seed.sql.

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '学员'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '备考升学、系统学习课程内容'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'learner';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '员工'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '在职提升、团队协作与日常办公'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'employee';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '老师'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '教研授课、管理课程与学员'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'teacher';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '合作伙伴'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '渠道合作、机构共建与联合交付'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'partner';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '管理者'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '团队管理、数据看板与运营决策'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'manager';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '开发者'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '研发实现、调试与自动化交付'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'developer';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '内容创作者'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '选题策划、内容生产与账号运营'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'creator';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '访客'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('zh-CN', '先体验一下，方向之后再定'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'visitor';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '考研'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'postgraduate';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '保研'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'recommendation';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '就业求职'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'employment';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '公考编制'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'civil-service';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '留学申请'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'study-abroad';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '职业证书'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'certification';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '语言学习'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'language';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '中小学'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'k12';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', 'AI 技能'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'ai-skills';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '编程开发'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'development';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '内容创作'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'content';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('zh-CN', '企业管理'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'management';
