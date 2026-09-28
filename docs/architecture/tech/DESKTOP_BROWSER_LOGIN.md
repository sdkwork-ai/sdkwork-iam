# Desktop Browser Login And Deep Link Hand-Off

Status: implemented design note for the SDKWork IAM desktop (Electron/Tauri) browser-login flow. Authority remains with the global specs (`IAM_OAUTH_SPEC.md`, `IAM_LOGIN_INTEGRATION_SPEC.md`, `DESKTOP_APP_ARCHITECTURE_SPEC.md`); this document is narrative and does not restate their rules.

## Goal

A desktop application (Electron or Tauri shell) must never render its own login UI. Clicking the login entry in the desktop app hands the flow to the system browser, where the full hosted web experience runs — login, registration, and password reset — regardless of where the flow started. After success the browser shows a login-success page and hands the session proof back to the desktop app through a deep link.

## Flow

```text
┌────────────┐ 1. open system browser                        ┌──────────────────────┐
│ Desktop app │ ───────────────────────────────────────────▶ │ IAM hosted login page │
│ (login UI)  │  GET /iam/v3/oauth/authorize                 │ /auth/login           │
└─────┬──────┘    response_type=code                         │ login / register /    │
      │                                 client_id=<app_id>   │ forgot password       │
      │                                 redirect_uri=        └──────────┬───────────┘
      │                                   sdkwork-iam://auth/callback   2. any web method
      │                                 code_challenge (S256)             (login context
      │                                 state                              selection included)
      │                                                                   ▼
      │                                              POST /app/v3/api/oauth/authorizations/
      │                                              {authorizationStateId}/completions
      │                                                       │
      │ 4. OS routes the deep link                            ▼
      │ ◀────────────────────────────── 3. browser lands on /auth/desktop/launch
┌─────┴──────┐                                   (login-success page) which hands the
│ Desktop app │                                   redirect URL to the OS
│ receives    │
│ code+state  │  5. redeem: POST /app/v3/api/oauth/desktop_sessions
└─────┬──────┘     { clientId, authorizationCode, codeVerifier, redirectUri }
      │             → standard SdkworkAuthSession (authToken + accessToken
      ▼              + refreshToken), same shape as every other login surface
  desktop app session bridge / token manager → logged in
```

Security properties (per `IAM_OAUTH_SPEC.md` section 7):

- The desktop app is a **public OAuth client**: `client_id` is the tenant application `app_id`, the redirect URI is a private-use scheme (for example `sdkwork-iam://auth/callback`), and PKCE S256 is mandatory.
- The authorization code is single-use, five minutes, server-side state bound to the PKCE challenge; the desktop app proves possession only with `code_verifier`.
- Tokens never travel through URLs: the deep link carries the one-time `code`, not a session.
- Deep-link redirect URIs are registered on the application's OAuth relying-party config (`runtimeConfig.oauth.relyingParty.redirectUris`); RFC 8252 loopback redirects (`http://127.0.0.1:<ephemeral-port>/…`) may be registered port-less and match on any port.

## Ownership by layer

| Concern | Owner |
| --- | --- |
| Redirect URI matching for custom schemes and loopback ports, redirect surface classification (`web` / `desktop`), authorization-code redemption core | `sdkwork-iam-web-adapter` (`oauth_authorization_server.rs`) |
| `POST /app/v3/api/oauth/desktop_sessions` redeem endpoint (`oauth.desktopSessions.create`, pure anonymous) | `sdkwork-routes-iam-app-api` |
| Desktop deep-link contract (scheme derivation, endpoint paths, bridge names) | `sdkwork-iam-tauri-host` crate (`desktop_login.rs`) |
| PKCE, state, callback validation, redeem via `oauth.desktopSessions.create`, pending-flow store | `@sdkwork/iam-desktop-auth` |
| Hosted login-success page (`/auth/desktop/launch`) and the browser-login entry on the login page | `@sdkwork/auth-pc-react` |
| OS protocol registration, deep-link routing, preload allowlist | `@sdkwork/iam-pc-electron` (Electron) / Tauri deep-link + opener plugins via `@sdkwork/iam-pc-tauri` |
| Session commit into the auth runtime | Product composition (session bridge), never the host adapter |

## Component map

- `apps/sdkwork-iam-common/packages/sdkwork-iam-desktop-auth` — flow engine (`createSdkworkIamDesktopAuthController`, `bindSdkworkDesktopSessionExchange`, `createBrowserDesktopAuthHost` fallback).
- `apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-electron` — `createSdkworkElectronDeepLinkBridge` (main), `exposeSdkworkDesktopPreloadBridge` (preload, method allowlist only), `createElectronDesktopAuthHost` (renderer port).
- `apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-tauri` — `createTauriDesktopAuthHost` over injected deep-link/opener plugin handles.
- `apps/sdkwork-iam-pc/packages/sdkwork-auth-pc-react` — `SdkworkAuthDesktopLaunchPage`, `desktopBrowserLogin` binding on `SdkworkAuthPage`, `SdkworkIamAuthRoutes` dispatch.

The login-success page exists for the case where the browser is in the foreground after completion: it auto-attempts the deep-link navigation, offers a manual "open desktop app" button, and explains what to check when nothing opens. When the desktop app is already waiting (browser-login entry used), the same page still fires the deep link and the app-side listener completes the flow.

## Standard integration for any desktop application

The one-call entry is `createSdkworkIamDesktopAuthRuntime` in
`@sdkwork/iam-desktop-auth`. An application supplies four things — app
identity, the generated app SDK client, the host port, and a session
committer — and receives a ready-to-wire runtime:

```ts
import { createClient } from "@sdkwork/iam-app-sdk";
import {
  createSdkworkIamDesktopAuthRuntime,
} from "@sdkwork/iam-desktop-auth";
import { createElectronDesktopAuthHost } from "@sdkwork/iam-pc-electron";

const appSdkClient = createClient({ /* app config */ });
const runtime = createSdkworkIamDesktopAuthRuntime({
  appId: "sdkwork-cloudrouter",        // also the OAuth client_id
  authorizeBaseUrl: "https://iam.example.com",
  appSdkClient,
  host: createElectronDesktopAuthHost({ bridge: window.sdkworkDesktop }),
  onSession: (session) => sessionBridge.commitSession(session),
});

// login entry click:
await runtime.beginLogin();
// app bootstrap (cold start — the OS launched the app with the callback):
await runtime.completePendingCallbackFromLaunch();
```

The deep-link redirect URI derives from the application key
(`sdkwork-cloudrouter://auth/callback`); keys outside `[a-z][a-z0-9-]*` must
pass `redirectUri` explicitly. Host adapters exist per architecture
(`@sdkwork/iam-pc-electron`, `@sdkwork/iam-pc-tauri`); browser builds use
`createBrowserDesktopAuthHost()`.

## Auth-surface semantics

- The hosted hand-off page (`/auth/desktop/launch`) is exempt from the
  authenticated-user bounce in `resolveAuthAccess`: the user is always
  authenticated in the browser when they land there, and every other auth
  route still redirects away as before.
- `AuthPage` auto-completes an `oauthAuthorizationStateId` authorization when
  the browser user is already authenticated — no second login form.
- `SdkworkIamDesktopAuthController.cancelLogin()` abandons a waiting flow
  without destroying the controller; `dispose()` is final teardown. A failed
  session exchange resets the flow (the authorization code is single-use, so
  retrying with the same code can never succeed) and the user starts a fresh
  browser login with one click.

## Registration requirements for a desktop client

1. Tenant application `app_id` with `runtimeConfig.oauth.relyingParty = { enabled: true, confidential: false, redirectUris: ["sdkwork-iam://auth/callback"], allowedScopes: ["openid", "profile", "offline_access"] }`.
2. OS-level protocol registration for the scheme (Electron `setAsDefaultProtocolClient` in this package; Tauri deep-link plugin configuration in the app shell).
3. The scheme must derive from the app key (lowercase letters, digits, `-`); `normalize_deep_link_scheme` in `sdkwork-iam-tauri-host` validates this at build/test time.
