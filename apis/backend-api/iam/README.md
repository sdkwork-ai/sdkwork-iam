# IAM Backend API Contracts

Authoritative OpenAPI 3.1.2 contracts for the `sdkwork-iam` backend-api surface.

## Authority

| File | Purpose |
| --- | --- |
| `sdkwork-iam-backend-api.openapi.yaml` | Materialized OpenAPI authority from `sdkwork-routes-iam-backend-api` route manifests |

## Materialization

Regenerate from route crates:

```bash
node tools/generators/materialize-iam-v3-openapi-boundaries.mjs
```

Thin compatibility wrapper:

```bash
node sdks/materialize-iam-v3-openapi-boundaries.mjs
```

Generated SDK transport output remains under `sdks/sdkwork-iam-backend-sdk/`.

## Installation Environments And Credentials

An installation owns one row per lifecycle environment
(`iam_application_installation_environment`) and one OAuth client per environment
(`iam_application_installation_credential`). The materialized authority exposes:

| Operation ID | Method / path | Success shape |
| --- | --- | --- |
| `tenantApplications.environments.list` | `GET /backend/v3/api/iam/tenants/{tenantId}/applications/{tenantApplicationId}/environments` | `IamInstallationEnvironmentListResponse` |
| `tenantApplications.environments.update` | `PUT .../environments/{environmentKey}` | `IamInstallationEnvironmentResponse` |
| `tenantApplications.environments.delete` | `DELETE .../environments/{environmentKey}` | `204` |
| `tenantApplications.credentials.list` | `GET .../credentials` | `IamInstallationCredentialListResponse` |
| `tenantApplications.credentials.create` | `POST .../credentials` | `201 IamInstallationCredentialResponse` |
| `tenantApplications.credentials.rotate` | `POST .../credentials/{credentialId}/rotate` | `IamInstallationCredentialResponse` |
| `tenantApplications.credentials.revoke` | `POST .../credentials/{credentialId}/revoke` | `SdkWorkCommandResponse` |

Every operation declares `x-sdkwork-permission: iam.tenant_applications.update`
(the existing installation-update boundary; no new code is seeded) and
`x-sdkwork-required-surface: organizationMember`.

`PUT .../environments/{environmentKey}` is an idempotent upsert keyed by the path
environment key. A body `environmentKey`, when present, must match the path. An
omitted body `status` keeps the stored status on update and defaults to `pending`
on insert.

`clientSecret` is `writeOnly` and is emitted only by the create and rotate
operations; reads return credential metadata only. `409 conflict` responses use
`code: iam_installation_lifecycle_conflict` and name the duplicate environment
key, tenant-wide primary domain, or client id. `404` responses use
`code: iam_installation_lifecycle_not_found` for both a missing row and a row
outside the caller's tenant scope.

Runtime enforcement (token issuance and session creation) is documented in the
repository `README.md`; OpenAPI describes the management surface only.

## Role Catalog Display Text

`iam.roles.list` and `iam.roles.retrieve` carry catalog display text as machine
vocabulary, not as server-rendered prose:

| Field | Meaning |
| --- | --- |
| `code` | Stable machine identity. Never localized. |
| `name` | The stored label. It is the caller's last-resort fallback and the operator-entered copy of a tenant-authored role. |
| `labels` | Locale map keyed by BCP 47 tag (`{"zh-CN": "组织管理员", "en-US": "Organization Admin"}`). Empty object when untranslated. |
| `descriptions` | Same shape for the role description. |
| `standard` | `true` for the seeded standard catalog, `false` for a tenant-authored role. |
| `roleClass` | `platform_standard`, `domain_standard`, or `tenant_custom`. |

Display resolution belongs to the client: `labels[locale]`, then the language-only
tag, then `en-US`, then `zh-CN`, then `name`. Because the representation does not
vary by request language, these operations send no `Content-Language` and need no
`Vary: Accept-Language` (I18N_SPEC.md section 4). Locale negotiation is still the
standard `Accept-Language` header for operations whose payload is locale-sensitive.

`q` matches `code`, `name`, and every persisted `labels` entry, so an operator can
find a catalog role by typing its name in their own language.

Seed ownership: `database/seeds/common/004_iam_role_catalog_seed.sql` owns the
language-neutral columns plus the `name` fallback; `database/seeds/locales/<locale>/*_iam_role_labels.sql`
own the locale maps, one file per locale (I18N_SPEC.md section 11).

## Related Specs

- `../../../sdkwork-specs/API_SPEC.md`
- `../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md`
- `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
