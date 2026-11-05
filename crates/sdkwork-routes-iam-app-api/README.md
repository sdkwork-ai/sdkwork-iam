# sdkwork-routes-iam-app-api

Domain: iam
Capability: iam
Package type: rust-route-crate
Rust crate import: `sdkwork_routes_iam_app_api`
Status: standard

SDKWork canonical IAM HTTP route contracts for Rust local/private deployments.

## Public API

- `sdkwork_routes_iam_app_api::app_routes`
- `sdkwork_routes_iam_app_api::sdkwork_iam_app_api_routes`
- `sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router`
- `sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router_with_local_directory`
- `sdkwork_routes_iam_app_api::build_local_app_api_router`

## Runtime Entrypoints

- `sdkwork_routes_iam_app_api::build_sdkwork_iam_app_api_router`

## Required SDK Surface

- None declared in `specs/component.spec.json`.

## Configuration

Configuration keys, runtime entrypoints, and integration contracts are declared in `specs/component.spec.json`. Shared modules receive configuration through typed bootstrap or service boundaries rather than host-local globals.

## SaaS/Private/Local Behavior

This crate is a base dependency of `sdkwork-iam`. It is not an independent application root and does not own `agent.app.config.json`.

## Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this crate. Protected API and SDK access must use the declared request-context or SDK boundary.

Personal-login sessions use `organization_id = "0"`. `iam_organization` is keyed by `(tenant_id, id)`, and every tenant receives its own `"0"` sentinel; session creation provisions it when missing, so login is not limited to the bootstrap tenant.

Refresh-token reuse detection keeps a short grace window (`SDKWORK_IAM_REFRESH_REUSE_GRACE_SECONDS`, default 30, `0` disables): a client that timed out after the server committed a rotation can retry the old token and receive `401` without revoking every session the user owns. Reuse outside the window still revokes the user's active sessions and records a security event.

Authorization codes expire after 300 seconds; the redeem endpoints reject an expired code even when its authorization state row still exists. Consumption is a conditional `approved -> consumed` update, so two concurrent redemptions of the same code yield exactly one session. Completing the same authorization state concurrently also approves only one grant; the loser deletes its orphan grant. Token introspection reports the grant's `client_id` (not the caller's) and uses the refresh-token expiry for refresh-token introspection; revocation is scoped to the requesting client when one is supplied.

## Extension Points

Extension points are limited to public exports, runtime entrypoints, SDK clients, events, and config keys declared in `specs/component.spec.json`.

## List Pagination

All list handlers in this crate use database-level offset pagination via `sdkwork-utils-rust`:

- Query: `page`, `page_size` (default **20**, max **200**), optional `q`, `sort`, `cursor`
- SQL: `COUNT(*) OVER() AS __list_total` with `LIMIT` / `OFFSET`
- Response payload (inside `SdkWorkApiResponse.data`): `{ "items": [...], "pageInfo": { "mode": "offset", ... } }`

Tree endpoints (`organizations/tree`, `departments/tree`) return `SdkWorkResourceResponse` inside `SdkWorkApiResponse.data`:

- Shape: `{ "item": { "nodes": [...] } }` (hierarchical, scoped fetch + in-memory nesting; not flat-paginated)
- SDK unwrap exposes `{ nodes: [...] }`; use `extractSdkWorkTreeNodes` from `@sdkwork/iam-contracts` in TypeScript consumers

Bounded catalogs (`oauth/providers`, cardinality ≤ 100 per `PAGINATION_SPEC.md`) use `paginate_bounded_json_values` with standard `{ items, pageInfo }` after in-memory filter/slice.

Legacy `{ records, total }` envelopes, bare `{ nodes }` at the `data` root, and in-memory filtering after `fetch_all` are forbidden.

Authority: `sdkwork-specs/API_SPEC.md` sections 14–15, `sdkwork-specs/templates/openapi/components/schemas/sdkwork-list-query.yaml`.

## Verification

Component verification (structure checks, CI without PostgreSQL):

```bash
cargo test -j 1 -p sdkwork-routes-iam-app-api --test iam_http_standard -- --test-threads 1
```

PostgreSQL integration (requires `config/host/postgres.env` or `../sdkwork-cloudrouter/config/host/postgres.env`, always use `--test-threads 1`):

Integration tests reuse one capped SQLx pool via `tests/unified_database_env.rs` (`integration_database_pool_for_router`) so router rebuilds do not exhaust PostgreSQL connections.

```bash
cargo test -j 1 -p sdkwork-routes-iam-app-api --test oauth_authorization_server_integration -- --test-threads 1
cargo test -j 1 -p sdkwork-routes-iam-app-api --test iam_local_app_router_test -- --test-threads 1
```

Included in `pnpm run test:iam-standard-contracts` (HTTP standard always; OAuth PKCE E2E when PostgreSQL profile is available).

## Owner And Status

Owner, root path, and lifecycle status are tracked in `specs/component.spec.json`.
