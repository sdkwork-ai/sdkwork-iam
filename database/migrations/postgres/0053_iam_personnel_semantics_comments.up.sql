-- sdkwork:migration
-- id: 0053_iam_personnel_semantics_comments
-- engine: postgres
-- module: sdkwork-iam
-- purpose: Close the ambiguity left by three semi-reserved columns. Reviewers
--   read `iam_role_binding.condition_json` as ABAC and expected it to be
--   evaluated (it is not), read `iam_position.headcount` without knowing what
--   zero means, and could not tell that the reporting line is same-organization
--   and cycle-guarded. Attach the semantics to the schema so the next reader
--   does not have to infer them from code. Comments carry no data change.
-- reversible: true
-- rollback: down-migration (the paired down migration clears the comments)
-- transactional: true
-- lock: table
-- lock_timeout: 5s
-- statement_timeout: 60s

BEGIN;

COMMENT ON COLUMN iam_role_binding.condition_json IS
    'Reserved. The authorization resolver does not evaluate this field; conditions are expressed through scope_kind/scope_id, data_scope_kind and the effective window.';

COMMENT ON COLUMN iam_position.headcount IS
    'Approved opening (migration 0052). NULL or 0 means the position is not headcount-limited; positionAssignments.create rejects a new active holder at or above the limit.';

COMMENT ON COLUMN iam_organization_membership.reports_to_membership_id IS
    'Person-to-person reporting line (migration 0052). Must reference an active membership in the same tenant and organization; edits that would close a cycle are rejected.';

COMMIT;
