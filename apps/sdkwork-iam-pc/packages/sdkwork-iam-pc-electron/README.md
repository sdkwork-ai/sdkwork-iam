# sdkwork-iam-pc-electron

Domain: iam
Capability: iam-electron-host
Package type: desktop-host (`clientArchitecture: "electron"`)
Status: standard

Electron host adapter for the SDKWork IAM desktop browser-login flow: OS
deep-link protocol registration, the `sdkwork:deepLinks:*` /
`sdkwork:shellOpen:*` bridge allowlist, and the renderer-side
`@sdkwork/iam-desktop-auth` host port.

## Login flow implemented here

```text
Electron app -> system browser (authorize endpoint, PKCE S256)
browser      -> hosted login (login / register / forgot password)
browser      -> hosted success page (/auth/desktop/launch)
browser      -> deep link sdkwork-iam://auth/callback?code=...&state=...
Electron     -> open-url (macOS) / second-instance (Windows/Linux)
renderer     -> handleOpenUrl -> oauth.desktopSessions.create -> session
```

## Wiring (Electron main)

```ts
import { app, BrowserWindow, ipcMain, shell } from "electron";
import {
  createSdkworkElectronDeepLinkBridge,
  exposeSdkworkDesktopPreloadBridge,
} from "@sdkwork/iam-pc-electron";

// preload: expose only the allowlisted bridge
exposeSdkworkDesktopPreloadBridge({ contextBridge, ipcRenderer });

// main:
const bridge = createSdkworkElectronDeepLinkBridge({
  app,
  ipcMain,
  scheme: "sdkwork-iam",
  shell,
  getWindow: () => BrowserWindow.getAllWindows()[0] ?? null,
});
```

## Renderer

```ts
import { createElectronDesktopAuthHost } from "@sdkwork/iam-pc-electron";

const host = createElectronDesktopAuthHost({
  bridge: window.sdkworkDesktop, // typed preload bridge
});
```

`electron` stays an optional peer dependency: this package typechecks with
structural types and the consuming Electron app supplies the real objects.
