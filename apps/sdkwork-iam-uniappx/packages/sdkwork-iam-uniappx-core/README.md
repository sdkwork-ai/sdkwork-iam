# @sdkwork/iam-uniappx-core

Framework-neutral IAM runtime contracts for the SDKWork IAM uni-app x root
(`apps/sdkwork-iam-uniappx`).

Authority: `sdkwork-specs/UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §3, §7, §9, §10.

## Owns

- `IamTokenManager`: the one global token/session holder shared by every
  authenticated app-api SDK client and by the appbase IAM runtime.
- `IamContextStore`: tenant/organization/user context propagated to SDK calls.
- `IamRequestTransport`: the request boundary the generated TypeScript app SDK
  is adapted to. The `uni.request` implementation lives in
  `@sdkwork/iam-uniappx-host`; this package never calls `uni.*`.
- `IamAppSdkAuthPort` and `IamUniappxAppSdkClient`: the typed generated-SDK port
  consumed by `@sdkwork/iam-uniappx-auth`.
- `IAM_ROUTE_IDS` and the route registry/projection used to assemble
  `pages.json`.

## Must not own

Pages, `.uvue` components, generated SDK clients, host implementations, or raw
HTTP calls.

## Verification

```bash
pnpm --filter @sdkwork/iam-uniappx-core typecheck
```
