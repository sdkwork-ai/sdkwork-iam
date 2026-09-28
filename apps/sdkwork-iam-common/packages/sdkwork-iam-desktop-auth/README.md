# @sdkwork/iam-desktop-auth

Domain: iam
Capability: iam-desktop-auth
Package type: runtime
Status: standard

SDKWork IAM desktop browser-login runtime for Electron/Tauri (and any native
host): PKCE S256 authorization, deep-link callback validation, and dual-token
session exchange.

## Flow (RFC 8252 + PKCE)

```text
desktop app (Electron/Tauri)
  1. beginLogin()
       PKCE pair + state -> open system browser at
       GET /iam/v3/oauth/authorize?...code_challenge_method=S256
  2. user completes login / registration / forgot-password on the hosted
     web surface (identical flow no matter where it started)
  3. browser completes the authorization and lands on the hosted
     login-success page (/auth/desktop/launch), which deep-links back to
     sdkwork-iam://auth/callback?code=...&state=...
  4. handleOpenUrl(url)
       validates scheme/path/state/expiry, then redeems the code through
       the generated app SDK: oauth.desktopSessions.create
       -> standard SdkworkAuthSession (authToken + accessToken + refreshToken)
```

## Usage

```ts
import { createClient } from "@sdkwork/iam-app-sdk";
import {
  bindSdkworkDesktopSessionExchange,
  createSdkworkIamDesktopAuthController,
} from "@sdkwork/iam-desktop-auth";
import { createElectronDesktopAuthHost } from "@sdkwork/iam-pc-electron";

const client = createClient({ /* app config */ });
const controller = createSdkworkIamDesktopAuthController({
  descriptor: {
    appId: "sdkwork-iam",
    authorizeBaseUrl: "https://iam.example.com",
    redirectUri: "sdkwork-iam://auth/callback",
  },
  exchangeDesktopSession: bindSdkworkDesktopSessionExchange(client),
  host: createElectronDesktopAuthHost(/* host bridge */),
});

await controller.beginLogin();
const session = await controller.handleOpenUrl(deepLinkUrl);
// commit `session` through the product auth runtime session bridge
```

## Host adapters

The `SdkworkDesktopAuthHostPort` (`openExternal`, `getInitialUrl`,
`onOpenUrl`) is implemented by native host packages; this package never
imports `electron`, `@tauri-apps/*`, or any host global. Browser-only builds
use `createBrowserDesktopAuthHost()`.

## Verification

```bash
pnpm --filter @sdkwork/iam-desktop-auth typecheck
pnpm --filter @sdkwork/iam-desktop-auth test
```
