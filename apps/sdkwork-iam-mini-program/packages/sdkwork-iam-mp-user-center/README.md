<!-- SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`. -->
# @sdkwork/iam-mp-user-center

| Field | Value |
| --- | --- |
| Role | `capability` |
| Surface | `app` |
| Capability | `user-center` |
| Layer role | `frontend-feature` |
| SDK boundary | `app-api` (authenticated-app-api) |

## Routes

- `app.iam.user-center.profile` → `/user/profile` (`iam.userCenter.profile.title`)
- `app.iam.user-center.password` → `/user/password` (`iam.userCenter.password.title`)


## The Me page

`createIamMpUserCenterMePage` binds the cross-architecture headless core (`@sdkwork/iam-user-center-core`) to a WeChat page: it maps controller state to WXML-bindable data through an injected `setData`, dispatches `data-item-id` tap intents to `onNavigate`/sign-out, and resolves `iam.userCenter.me.*` keys from the package locale fragments.
