# @sdkwork/iam-pc-official-accounts

Shared official (service) account CRUD surface for the unified IAM OAuth
aggregate. It is the one implementation every host consumes — the IAM PC app,
the IAM backend-admin page, and any product or console surface — instead of each
keeping its own 公众号 CRUD.

Accounts are `iam_oauth_resource_account` rows with
`resource_account_kind = 'official_account'`. Administration mode is the
existing `access_mode` column: `self_managed_account` (the maintainer configures
their own AppID) or `operator_authorized_account` (an operator authorized it).
The retired `operator_managed` spelling reads as `operator_authorized_account`.
There is no second aggregate and no second state machine.

This package is **transport-agnostic**: it performs no raw HTTP, assembles no
authentication headers, and imports no host or generated SDK. A host adapts its
own SDK slice and injects it.

## Exports

| Export | Purpose |
| --- | --- |
| `OfficialAccountsTransport` | The port a host implements (list / create / update / delete / config / menu / enable / QR / verification). Optional members are host capabilities the controller refuses with a typed error. |
| `OfficialAccountsCapabilities` | `mode` plus the six switches that decide which sections and actions exist. |
| `createOfficialAccountsController(transport, capabilities)` | The single state machine: list/query state, mutation commit points, and every account action. |
| `OfficialAccountsController` | The controller class (also constructible directly; `pc-oauth` subclasses it). |
| `SdkworkOfficialAccountsPanel` | Capability-gated panel: list, create/edit drawer, the three WeChat domain sets, message-push configuration, custom-menu draft, operator publish, scan-login default switch. |
| `createOperatorTransport(operations)` | Adapts backend `iam.oauth.resourceAccounts.*` actions (or a backend-admin controller that owns them) to the port. |
| `createSelfServiceTransport(api)` | Adapts the app SDK slice `iam.oauth.officialAccounts` (wire unchanged, `wechatAppId` on create) to the port. |
| `SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG` | zh-CN / en-US copy; wrap the panel in `SdkworkI18nProvider` to localize. |
| `toOfficialAccount`, `readOfficialAccountMenu`, `toOfficialAccountCommand`, `toOfficialAccountCreateCommand` | Record/menu normalization and request bodies shared by both adapters. |
| `DEFAULT_OPERATOR_CAPABILITIES`, `DEFAULT_SELF_SERVICE_CAPABILITIES` | The documented capability sets of the two postures. |

## Capability matrix

| Flag | `operator` default | `self-service` default | What it switches |
| --- | --- | --- | --- |
| `editCredentials` | `true` | `true` | AppID / AppSecret fields; off → fields locked with an explicit notice. |
| `publishMenu` | `true` | `false` | The menu drawer's publish action (`publishCustomMenu`). |
| `manageQrLogin` | `true` | `false` | Scan-login default switch and follow-QR / verification actions. |
| `manageDomains` | `true` | `true` | The domain tab (three protected-domain sets) and domain verification. |
| `manageNotify` | `true` | `true` | The message-push server configuration block. |
| `deleteAccount` | `true` | `true` | Delete row action and its confirmation dialog. |
| `mode` | `operator` | `self-service` | Operator adds the self-managed badge and QR/publish actions; self-service adds the server-information tab (published egress IPs and the standard notify URL). |

## Usage

```tsx
import {
  createOfficialAccountsController,
  createSelfServiceTransport,
  SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG,
  SdkworkOfficialAccountsPanel,
  DEFAULT_SELF_SERVICE_CAPABILITIES,
} from "@sdkwork/iam-pc-official-accounts";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

const controller = createOfficialAccountsController(
  createSelfServiceTransport(appClient.iam.oauth.officialAccounts),
  DEFAULT_SELF_SERVICE_CAPABILITIES,
);

<SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
  <SdkworkI18nProvider catalogs={[SDKWORK_OFFICIAL_ACCOUNTS_I18N_CATALOG]} locale="zh-CN">
    <SdkworkOfficialAccountsPanel capabilities={DEFAULT_SELF_SERVICE_CAPABILITIES} controller={controller} />
  </SdkworkI18nProvider>
</SdkworkThemeProvider>;
```

The backend-admin host injects its own operations instead:

```ts
const controller = createOfficialAccountsController(
  createOperatorTransport({
    list: (query) => listResourceAccounts(query),   // backend SDK iam.oauth.resourceAccounts.list
    create: (draft) => createAccountSetup(draft),   // integration → client → account
    updateProfile: (id, profile) => updateAccountProfile(id, integrationIdOf(id), profile),
    updateCredentials: (id, credentials) => updateAccountCredentials(id, credentials),
    updateConfig: (id, config) => updateAccountConfig(id, config),
    remove: (id) => deleteResourceAccount(id),
    setEnabled: (id, enabled) => setResourceAccountEnabled(id, integrationIdOf(id), enabled),
    setQrLogin: (id, enabled) => setResourceAccountQrLogin(id, enabled),
    createFollowQrCode: (id) => createAccountFollowQrCode(id),
    runVerification: (id) => runResourceAccountVerification(id),
  }),
  DEFAULT_OPERATOR_CAPABILITIES,
);
```

A grouped patch (`{ profile, credentials, config, enabled }`) is applied in that
dependency order, so a partial failure never stores half an edit. An ungrouped
panel-shaped patch is grouped by the operator adapter, so the shared panel works
on an operator host without learning the backend action granularity.

## Boundaries

- No raw `fetch`, no manual `Authorization`/`Access-Token` header, no generated
  SDK import: the transport is always injected.
- No React dependency beyond React itself; styling uses the existing Tailwind
  token conventions of `@sdkwork/ui-pc-react`.
- Wire contracts (`app-api` official-account routes, `open-api` notify route,
  `access_mode` vocabulary) are never redefined here.

## Specs

Package-local standards index: [`specs/README.md`](./specs/README.md). Root
SDKWork specs remain authoritative.

## Verification

```bash
pnpm --filter @sdkwork/iam-pc-official-accounts typecheck
pnpm --filter @sdkwork/iam-pc-official-accounts test
```
