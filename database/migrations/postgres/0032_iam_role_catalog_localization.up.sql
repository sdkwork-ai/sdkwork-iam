-- sdkwork:migration
-- id: 0032_iam_role_catalog_localization
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Give the authorization role catalog the same locale-map contract the
--   persona catalog already uses, so the backend/console role surfaces can show
--   a role in the caller's language instead of the single English `name` the
--   common seed carried.
--     - `label_i18n` / `description_i18n` are locale maps
--       (`{"zh-CN": "组织管理员", "en-US": "Organization Admin"}`) keyed by a
--       normalized BCP 47 tag, stored as TEXT JSON so one seed file owns one
--       locale (I18N_SPEC.md section 11) while the runtime column stays single.
--     - `name` stays the row's authored label and the last-resort display
--       fallback: a tenant-created (`role_class = 'tenant_custom'`) role carries
--       operator-entered copy in one language, so there is no map to seed and
--       the map columns stay `{}`.
--     - Standard catalog roles (`standard = 1`) get their maps from
--       `seeds/locales/<locale>/`; adding or activating a locale needs no
--       further schema change.
--   No backfill: seeding a map from `name` would label a Chinese operator's own
--   role as `en-US` copy. Display resolution is map -> `name`, so `{}` is a
--   correct, self-describing state for every existing row.
-- reversible: false
-- rollback: forward-fix (dropping the columns discards every seeded translation,
--   and re-seeding cannot recover a locale an operator added by hand; the state
--   is additive and harmless to leave in place, so reversal is forward-only per
--   DATABASE_FRAMEWORK_SPEC.md section 7.1)
-- transactional: true
-- lock: lightweight
-- lock_timeout: 2s
-- statement_timeout: 30s

BEGIN;

ALTER TABLE iam_role
  ADD COLUMN IF NOT EXISTS label_i18n TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description_i18n TEXT NOT NULL DEFAULT '{}';

ALTER TABLE iam_role
  DROP CONSTRAINT IF EXISTS ck_iam_role_label_i18n;
ALTER TABLE iam_role
  DROP CONSTRAINT IF EXISTS ck_iam_role_description_i18n;

ALTER TABLE iam_role
  ADD CONSTRAINT ck_iam_role_label_i18n
    CHECK (jsonb_typeof(label_i18n::jsonb) = 'object'),
  ADD CONSTRAINT ck_iam_role_description_i18n
    CHECK (jsonb_typeof(description_i18n::jsonb) = 'object');

COMMIT;
