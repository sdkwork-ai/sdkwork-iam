# SDKWork IAM uni-app x

`apps/sdkwork-iam-uniappx` is the SDKWork IAM **uni-app x** client application
root. It is an HBuilderX uni-app x project in `vapor` (蒸汽模式) mode and ships
App targets only in this change.

## Authority

- `../../../sdkwork-specs/UNIAPP_X_APP_ARCHITECTURE_SPEC.md` — this architecture's
  root standard, including the vapor/VDOM contract.
- `../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` —
  cross-client root, package taxonomy, route identity, dependency direction.
- `../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md` — generated SDK wiring,
  appbase IAM runtime, one global TokenManager.
- `../../../sdkwork-specs/ICON_SPEC.md` — paired navigation icons.
- Cross-architecture IAM contracts/runtime:
  `../../apps/sdkwork-iam-common/packages/`.

## Layout

- `bootstrap/` — bootstrap only: environment, runtime, SDK clients, IAM runtime,
  host adapters, routes.
- `pages/` — thin root pages (`login`, `account`, `error`) that render package
  components.
- `packages/sdkwork-iam-uniappx-core/` — TokenManager, context store, generated
  app SDK port, request transport contract, route registry.
- `packages/sdkwork-iam-uniappx-auth/` — auth/session state machine, login form,
  `.uvue` login page, `AuthGate`.
- `packages/sdkwork-iam-uniappx-host/` — typed `uni.*` adapters, request
  transport, mode-conditional platform facts.
- `packages/sdkwork-iam-uniappx-shell/` — account header/menu `.uvue` components,
  shell route composition.
- `config/app/` — public runtime profiles; `config/host/` — platform metadata.

## Non-negotiable rules

- Pages are `.uvue`. `.vue` pages are forbidden; the compiler silently skips them.
- `<script setup>` only. Options API, mixins, `this`, and Vuex are forbidden.
- Mode is declared once: `manifest.json` `uni-app-x.vapor` mirrors
  `agent.app.config.json` `runtime.uniappxMode` and
  `specs/uniappx-mode.spec.json`.
- `VUE3-VAPOR` conditional compilation stays in `packages/sdkwork-iam-uniappx-host/`
  and `bootstrap/`.
- Business packages never call `uni.request`, `uni.*`, UTS plugin APIs, or
  platform globals. The only `uni.request` implementation is
  `packages/sdkwork-iam-uniappx-host/src/uni/request-transport.ts`.
- SDK clients are constructed in bootstrap and injected. One global TokenManager
  is shared by every authenticated client.
- Auth/session clearing runs on logout, refresh failure, account switch, and
  tenant switch; it clears tokens, context, sensitive state, and storage bridges.
- Route ids follow `<surface>.<domain>.<capability>.<screen>` and align with the
  other IAM client roots.
- Config is secret-free. Public runtime profiles carry only the public
  application access token.
- The uni-app x compiler does not typecheck; `pnpm typecheck` is the type gate.

## Verification

```bash
node ../../../sdkwork-specs/tools/check-uniappx-architecture.mjs --root .
node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root .
node scripts/verify-uniappx-root.mjs
node --test tests/*.test.mjs
pnpm typecheck
```
