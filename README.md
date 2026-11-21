# SDKWORK IAM
repository-kind: application

`sdkwork-iam` is the canonical IAM domain repository for SDKWork. It owns
identity, access management, OAuth/SSO, user-center, IMF registry, database module,
HTTP/RPC authorities, TypeScript/React/Flutter IAM packages, and generated IAM SDK families.

This workspace is a **base dependency repository**, not an independent application
root. It intentionally does not own a root `agent.app.config.json`.

Applications consume IAM through `sdkwork-iam` crates, packages, and generated
SDK clients. Platform shell, runtime bootstrap, and non-IAM foundation
capabilities remain in `sdkwork-appbase`.

Plugin manifests and operator wiring live under `.sdkwork/plugins/`.

This workspace does not replace:

- `sdkwork-ui`: shared UI primitives, patterns, and theme tokens
- `sdkwork-appbase`: platform foundation packages and shared runtime bootstrap

## Workspace layout

```text
sdkwork-iam/
  apis/                          # IAM OpenAPI and RPC authorities
  apps/
    sdkwork-iam-common/packages/ # cross-architecture contracts, service, runtime, SDK ports/adapter
    sdkwork-iam-pc/packages/     # PC React IAM modules (auth, oauth admin, user center, ...)
    sdkwork-iam-h5/packages/     # H5/mobile React IAM modules
    sdkwork-iam-flutter-mobile/packages/  # Flutter mobile IAM core
  crates/                        # Rust IAM domain, routers, web adapter
  database/                      # IAM postgres module (iam_* tables)
  iam/                           # IMF registry and federated module manifests
  sdks/                          # sdkwork-iam-app-sdk, backend-sdk, open-sdk
  specs/                         # IAM component contracts
  tools/
  plugins/
  examples/
  configs/
  deployments/
  tests/
  docs/
```

## OAuth / SSO

OAuth and SSO are IAM session extensions. Inbound flows consume third-party IdPs;
outbound flows expose SDKWork as an OAuth authorization server. All paths converge
on IAM `auth_token` + `access_token`. Per-application policy lives in
`iam_application_installation.runtime_config_json` (`auth.*`, `oauth.relyingParty.*`).

See `../sdkwork-specs/IAM_OAUTH_SPEC.md` for the full contract.

## Release scope (tenant / organization / personal)

One source tree produces different deployments, and the only difference between
them is the level the application was published at. That level is stored on the
installation as `iam_application_installation.ownership_scope`, and it (not the
request) decides the access-token claims and the isolation key:

| `ownership_scope` | Meaning | `organization_id` | `owner_user_id` | Isolation key | Token claim |
| --- | --- | --- | --- | --- | --- |
| `TENANT` (default) | whole tenant | `0` | absent | `(tenant_id, app_id)` | `ownership_scope: TENANT`, `organization_id: 0` |
| `ORGANIZATION` | one organization | non-zero | absent | `(tenant_id, organization_id, app_id)` | `ownership_scope: ORGANIZATION`, `organization_id: <installation org>` |
| `USER` | one person | `0` | required | `(tenant_id, app_id, user_id)` | `ownership_scope: USER`, `organization_id: 0` |

Rules enforced in code and in the database (`APPLICATION_IDENTITY_SPEC.md` §4.1,
`IAM_SPEC.md` §3/§5.2):

- `TENANT` is the only default: an omitted `ownershipScope` on provisioning, a
  delegated credential request, or a public application token can never produce a
  narrower level.
- The scope is **immutable**: re-provisioning with a different level, or a
  different owner, is a conflict naming the stored one. Publishing at another
  level needs a new installation.
- Issuance reads the scope from the installation row. A request that declares a
  different scope fails closed; `USER` issuance also fails closed for any subject
  other than the installation's owner (its bootstrap credential is issued for the
  owner, and a deactivated owner stops the deployment from authenticating).
- A login into an `ORGANIZATION`-released application must carry that
  organization's context, and a login into a `USER`-released application must be a
  personal login by the owner. A `TENANT`-released application keeps the ordinary
  personal/organization login context.
- `iam_session.scope_kind` records the level a session was issued for, and the
  resolver projects it to `WebRequestPrincipal.app.ownershipScope` so a data plane
  can pick the right isolation key without a second lookup
  (`sdkwork-web-core` `WebAppContext::ownership_scope`).

Database enforcement (migration `0044_application_installation_ownership_scope`):
`chk_iam_application_installation_ownership_scope`,
`chk_iam_application_installation_ownership_alignment`, `chk_iam_session_scope_kind`,
`chk_iam_session_scope_kind_alignment`. The migration derives existing rows from
`organization_id` (`0` → `TENANT`, non-zero → `ORGANIZATION`) and **stops,
naming every row**, when a legacy `organization_id` is not a positive decimal or
when a session's `login_scope` and `organization_id` already contradict each
other. `USER` is never inferred.

Provisioning accepts `ownershipScope` (default `TENANT`) and `ownerUserId`
(required for `USER`, rejected otherwise) on both operator and bootstrap
provisioning; the OpenAPI authority and generated SDKs carry both fields.

Live-PostgreSQL coverage:

```bash
SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
  cargo test -p sdkwork-iam-web-adapter --test installation_ownership_scope_postgres -- --ignored
```

## Installation environments and credentials

An installation (`iam_application_installation`) is one-to-one with a deploy
application, but each lifecycle environment of that application owns its public
domain and its own OAuth client. Those facts are stored in two child tables:

- `iam_application_installation_environment` — `env_key`, `primary_domain`,
  `domain_config_json`, `env_status` (`pending` | `active` | `disabled`).
- `iam_application_installation_credential` — `client_id` (globally unique),
  Argon2id `secret_hash`, `redirect_uris_json`, `granted_scopes_json`,
  `credential_status` (`active` | `rotated` | `retired`), `rotated_at`,
  `retired_at`.

Management APIs live on the backend surface and are tenant-scoped:

| Operation | Method and path | Permission |
| --- | --- | --- |
| `installations.environments.list` | `GET /backend/v3/api/iam/tenants/{tenantId}/installations/{installationId}/environments` | `iam.installations.update` |
| `installations.environments.update` | `PUT .../environments/{environmentKey}` (upsert) | `iam.installations.update` |
| `installations.environments.delete` | `DELETE .../environments/{environmentKey}` | `iam.installations.update` |
| `installations.credentials.list` | `GET .../credentials` | `iam.installations.update` |
| `installations.credentials.create` | `POST .../credentials` | `iam.installations.update` |
| `installations.credentials.rotate` | `POST .../credentials/{credentialId}/rotate` | `iam.installations.update` |
| `installations.credentials.revoke` | `POST .../credentials/{credentialId}/revoke` | `iam.installations.update` |

The credential lifecycle never widens the existing installation-update boundary:
no new permission code is seeded, and every path is scoped to the path tenant, so
a row of another tenant is indistinguishable from a missing row.

**Constraints and conflicts.** `(installation_id, env_key)` is unique among live
environments; `(tenant_id, primary_domain)` is unique among live rows that carry a
domain (a null/blank domain may repeat); `client_id` is globally unique including
historical rows. Each violation returns HTTP `409` with
`code: iam_installation_lifecycle_conflict` and a detail naming the conflicting
fact. Deleting an environment is a soft delete that also retires its credentials.

**Secret semantics.** The plaintext OAuth client secret is generated server-side,
hashed with Argon2id, and returned exactly once in the `201` create / `200` rotate
response as `data.item.clientSecret`. The client id may be supplied or generated;
the secret itself is never accepted from the caller. No read path selects
`secret_hash`, so list/revoke responses never echo the secret. Rotation inserts a
replacement row that becomes `active` with a fresh `clientId` and secret, marks the
predecessor `rotated` (kept as history), and therefore requires the environment to
be reconfigured with both the new client id and the new secret. Revoke marks the
row `retired` and is idempotent.

**Runtime validation.** Token issuance (delegated access credential, deployment
bootstrap credential, service-account token exchange) and session creation resolve
the installation's live environment rows. When at least one row exists, the
requested environment must be registered with `env_status = active`; otherwise
issuance fails closed and the error names the installation, the requested
environment, and the registered statuses. An installation without environment rows
keeps the historical platform-bootstrap behavior. Common aliases (`dev` /
`development`, `prod` / `production`, `test` / `testing`) compare canonically.

The OpenAPI authority is materialized from the route manifests
(`node tools/generators/materialize-iam-v3-openapi-boundaries.mjs`) and the
generated backend SDK is produced by `pnpm run sdk:generate:backend`; neither is
hand-edited. Live-PostgreSQL coverage for these tables lives in ignored tests:
`cargo test -p sdkwork-iam-web-adapter --lib -- --ignored installation_lifecycle`.

## Verification

- `pnpm run verify`: structure, database, composition, API envelope, gateway assembly, typecheck, API materialize, governance, governed Rust workspace tests (PostgreSQL integration when profile present)
- `pnpm run test:iam-standard-contracts`: TypeScript contracts, IAM adapter parity, PC/H5/Flutter surfaces; Rust HTTP and PostgreSQL integration when `config/host/postgres.env` is present
- `pnpm run check:api-envelope`: v3 `SdkWorkApiResponse` / `ProblemDetail` alignment per `API_SPEC.md`
- `.github/workflows/iam-quality-gate.yml`: CI entrypoint that mirrors the governed workspace quality gate
- `deployments/runbooks/local-iam-rust.md`: local Rust verification runbook for gateway assembly, app-api, and backend-api PostgreSQL integration

## Related specs

- `../sdkwork-specs/IAM_SPEC.md`
- `../sdkwork-specs/IAM_OAUTH_SPEC.md`
- `../sdkwork-specs/README.md`

## Application Roots

- [apps directory index](apps/README.md)

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)
