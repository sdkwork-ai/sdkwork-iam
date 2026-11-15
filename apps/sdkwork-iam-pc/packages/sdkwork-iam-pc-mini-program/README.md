# @sdkwork/iam-pc-mini-program

Shared mini-program account CRUD surface for the unified IAM OAuth aggregate.
It is the one mini-program implementation every host consumes — the IAM
backend-admin page (mounted by cloudrouter and webserver), the BirdCoder desktop
client, and any product or console surface — instead of each keeping its own
小程序 CRUD.

Accounts are `iam_oauth_resource_account` rows with
`resource_account_kind = 'mini_program'`. The WeChat AppSecret is never stored
on that row: saving an account also creates (or reuses) the
`wechat_mini_program` login integration, whose OAuth client owns the secret
(`iam_oauth_client` → `iam_oauth_secret`). `provider_config_json` carries only
non-identity settings. The account identity is
`(tenant_id, provider_code, resource_account_kind, provider_account_id)`.

This package is **transport-agnostic**: it performs no raw HTTP, assembles no
authentication headers, and imports no host or generated SDK. A host adapts its
own SDK slice and injects it.

It is intentionally independent from `@sdkwork/iam-pc-official-accounts`: the
two features share the aggregate, the controller/panel/transport architecture,
and the capability discipline, never a page, a component, or an i18n key.

## Exports

| Export | Purpose |
| --- | --- |
| `MiniProgramTransport` | The port a host implements: `list` / `create` / `update` / `delete` / `setEnabled`, plus an optional `runLoginCheck`. |
| `MiniProgramCapabilities` | `mode` plus `editCredentials`, `runLoginCheck`, `setEnabled`, `deleteAccount`. |
| `createMiniProgramController(transport, capabilities)` | The single state machine: list/query state, mutation commit points, capability refusal. |
| `SdkworkMiniProgramPanel` | Capability-gated panel: account list, create/edit drawer (identity / credentials / login-check sections), enable switch, delete confirmation. |
| `createMiniProgramOperatorTransport(operations)` | Adapts a host's own resource-account actions (the IAM backend-admin controller in cloudrouter/webserver) to the port, applying a patch in dependency order. |
| `createMiniProgramBackendOperations(port)` | Adapts the generated backend `iam.oauth.resourceAccounts.*` + `iam.oauth.integrations.*` slice directly, including the one-click integration → account setup. `createMiniProgramBackendTransport(port)` composes both. |
| `SDKWORK_MINI_PROGRAM_I18N_CATALOG` | zh-CN / en-US copy; wrap the panel in `SdkworkI18nProvider` to localize. Without a provider the zh-CN default resolves. |
| `toMiniProgramAccount`, `toMiniProgramPage`, `isMiniProgramAccountRecord` | Tolerant camelCase/snake_case record normalization shared by every adapter. |
| `DEFAULT_OPERATOR_CAPABILITIES`, `DEFAULT_SELF_SERVICE_CAPABILITIES` | The documented capability sets of the two postures. |

## Capability matrix

| Flag | `operator` default | `self-service` default | What it switches |
| --- | --- | --- | --- |
| `editCredentials` | `true` | `true` | Create action, AppID / AppSecret fields, and the provider-configuration fields. |
| `runLoginCheck` | `true` | `false` | The login-check action and its status section. |
| `setEnabled` | `true` | `true` | The row's enable switch. |
| `deleteAccount` | `true` | `true` | Delete row action and its confirmation dialog. |
| `mode` | `operator` | `self-service` | The administration posture, for hosts that render it. |

The controller enforces the same flags: a call outside the mounted capability
set throws `MiniProgramCapabilityError`, and a transport without the requested
operation throws `MiniProgramUnsupportedError`. Neither fails silently.

## Usage

Host with its own resource-account actions (the IAM backend-admin controller):

```tsx
import {
  createMiniProgramController,
  createMiniProgramOperatorTransport,
  DEFAULT_OPERATOR_CAPABILITIES,
  SdkworkMiniProgramPanel,
} from "@sdkwork/iam-pc-mini-program";

const controller = createMiniProgramController(
  createMiniProgramOperatorTransport({
    list: (query) => listMiniProgramPage(query),
    create: (draft) => createAccountSetup("mini_program", draft),
    updateProfile: (id, profile) => updateAccountProfile(id, integrationIdOf(id), profile),
    updateCredentials: (id, credentials) => updateAccountCredentials(id, credentials),
    updateConfig: (id, config) => updateAccountConfig(id, config),
    remove: (id) => deleteResourceAccount(id),
    setEnabled: (id, enabled) => setResourceAccountEnabled(id, integrationIdOf(id), enabled),
    runLoginCheck: (id) => runResourceAccountMiniProgramLoginCheck(id),
  }),
  DEFAULT_OPERATOR_CAPABILITIES,
);
```

Host that builds the generated backend client itself:

```ts
import {
  createMiniProgramBackendTransport,
  createMiniProgramController,
  DEFAULT_OPERATOR_CAPABILITIES,
} from "@sdkwork/iam-pc-mini-program";

const controller = createMiniProgramController(
  createMiniProgramBackendTransport(client.iamOauth.iam.oauth),
  DEFAULT_OPERATOR_CAPABILITIES,
);
```

Rendering:

```tsx
<SdkworkI18nProvider catalogs={[SDKWORK_MINI_PROGRAM_I18N_CATALOG]} locale="zh-CN">
  <SdkworkMiniProgramPanel
    capabilities={DEFAULT_OPERATOR_CAPABILITIES}
    controller={controller}
  />
</SdkworkI18nProvider>
```

## Known Limitations and Deferred Work

- The backend resource-account list has no channel filter, so
  `createMiniProgramBackendOperations` reads one bounded 200-row page and
  paginates the mini-program rows client-side. A tenant with more resource
  accounts than that bound needs the generated cursor page.
- The generated one-click setup does not carry the surface row's
  `mini_program_environment` / `mini_program_release_channel`. A draft that sets
  them is refused with `MiniProgramUnsupportedError` instead of having the
  values dropped; a host that needs them writes the surface itself.
- The AppID is immutable after create: `MiniProgramPatch` carries no AppID, so
  the drawer shows it read-only in edit mode.

## Boundaries

- No raw `fetch`, no manual `Authorization`/`Access-Token` header, no generated
  SDK import: the transport is always injected.
- Styling uses the existing Tailwind token conventions of `@sdkwork/ui-pc-react`.
- Wire contracts (`app-api` mini-program session routes, `open-api`, the
  `iam_oauth_resource_account` aggregate) are never redefined here.

## Specs

Package-local standards index: [`specs/README.md`](./specs/README.md). Root
SDKWork specs remain authoritative.

## Verification

```bash
pnpm --filter @sdkwork/iam-pc-mini-program typecheck
pnpm --filter @sdkwork/iam-pc-mini-program test
```
