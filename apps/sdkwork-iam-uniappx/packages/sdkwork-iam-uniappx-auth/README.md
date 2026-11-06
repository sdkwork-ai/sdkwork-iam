# @sdkwork/iam-uniappx-auth

Headless IAM authentication for the SDKWork IAM uni-app x root, plus the `.uvue`
login and AuthGate components that render it.

Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §2, §5, §6, §9.

## Owns

- `createIamAuthSessionMachine`: the auth/session state machine over
  `IamAppSdkAuthPort`. It clears the global token manager, the context store,
  the sensitive-state hook, and the session snapshot on logout, refresh failure,
  account switch, and tenant switch.
- `createIamLoginForm`: headless credential-form validation used by the `.uvue`
  login page and by embedding applications.
- `AuthGate.uvue`: authenticated/signed-out gate.
- `pages/login/index.uvue`: the login page component. It is presentational: it
  receives `submitting`/`errorMessage` and emits `submit`, so no SDK transport is
  constructed in the view layer.

## Must not own

SDK client construction, raw HTTP, host platform calls, or shell navigation.

## Verification

```bash
pnpm --filter @sdkwork/iam-uniappx-auth typecheck
node --test tests/auth-session-machine.test.mjs
```
