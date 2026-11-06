# @sdkwork/iam-uniappx-host

Typed `uni.*` host adapters for the SDKWork IAM uni-app x root, plus the single
request transport the generated TypeScript app SDK is adapted to.

Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §10. This is the only package in
the root that may call `uni.*`, and the only package that may carry the
`VUE3-VAPOR` conditional token.

## Owns

- `createIamUniappxHostAdapters()`: secure storage, platform login code, share,
  network status, and clipboard behind the core contracts.
- `createUniappxRequestTransport()`: the one `uni.request` implementation used by
  the generated app SDK transport adapter. Business packages never call it.
- `createIamFakeHostAdapters()`: deterministic fakes for tests.
- `src/vapor/platform-mode.uts`: the only mode-conditional source file.

## Must not own

Login/session policy, token storage decisions, business API calls, or SDK
construction. Adapter methods normalize platform errors into `IamHostError`
codes (`unsupported`, `permission-denied`, `unavailable`, `cancelled`,
`invalid-state`).

## Verification

```bash
pnpm --filter @sdkwork/iam-uniappx-host typecheck
```
