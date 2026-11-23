-- sdkwork:migration
-- id: 0050_iam_department_version
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Personnel management lets two operators drag the same department
--   subtree at the same time. Without an optimistic-lock column the second save
--   silently overwrites the first one's sibling order and closure rebuild. Add
--   a monotonic `version` to the department tree rows and to the member
--   department assignments rewritten by the bulk replace endpoint, so both
--   mutations can fail closed with 409 instead of losing an edit. INTEGER keeps
--   the revision on the existing PatchValue::Int wire used by the directory
--   patch helper.
-- reversible: false
-- rollback: forward-fix (dropping the column would erase the revision clients
--   use to retry; a down migration could not reconstruct it)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

ALTER TABLE iam_department
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE iam_department_assignment
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 0;

COMMIT;
