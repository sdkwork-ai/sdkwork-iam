-- English labels for the persona catalog (en-US seed locale).
--
-- One locale per file (I18N_SPEC.md section 11). Each statement merges this
-- locale's key into the platform-owned catalog row, so re-running replaces the
-- same key and never touches another locale. Catalog codes come from
-- seeds/common/005_iam_persona_catalog_seed.sql.

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Learner'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Exam preparation and structured course study'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'learner';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Employee'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'On-the-job growth, teamwork, and daily office work'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'employee';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Teacher'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Teaching, course authoring, and class operations'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'teacher';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Partner'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Channel cooperation, joint programs, and shared delivery'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'partner';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Manager'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Team management, dashboards, and operational decisions'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'manager';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Developer'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Implementation, debugging, and automated delivery'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'developer';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Creator'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Topic planning, content production, and channel growth'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'creator';

UPDATE iam_persona_role
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Visitor'))::text,
    description_i18n = (description_i18n::jsonb || jsonb_build_object('en-US', 'Just looking around; decide the direction later'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'visitor';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Postgraduate exam'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'postgraduate';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Graduate recommendation'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'recommendation';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Job hunting'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'employment';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Civil service exam'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'civil-service';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Study abroad'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'study-abroad';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Professional certificates'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'certification';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Language learning'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'language';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'K-12'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'k12';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'AI skills'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'ai-skills';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Software development'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'development';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Content creation'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'content';

UPDATE iam_persona_interest
SET label_i18n = (label_i18n::jsonb || jsonb_build_object('en-US', 'Business management'))::text,
    updated_at = CURRENT_TIMESTAMP
WHERE owner_tenant_id = '0' AND code = 'management';
