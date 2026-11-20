# IAM Operator Guide

Status: active  
Owner: SDKWork maintainers  
Specs: IAM_SPEC.md, TECH_ARCHITECTURE.md, SECURITY_SPEC.md

## Production prerequisites

- PostgreSQL is the only supported production database engine (`database/README.md`).
- Set `SDKWORK_IAM_SIGNING_MASTER_SECRET` before production startup.
- Set `SDKWORK_IM_ENVIRONMENT=production` (or `SDKWORK_IM_ENVIRONMENT=development` only for local dev) so `assert_production_hardening()` and dev shortcuts follow the intended posture.
- Configure `SDKWORK_DATABASE_URL` or the unified cloud-router PostgreSQL profile.

## Gateway surfaces

The IAM gateway assembly merges three async surfaces:

| Surface | Mount | Notes |
| --- | --- | --- |
| app-api | `sdkwork_routes_iam_app_api::gateway_mount()` | End-user auth, directory, contacts |
| backend-api | `sdkwork_routes_iam_backend_api::gateway_mount()` | Tenant/org/user/RBAC/OAuth admin |
| open-api | `sdkwork_routes_iam_open_api::gateway_mount()` | OAuth AS + inbound IdP |

Shared infrastructure (`/healthz`, `/livez`, `/readyz`, `/metrics`) is mounted once via `sdkwork-web-bootstrap`.

## Snowflake node IDs

Database bootstrap allocates a Snowflake `node_id` from `sdkwork_node_registry` and initializes `init_iam_id_generator()`. For single-node dev, allocation failure falls back to `SDKWORK_IAM_SNOWFLAKE_NODE_ID`.

## Verification

```powershell
cd <workspace-root>/sdkwork-iam
pnpm run verify
node <workspace-root>/sdkwork-specs\tools\check-pagination.mjs --workspace <workspace-root>/sdkwork-iam
```

## Security and tenancy

- **PostgreSQL only** for IAM lifecycle and production HTTP surfaces. Embedded SQLite adapters are non-authoritative and are not a production database option.
- **Tenant isolation**: backend tenant path operations require the session tenant or platform tenant (`100001`).
- **Permission catalog**: `iam_permission` create/update/delete is restricted to the platform tenant.
- **OAuth inbound IdP**: OIDC identity resolution requires verified userinfo; unverified `id_token` payloads are never trusted.
- **Rate limits**: backend write routes are scoped per `tenant_id`, actor, and URI path.
- **Pagination**: list APIs reject invalid `page`/`page_size` with `40003`; audit/security feeds support keyset cursors (`k:{created_at}|{id}`).
- **OAuth AS signing**: tenant bootstrap provisions RS256 keys (`{tenant_id}:oauth-rs256:primary`); access tokens require RS256 outside explicit development deployments; `/iam/v3/oauth/jwks` publishes active RS256 public keys from PostgreSQL. OpenID discovery does not advertise `id_token` until issuance is implemented.
- **Error responses**: backend 500 responses return sanitized `internal server error` envelopes; SQL details are logged server-side only.
- **Backend mutation audit**: directory CRUD and OAuth admin creates/updates/deletes write `iam_audit_event` in the same PostgreSQL transaction as the row mutation; audit failure rolls back the mutation.
- **Backend write rate limit**: when the PostgreSQL pool is unavailable, write routes return `503` instead of skipping rate limiting.

See also `deployments/runbooks/local-iam-rust.md`.

## Application access token operations

The committed public application access token is the pre-login isolation credential
(`APP_ACCESS_TOKEN_SPEC.md`): it ships inside the package, is permanent by default
(`exp: 0`), and carries one of two levels.

| Level | Claims | Isolation key |
| --- | --- | --- |
| Tenant | `organization_id=0`, `login_scope=TENANT`, `ownership_scope=TENANT` | `(tenant_id, app_id)` |
| Organization | non-zero `organization_id`, `login_scope=ORGANIZATION`, `ownership_scope=ORGANIZATION` | `(tenant_id, app_id, organization_id)` |

The two levels are not interchangeable: the installation's stored scope and
organization must match the claims, and the resolver projects `tenant:<id>` (plus
`organization:<id>` only for an organization release) into the credential data scope.
The bootstrap credential of a shared release is served by a tenant-scoped synthetic
principal (`system:<tenant_id>`), so every tenant can issue one.

Organization-level deployment checklist:

1. Register/provision the installation with `ownershipScope=ORGANIZATION` and its
   organization id; the provisioned scope is immutable.
2. Declare `accessToken.organizationId` (optionally `accessToken.scope: organization`)
   in `etc/client-env.materialization.json` and record the same
   `backend.organizationId` in the application manifest.
3. Set `SDKWORK_APPLICATION_OWNERSHIP_SCOPE=ORGANIZATION` only when the installation
   owns the scope; the surface declaration is otherwise the authority.
4. Materialize with the deployment anchor, then run both token gates:
   `node <sdkwork-specs>/tools/materialize-client-env.mjs --root <repo> --check` and
   `node <sdkwork-specs>/tools/check-release-access-token-env.mjs --root <repo>`.
5. Export `SDKWORK_DEPLOY_APPLICATION_ID` on the build host; CI reads the
   `SDKWORK_DEPLOY_APPLICATION_ID` repository variable when it is set.

Rotation is explicit: bump the generator's `token_version`/`issuedAt` (or pass a future
`expiresAt` for a time-boxed window), regenerate every profile, review the diff, and
commit. A committed token never expires in normal operation; IAM rejects a concrete
deadline that elapsed.

Verification against a real database:

```bash
export SDKWORK_DATABASE_URL=postgres://user:pass@127.0.0.1:5432/sdkwork_ai_dev
pnpm run db:migrate
cargo test -p sdkwork-iam-web-adapter --test installation_ownership_scope_postgres -- --ignored
cargo test -p sdkwork-iam-web-adapter --test installation_disable_postgres -- --ignored
cargo test -p sdkwork-iam-provider-account-service --test provider_account_scope_visibility
```

These suites resolve the workspace database profile and skip when no migrated database is
configured. The IAM quality gate runs the static database contract and the SQL scope
gate (`pnpm run check:database`) on every change.
