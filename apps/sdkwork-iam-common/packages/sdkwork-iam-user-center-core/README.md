# @sdkwork/iam-user-center-core

Cross-architecture **headless core for the user-center "Me" page** (the
"我的" tab every mobile surface ships). H5 React, mini-program, and future
shells share the view models, canonical menu, theme-token contract, and page
state controller defined here; each surface renders them with its own
primitives.

## Public surface (`src/index.ts`)

- **View models** (`types/me-view-model.ts`): `SdkworkIamUserCenterMeProfile`,
  `...MeContextSummary`, `...MeMenuSection`/`...MeMenuItem`/`...MeMenuIntent`,
  `...MeState`, canonical screen ids, and the canonical
  `SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS` catalog keys
  (`iam.userCenter.me.*`).
- **Theme contract** (`theme/me-theme-tokens.ts`): the
  `--sdk-comp-iam-me-*` component-token layer with dual-mode defaults
  (`THEME_DARKMODE_SPEC.md`), the `sdkwork | midnight | paper` presets, CSS
  sheet builder, and typed token-override helpers. Values live only in this
  token definition file; mode is never resolved here.
- **Controller** (`controller/me-controller.ts`):
  `createSdkworkIamUserCenterMeController({ service, menuSections?, requestTimeoutMs? })`
  — a subscribe/`getState` state machine (`idle → loading → ready | error`)
  over an injected `SdkworkIamService` (`iam.users.current.*`,
  `auth.sessions.current.*`), with bounded requests, abort-aware updates,
  host menu overrides, and a sign-out path that clears every sensitive page
  field (APP_MOBILE_REACT_UI_SPEC.md §6).

## Boundaries

- No React, no DOM, no SDK client construction: surfaces inject the service
  and map state/slots onto their own rendering layer.
- Copy is never hardcoded here; menu items carry i18n message keys the owning
  surface resolves through its locale fragments (I18N_SPEC.md §6.1).

## Verification

```bash
pnpm --filter @sdkwork/iam-user-center-core typecheck
pnpm exec vitest run apps/sdkwork-iam-common/packages/sdkwork-iam-user-center-core
```
