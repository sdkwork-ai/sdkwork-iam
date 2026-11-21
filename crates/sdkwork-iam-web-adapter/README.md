# sdkwork-iam-web-adapter

Domain: iam
Capability: web-adapter
Package type: rust-crate
Rust crate import: `sdkwork_iam_web_adapter`
Status: standard

IAM adapters for `sdkwork-web-framework` request context pipeline. Bridges IAM
`AppContext`, dual-token session resolution, and open-api credential resolution
(API key, OAuth bearer, login auth token, flexible) into `WebRequestContext`,
`WebRequestPrincipal`, and route manifest integration.

## Credential Channels

`IamWebRequestContextResolver` implements every `WebRequestContextResolver`
channel from the IAM session store:

| Channel | Credential | `iam_session` column |
| --- | --- | --- |
| API key | platform open-api key | `iam_api_key` record |
| OAuth bearer | OAuth2 access token | `access_token_hash`, then OAuth JWT |
| Dual token | `Authorization` + `Access-Token` pair | `auth_token_hash` + `access_token_hash` |
| Bearer auth token | a signed-in user's login `authToken` alone | `auth_token_hash` |

The bearer-auth-token channel backs `RouteAuth::OpenApiBearerFlexible`: a vendor
wire that publishes one `Authorization: Bearer` credential lets a signed-in user
send the session's login token in place of an API key. A value the session store
does not recognise falls back to the OAuth channel, so a public OAuth access
token keeps resolving there.

## Public API

- `wrap_router_with_iam_app_web_framework`
- `wrap_router_with_iam_backend_web_framework`
- `wrap_router_with_iam_open_api_web_framework`
- `build_iam_open_api_web_framework_layer`
- `IamWebRequestContextResolver` (canonical application integration resolver)
- `IamOpenApiWebRequestContextResolver` (open-api alias)
- `iam_web_request_context_resolver_from_env`
- `IamApiKeyLookupService` / `IamOAuthTokenLookupService` (database-backed open-api)
- `resolve_iam_app_context_from_oauth_bearer`

`IamWebRequestContextResolver` is the canonical resolver name for application integration.
`IamDatabaseWebRequestContextResolver` is the concrete implementation struct used internally by the resolver factory.

## Framework Integration

This crate depends on `sdkwork-web-framework` (`sdkwork-web-core`,
`sdkwork-web-axum`) and `sdkwork-database-sqlx` per `WEB_FRAMEWORK_SPEC.md`.

## Verification

```bash
cargo test -p sdkwork-iam-web-adapter
cargo test -p sdkwork-routes-iam-open-api
```

## Owner And Status

Owner, root path, and lifecycle status are tracked in `specs/component.spec.json`.
