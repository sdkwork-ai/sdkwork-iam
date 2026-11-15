# Local component specs — `@sdkwork/iam-pc-mini-program`

This directory is the local standards index for
`@sdkwork/iam-pc-mini-program`.

Root SDKWork standards remain authoritative. Local component specs can narrow or
document this component, but they must not contradict
[the root standards](../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `@sdkwork/iam-pc-mini-program` |
| Type | `react-package` |
| Root | `sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-mini-program` |
| Domain | `iam` |
| Capability | `mini-program` |
| Surface | `app` (shared with the backend-admin host through injected transport) |
| Languages | `typescript`, `react` |
| Status | `standard` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers integrate through the public exports declared there: the transport
  port, the capabilities, the controller factory, the panel, the message
  catalog, and the operator transport adapters.

## Surface placement

The capability is the **shared** tier of the IAM OAuth resource-account
capability: `iam.oauth.resourceAccounts`
(`iam_oauth_resource_account` with `resource_account_kind = 'mini_program'`)
plus the `wechat_mini_program` login integration. The package never owns a login
surface of its own; it renders the mini-program CRUD both postures consume.

## Relationship to the official-account package

`@sdkwork/iam-pc-official-accounts` and this package are sibling members of the
resource-account component family. They share the architecture — one controller
state machine, one panel, transport adapters, frozen capabilities — and the
aggregate row. They never share a page, a component, or an i18n key; a change to
one is reviewed without assuming the other renders it.

## Cross-repository sharing

Hosts in other repositories consume this package through their declared
workspace dependency; they must not vendor a copy or bypass package resolution
with a bundler alias or tsconfig path.

## Verification

- `pnpm --filter @sdkwork/iam-pc-mini-program typecheck`
- `pnpm --filter @sdkwork/iam-pc-mini-program test`
