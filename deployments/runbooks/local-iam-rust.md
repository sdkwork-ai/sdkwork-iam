# Local IAM Rust Runtime

Purpose: run and verify the local/private IAM Rust route crates, gateway assembly, and SQLx storage used by IAM Tauri hosts and standalone gateways.

Owner: `sdkwork-iam` maintainers.

## Prerequisites

- PostgreSQL profile from `.env.postgres.example` at the sdkwork-iam root
- Rust toolchain with workspace dependencies resolved

## Bootstrap

```bash
cp .env.postgres.example .env.postgres
```

## Verification

Structure, API envelope, and gateway assembly (including `/healthz` and `/readyz`):

```bash
pnpm run check
pnpm run check:gateway-assembly
```

Gateway assembly infrastructure smoke test (no database required):

```bash
cargo test -p sdkwork-api-iam-assembly --test infra_routes
```

## Run Standalone Gateway

```bash
SDKWORK_IAM_APPLICATION_PUBLIC_INGRESS_BIND=127.0.0.1:3901 cargo run -p sdkwork-api-iam-assembly
```

Production additionally requires the PostgreSQL profile, `SDKWORK_IM_ENVIRONMENT=production`, `SDKWORK_IAM_SIGNING_MASTER_SECRET`, messaging-backed verification when email verification is required, and a successful database Snowflake node lease. Startup remains alive for probe visibility when hardening fails, but `/readyz` stays unavailable and business traffic must not be routed to the instance.

PostgreSQL integration tests (serial execution avoids Windows linker contention):

```bash
cargo test -j 1 -p sdkwork-routes-iam-app-api --test iam_local_app_router_test -- --test-threads 1
cargo test -j 1 -p sdkwork-routes-iam-backend-api --test iam_backend_postgres_integration -- --test-threads 1
```

Full repository verification:

```bash
pnpm run verify
```

## Provider Credential Master Secret

The cloud account center (`/backend/v3/api/iam/provider_accounts/*/credentials`) stores provider
credential material in an AES-256-GCM envelope that fails closed. With no master secret, every
credential write answers `iam_provider_credential_cipher_unavailable` (HTTP 503), and the gateway
logs `provider credential sealing is not configured` once while the backend router is built.

Required in every environment that stores credentials:

```bash
export SDKWORK_IAM_PROVIDER_CREDENTIAL_MASTER_SECRET="$(openssl rand -base64 32)"
```

Rotate by moving the previous value into `SDKWORK_IAM_PROVIDER_CREDENTIAL_LEGACY_MASTER_SECRETS`
(comma-separated); historical values are only tried after the active one.

The variable is deliberately absent from this repository's tracked topology. `.env.postgres`
rejects any key that is not `SDKWORK_DATABASE_*` (`unified_postgres_env::apply_env_file` panics),
and dev topology files must not carry IAM master secrets. Supply it through the process
environment of whatever starts the gateway.

## Notes

- Unified PostgreSQL env resolution prefers `sdkwork-iam/.env.postgres`, then cloud-router profiles.
- Integration tests cap IAM SQLx pools (`max_connections=2`, `min_connections=0`) and share one seeding pool per test binary via `tests/unified_database_env.rs`.
- Local app/backend Postgres suites repair legacy opaque IAM user ids before serving directory reads, so assignment joins must stay aligned with the repaired snowflake `user_id`.
- If PostgreSQL integration tests fail with `PoolTimedOut`, terminate stale IAM test binaries and release idle connections on the dev database before re-running `pnpm run verify`.
- Local JWT issuer is `sdkwork-iam-local`.
- `sdkwork-api-iam-assembly` mounts `/healthz`, `/livez`, `/readyz`, and `/metrics` once via `sdkwork-web-bootstrap::assemble_multi_surface_router`.
- `/readyz` uses SQLx readiness against the IAM database pool. The always-ready fallback is development/embedded-only; production database bootstrap and Snowflake lease failures remain fail-closed.
