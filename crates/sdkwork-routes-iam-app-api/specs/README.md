# sdkwork-routes-iam-app-api Component Specs

This directory is the local standards index for `sdkwork-routes-iam-app-api`. Root SDKWork standards remain authoritative; local component specs can narrow this crate but must not duplicate or contradict root standards.

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-routes-iam-app-api` |
| Type | `rust-route-crate` |
| Root | `sdkwork-iam/crates/sdkwork-routes-iam-app-api` |
| Domain | `iam` |
| Capability | `iam` |
| Languages | `rust` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers integrate through public exports, runtime entrypoints, SDK clients, or adapters declared in the manifest.
- Generated SDK language outputs are represented at their SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

- [COMPONENT_SPEC.md](../../../../sdkwork-specs/COMPONENT_SPEC.md): Component-local contract and discovery rules.
- [CODE_STYLE_SPEC.md](../../../../sdkwork-specs/CODE_STYLE_SPEC.md): Authored source structure and generated code boundaries.
- [NAMING_SPEC.md](../../../../sdkwork-specs/NAMING_SPEC.md): Canonical SDKWork naming rules.
- [MODULE_SPEC.md](../../../../sdkwork-specs/MODULE_SPEC.md): Reusable module and package boundary rules.
- [TEST_SPEC.md](../../../../sdkwork-specs/TEST_SPEC.md): Verification and contract testing expectations.
- [RUST_CODE_SPEC.md](../../../../sdkwork-specs/RUST_CODE_SPEC.md): Rust crate and module rules.
- [API_SPEC.md](../../../../sdkwork-specs/API_SPEC.md): HTTP API authority, surface, route manifest, and SDK generation rules.
- [WEB_BACKEND_SPEC.md](../../../../sdkwork-specs/WEB_BACKEND_SPEC.md): HTTP backend router, handler, service, repository, and request context rules.
- [SDK_WORKSPACE_GENERATION_SPEC.md](../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md): SDK family workspace and generated artifact ownership rules.
- [SECURITY_SPEC.md](../../../../sdkwork-specs/SECURITY_SPEC.md): Protected request, tenant, token, and security boundary rules.

## Public Exports

- `sdkwork_routes_iam_app_api::app_routes`
- `sdkwork_routes_iam_app_api::sdkwork_iam_app_api_routes`
- `sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router`
- `sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router_with_local_directory`
- `sdkwork_routes_iam_app_api::build_local_app_api_router`

## SDK Clients

- No generated SDK client class is declared at this component boundary.

## Local Extension Specs

### Persona profile

- `GET /app/v3/api/iam/persona_catalog` returns the selectable role and interest taxonomy with every active locale and an opaque catalog version.
- `GET` / `PUT` / `DELETE /app/v3/api/iam/users/current/persona` read, replace, and clear the caller's persona. `PUT` is a full replace validated against the active catalog; unknown or disabled codes are rejected with `422` and code `iam_persona_invalid`.
- Storage is `iam_user_persona` (one row per tenant user) plus the platform-owned catalogs `iam_persona_role` and `iam_persona_interest` (`owner_tenant_id = '0'`). A persona role may map onto the authorization role catalog through `iam_role_code`, but selecting a persona never grants a permission.
- Seeds live in `database/seeds/common/005_iam_persona_catalog_seed.sql` plus one locale file per locale; the migration is `database/migrations/postgres/0021_iam_user_persona.up.sql`.

## Verification

- `cargo test -p sdkwork-routes-iam-app-api`
