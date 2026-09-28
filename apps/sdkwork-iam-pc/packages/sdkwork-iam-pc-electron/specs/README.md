# sdkwork-iam-pc-electron specs

Machine authority: [`component.spec.json`](./component.spec.json).

Electron host adapter contract: OS deep-link protocol registration, the
`sdkwork:deepLinks:*` / `sdkwork:shellOpen:*` bridge allowlist, and the
renderer-side `@sdkwork/iam-desktop-auth` host port. Local capability only —
never business authentication.
