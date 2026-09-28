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
pass `redirectUri` explicitly.

### Integration flow per host

**Electron (`clientArchitecture: "electron"`, package
`@sdkwork/iam-pc-electron`)** — three wiring points, all inside the Electron
host package:

```ts
// 1. main process: register the scheme + collect deep links + allowlisted IPC
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createSdkworkElectronDeepLinkBridge } from "@sdkwork/iam-pc-electron";

createSdkworkElectronDeepLinkBridge({
  app, ipcMain, shell,
  scheme: "sdkwork-cloudrouter",
  getWindow: () => BrowserWindow.getAllWindows()[0] ?? null,
  // optional: allowedOpenSchemes (default ["https", scheme])
});

// 2. preload: expose exactly the bridge allowlist (no pass-through)
import { exposeSdkworkDesktopPreloadBridge } from "@sdkwork/iam-pc-electron";
exposeSdkworkDesktopPreloadBridge({ contextBridge, ipcRenderer });

// 3. renderer: the host port for the auth runtime
import { createElectronDesktopAuthHost } from "@sdkwork/iam-pc-electron";
const host = createElectronDesktopAuthHost({ bridge: window.sdkworkDesktop });
```

macOS delivers deep links through `open-url`; Windows/Linux through
`second-instance` argv — the bridge normalizes both, and the renderer only
ever sees `getInitialUrl()` / `onOpenUrl()`. `shellOpen` rejects every scheme
outside the allowlist (default `https` + the app's own scheme) before the OS
is involved. Electron security baseline applies unchanged
(`contextIsolation`, `sandbox`, preload allowlist).

**Tauri (`clientArchitecture: "tauri"`, package `@sdkwork/iam-pc-tauri`)** —
renderer wiring plus plugin config in the app shell's `tauri.conf.json`:

```json
{ "plugins": { "deep-link": { "desktop": { "schemes": ["sdkwork-cloudrouter"] } } } }
```

```ts
import { createTauriDesktopAuthHost } from "@sdkwork/iam-pc-tauri";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";

const host = createTauriDesktopAuthHost({
  deepLink: { getCurrent, onOpenUrl },
  opener: { openUrl },
});
```

The Tauri CLI/installer registers the scheme with the OS from the plugin
config (NSIS/MSI on Windows, Info.plist on macOS). The Rust-side contract
lives in the `sdkwork-iam-tauri-host` crate; feature code never imports
`@tauri-apps/*` directly.

**Browser fallback (web build of the same renderer)** — no native shell:
`createBrowserDesktopAuthHost()` opens the authorize URL in a new tab and
never emits deep links. The desktop login entry simply does not render
(desktopBrowserLogin binding absent), so web behavior is unchanged.

**Custom/other hosts** — implement the three-method
`SdkworkDesktopAuthHostPort` (`openExternal`, `getInitialUrl`, `onOpenUrl`)
over whatever the shell provides (Capacitor desktop provider plugin, a custom
bridge) and pass it to the runtime. Bridge method names follow
`DESKTOP_APP_ARCHITECTURE_SPEC.md` section 5.6 (`sdkwork:deepLinks:*`,
`sdkwork:shellOpen:open`).

### Interaction sequences

1. **Fresh login (the normal path).** User clicks "Sign in with browser" in
   the desktop login page → PKCE pair + state stored → system browser opens
   the IAM authorize endpoint → hosted login page (`/auth/login?oauthAuthorizationStateId=…`)
   → the user signs in, registers, or resets a password — the full web
   experience, login-context selection included → completion triggers the
   hosted login-success page (`/auth/desktop/launch`) → the page auto-fires
   the deep link (with a manual "Open desktop app" button and guidance if
   nothing opens) → the desktop app receives `code` + `state`, validates
   them against the pending flow, redeems the code through
   `oauth.desktopSessions.create`, and commits the standard dual-token
   session. The desktop page flips from "waiting" to logged in.
2. **Browser already signed in.** Same as above, but the hosted login page
   skips the form entirely (auto-complete effect) and goes straight to the
   success page.
3. **Third-party provider during a desktop authorization.** If the user
   picks WeChat/GitHub/… on the hosted login page, the pending
   `oauthAuthorizationStateId` rides along the provider round-trip; after the
   provider callback creates the browser session, the callback page completes
   the pending authorization and still hands off to the desktop app.
4. **Cold start.** The browser finished while the desktop app was launching:
   the OS starts the app with the deep link; `completePendingCallbackFromLaunch()`
   during bootstrap redeems it without user interaction.
5. **Cancel.** The waiting card on the desktop login page offers "Cancel
   browser sign-in" — the pending flow is dropped and the entry returns; the
   controller stays usable.
6. **Failure handling.** Provider denial (`error=access_denied`), state
   mismatch (forged/stale deep link — the pending flow survives), flow expiry
   (10 minutes), and exchange failure (single-use code) all surface typed
   errors; every terminal failure resets the waiting state so a fresh login
   is one click away. Tokens never appear in any URL or log.

## Auth-surface semantics

- The hosted hand-off page (`/auth/desktop/launch`) is exempt from the
  authenticated-user bounce in `resolveAuthAccess`: the user is always
  authenticated in the browser when they land there, and every other auth
  route still redirects away as before.
- `AuthPage` auto-completes an `oauthAuthorizationStateId` authorization when
  the browser user is already authenticated — no second login form.
- `AuthOAuthCallbackPage` keeps the component mounted when a threaded
  `oauthAuthorizationStateId` is present (the authenticated Navigate is
  suppressed until the pending authorization completes and the hand-off
  runs).
- `SdkworkIamDesktopAuthController.cancelLogin()` abandons a waiting flow
  without destroying the controller; `dispose()` is final teardown. A failed
  session exchange resets the flow (the authorization code is single-use, so
  retrying with the same code can never succeed) and the user starts a fresh
  browser login with one click.

## Registration requirements for a desktop client

1. Tenant application `app_id` with `runtimeConfig.oauth.relyingParty = { enabled: true, confidential: false, redirectUris: ["<scheme>://auth/callback"], allowedScopes: ["openid", "profile", "offline_access"] }` — register through backend-api `applications.register`.
2. OS-level protocol registration for the scheme: Electron `setAsDefaultProtocolClient` (inside `createSdkworkElectronDeepLinkBridge`); Tauri deep-link plugin `desktop.schemes` config.
3. The scheme must derive from the app key (lowercase letters, digits, `-`); `normalize_deep_link_scheme` in `sdkwork-iam-tauri-host` and `deriveSdkworkDesktopRedirectUri` in `@sdkwork/iam-desktop-auth` enforce the same rules on both sides.

### Integration checklist for a new desktop application

- [ ] Tenant application registered as a public OAuth relying party with the deep-link redirect URI (and, if used, an RFC 8252 loopback URI).
- [ ] Host package chosen (`@sdkwork/iam-pc-electron` or `@sdkwork/iam-pc-tauri`), scheme registered with the OS.
- [ ] `createSdkworkIamDesktopAuthRuntime` wired with the generated app SDK client and the product session bridge as `onSession`.
- [ ] `completePendingCallbackFromLaunch()` called during app bootstrap.
- [ ] Desktop login entry rendered by passing the `desktopBrowserLogin` binding to `SdkworkAuthPage` / `SdkworkIamAuthRoutes`.
- [ ] Logout clears the product session and any host secure storage (spec section 10 of `IAM_LOGIN_INTEGRATION_SPEC.md`).
