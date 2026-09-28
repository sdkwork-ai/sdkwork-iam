# sdkwork-iam-desktop-auth specs

Machine authority: [`component.spec.json`](./component.spec.json).

This package owns the desktop browser-login runtime contract: PKCE S256,
authorize-URL construction, deep-link callback validation, and the
`oauth.desktopSessions.create` redeem port used by Electron/Tauri hosts.
