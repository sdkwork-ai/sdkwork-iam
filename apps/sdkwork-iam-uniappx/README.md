# SDKWork IAM uni-app x

SDKWork IAM uni-app x client application root (`apps/sdkwork-iam-uniappx`).

| Field | Value |
| --- | --- |
| Architecture | `uniappx` |
| Framework | `uni-app-x` |
| Vue mode | `vapor` (蒸汽模式) |
| Package segment | `uniappx` |
| Runtime targets | `APP_ANDROID`, `APP_IOS`, `APP_HARMONY` |
| App manifest | `agent.app.config.json` + HBuilderX `manifest.json` |
| Mode spec | `specs/uniappx-mode.spec.json` |
| Component spec | `specs/component.spec.json` |
| Route registry | `packages/sdkwork-iam-uniappx-core/src/routes/registry.ts` |
| Host package | `packages/sdkwork-iam-uniappx-host` |

## Authority

- `../../../sdkwork-specs/UNIAPP_X_APP_ARCHITECTURE_SPEC.md` — uni-app x root
  architecture, vapor/VDOM contract, `.uvue` ownership, host boundary.
- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` —
  cross-client package taxonomy, route identity, dependency direction.
- `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md` — generated SDK,
  appbase IAM runtime, and one global TokenManager.
- `../../../sdkwork-specs/ICON_SPEC.md` — tab-bar/navigation icon pairing.
- Cross-architecture IAM contracts/runtime:
  `../../apps/sdkwork-iam-common/packages/`.

## Packages

| Package | Owns |
| --- | --- |
| `@sdkwork/iam-uniappx-core` | TokenManager, context store, generated app SDK port, request transport contract, route registry/projection |
| `@sdkwork/iam-uniappx-auth` | auth/session state machine, login form, `.uvue` login page, `AuthGate` |
| `@sdkwork/iam-uniappx-host` | typed `uni.*` adapters, request transport implementation, mode-conditional platform facts |
| `@sdkwork/iam-uniappx-shell` | account header/menu `.uvue` components and shell route composition |

## Root layout

- `App.uvue`, `main.uts`, `manifest.json`, `pages.json`, `uni.scss` — HBuilderX
  project entry. This root does not use `src/`, `vite.config.ts`, `index.html`,
  or `main.ts`.
- `bootstrap/` — environment, runtime, SDK clients, IAM runtime, host adapters,
  and routes. Bootstrap only, no business pages.
- `pages/` — thin root pages that render package components.
- `packages/` — SDKWork source packages.
- `config/app/` — public runtime profiles; `config/host/` — platform metadata.
- `specs/` — component and mode declarations.
- `tests/` — mode, route, and auth-state-machine tests.

## SDK integration seam

The generated IAM app SDK (`@sdkwork/iam-app-sdk`) exposes
`auth.sessions.create/refresh/current.*`. The typed adapter that satisfies
`IamAppSdkAuthPort` belongs to the application composition:

```ts
installIamUniappxRuntime({ authGateway });
```

Without a bound gateway the root boots and renders, but auth actions report that
the gateway is not bound. This is deliberate: the root never guesses generated
response shapes or re-implements app-api resources.

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm test:config
pnpm test:mode
pnpm build:dev
```

App packaging runs through the HBuilderX CLI (`cli publish --platform
app-android|app-ios|app-harmony`) in the release pipeline; it is not available in
this environment.

## Verification

```bash
node ../../../sdkwork-specs/tools/check-uniappx-architecture.mjs --root .
node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root .
node ../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root .
node scripts/verify-uniappx-root.mjs
node --test tests/*.test.mjs
```

Owner: `sdkwork-iam` maintainers.
