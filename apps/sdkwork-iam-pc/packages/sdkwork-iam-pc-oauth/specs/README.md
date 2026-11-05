# Local component specs — `@sdkwork/iam-pc-oauth`

This directory is the local standards index for `@sdkwork/iam-pc-oauth`.

Root SDKWork standards remain authoritative. Local component specs can narrow or
document this component, but they must not contradict
[the root standards](../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `@sdkwork/iam-pc-oauth` |
| Type | `react-package` |
| Root | `sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-oauth` |
| Domain | `iam` |
| Capability | `oauth` |
| Surface | `app` |
| Languages | `typescript`, `react` |
| Status | `standard` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers integrate through the public exports declared there: the panel, the
  page wrapper, the client adapter, the controller, and the message catalog.

## Surface placement

The capability is the **app** tier of the IAM OAuth capability:
`app.iam.oauth.official-accounts`. It is not the backend-admin login resource
surface (`admin.iam.oauth.providers`, `iam.oauth.resourceAccounts.*`), and it is
not the console tier.

## Verification

- `pnpm --filter @sdkwork/iam-pc-oauth typecheck`
- `pnpm --filter @sdkwork/iam-pc-oauth test`
