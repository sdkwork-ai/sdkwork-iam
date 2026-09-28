# sdkwork-iam-pc-tauri specs

Machine authority: [`component.spec.json`](./component.spec.json).

Tauri host adapter contract: deep-link plugin and opener plugin mapped onto
the `@sdkwork/iam-desktop-auth` host port. Local capability only — never
business authentication. Rust-side contract: `sdkwork-iam-tauri-host`.
