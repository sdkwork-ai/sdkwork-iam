# migrations

Database migration evidence records. Naming follows `DOCUMENTATION_SPEC.md` §2.4:
`MIG-YYYY-NNNN-<slug>.md`. Each record states the plan, the read-only preflight, the rehearsal
or execution evidence, and the rollback position; migration SQL itself stays authoritative in
`database/migrations/`.

| Record | Scope | Status |
| --- | --- | --- |
| [MIG-2026-0033](MIG-2026-0033-official-account-unification.md) | Retire `iam_user_official_account` into `iam_oauth_resource_account` (0033–0036) | completed on development; per-environment deployments pending |
