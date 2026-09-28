# sdkwork-iam-pc-tauri

Domain: iam
Capability: iam-tauri-host
Package type: desktop-host (`clientArchitecture: "tauri"`)
Status: standard

Tauri host adapter for the SDKWork IAM desktop browser-login flow: maps the
deep-link and opener plugins onto the `@sdkwork/iam-desktop-auth` host port.

## Login flow implemented here

```text
Tauri app -> system browser (authorize endpoint, PKCE S256)
browser   -> hosted login (login / register / forgot password)
browser   -> hosted success page (/auth/desktop/launch)
browser   -> deep link sdkwork-iam://auth/callback?code=...&state=...
Tauri     -> deep-link plugin event / getCurrent
renderer  -> handleOpenUrl -> oauth.desktopSessions.create -> session
```

## Renderer wiring

```ts
import { createTauriDesktopAuthHost } from "@sdkwork/iam-pc-tauri";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";

const host = createTauriDesktopAuthHost({
  deepLink: { getCurrent, onOpenUrl },
  opener: { openUrl },
});
```

The `@tauri-apps/*` plugin handles are passed in explicitly (structural
typing) so this package stays free of host globals and feature code never
imports plugin APIs directly. The Rust-side contract lives in the
`sdkwork-iam-tauri-host` crate (`iam_desktop_browser_login_contract`,
`assert_desktop_session_route_registered`).
