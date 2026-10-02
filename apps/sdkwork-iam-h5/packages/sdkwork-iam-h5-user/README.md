# @sdkwork/iam-h5-user

H5 user-center capability for IAM: the slot-based mobile **"Me" page** (我的),
current-user profile retrieval and update, and password change through
`@sdkwork/iam-service`.

## The Me page

`SdkworkIamH5UserCenterMeScreen` renders hero, session context card,
navigation menu, sign-out action, and loading/error states. Every region is a
named appearance slot with a default renderer (`Page`, `Header`, `Hero`,
`ContextCard`, `Menu` + `MenuItem`, `Actions`, `States`, `Footer`), so hosts
re-skin or extend regions without forking the page.

Theming follows `THEME_DARKMODE_SPEC.md`: component tokens
(`--sdk-comp-iam-me-*`) are defined once in
[`@sdkwork/iam-user-center-core`](../../../sdkwork-iam-common/packages/sdkwork-iam-user-center-core)
with light and dark values over the host `--sdk-color-*` semantic layer; the
`sdkwork` preset adapts to the host mode root automatically, `midnight` and
`paper` are explicit brand presets, and `appearance.theme` tokens become CSS
custom properties on the page root. This package never resolves color mode.

Page state comes from the headless controller
(`createSdkworkIamH5UserCenterMeController` / `useSdkworkIamH5UserCenterMeController`)
over an injected `SdkworkIamService`; the screen never constructs SDK clients.
Menu items dispatch intents: `screen` intents go to `onNavigate(screenId)`,
the sign-out command flows through `controller.signOut()` and `onSignedOut`.

## Exports

- `createSdkworkIamH5UserController`
- `SdkworkIamH5UserProfileScreen`
- `IAM_H5_USER_ROUTES`
- `SdkworkIamH5UserCenterMeScreen` plus its appearance/slot types and defaults
- `useSdkworkIamH5UserCenterMeController`
- user-center core type re-exports (`types/user-center-types.ts`)

## i18n

Fragments: `src/i18n/<locale>/iam/h5/user.ts` (`iam.user.*`) and
`src/i18n/<locale>/iam/h5/user-center.ts` (`iam.userCenter.me.*`), `zh-CN` and
`en-US`. The Me screen accepts an active-locale `messages` fragment and
defaults to `en-US` (I18N_SPEC.md §6.1).
