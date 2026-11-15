# Local component specs — `@sdkwork/iam-pc-official-accounts`

This directory is the local standards index for
`@sdkwork/iam-pc-official-accounts`.

Root SDKWork standards remain authoritative. Local component specs can narrow or
document this component, but they must not contradict
[the root standards](../../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `@sdkwork/iam-pc-official-accounts` |
| Type | `react-package` |
| Root | `sdkwork-iam/apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-official-accounts` |
| Domain | `iam` |
| Capability | `official-accounts` |
| Surface | `app` (shared with the backend-admin host through injected transport) |
| Languages | `typescript`, `react` |
| Status | `standard` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- Consumers integrate through the public exports declared there: the transport
  port, the capabilities, the controller factory, the panel, the message
  catalog, and the two transport adapters.

## Surface placement

The capability is the **shared** tier of the IAM OAuth capability:
`iam.oauth.resourceAccounts` (operator administration) and
`iam.oauth.officialAccounts` (self-service maintenance) over one aggregate. The
package never owns a login surface of its own; it renders the official-account
crud both postures consume.

## Cross-repository sharing

The frozen contract (`_scratch/official-account-unification-contract.md` §4)
makes this package the only official-account CRUD implementation. Hosts in other
repositories consume it through their declared workspace dependency; they must
not vendor a copy or bypass package resolution with a bundler alias or tsconfig
path.

## Verification

- `pnpm --filter @sdkwork/iam-pc-official-accounts typecheck`
- `pnpm --filter @sdkwork/iam-pc-official-accounts test`
