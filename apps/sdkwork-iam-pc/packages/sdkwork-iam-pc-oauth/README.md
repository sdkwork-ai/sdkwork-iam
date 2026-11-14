# @sdkwork/iam-pc-oauth

User-facing IAM PC OAuth surface. It lets the signed-in account maintain its
own official (service) account configuration — the WeChat 公众号 AppID,
display name, account type, original id, logo, message-push endpoint, and the
custom-menu draft — over the IAM app API (`/app/v3/api/iam/oauth/official_accounts`).

This is the **user** surface: rows are scoped by the session's tenant and user
and never participate in tenant login. Tenant-level login resource accounts
remain the backend-admin `iam.oauth.resourceAccounts.*` capability in
`@sdkwork/iam-pc-admin-oauth`.

## Exports

| Export | Purpose |
| --- | --- |
| `SdkworkIamOfficialAccountsPanel` | Transport-agnostic panel: list, create/edit, enable/disable, delete, custom-menu draft editor. |
| `SdkworkIamOfficialAccountsPage` | Page wrapper for the IAM PC app's app-tier route. |
| `createSdkworkIamOfficialAccountsClient(api)` | Adapts `client.iam.oauth.officialAccounts` (or an equivalent transport) to the panel port. |
| `SdkworkIamOfficialAccountsController` | List/query state, mutations, and commit-point publication. |
| `SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG` | zh-CN / en-US copy; wrap the panel in `SdkworkI18nProvider` to localize. |
| `toOfficialAccount`, `readOfficialAccountMenu`, `toOfficialAccountCommand`, `toOfficialAccountCreateCommand` | Record/menu normalization and request bodies used by host adapters. Create carries the WeChat AppID as `wechatAppId`; the app API rejects a top-level `appId` because that key is a reserved client context selector. |

## Usage

```tsx
import {
  createSdkworkIamOfficialAccountsClient,
  SdkworkIamOfficialAccountsController,
  SdkworkIamOfficialAccountsPanel,
  SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG,
} from "@sdkwork/iam-pc-oauth";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react";

const controller = new SdkworkIamOfficialAccountsController(
  createSdkworkIamOfficialAccountsClient(appClient.iam.oauth.officialAccounts),
);

<SdkworkThemeProvider themeColor="tech-blue" themeSelection="dark">
  <SdkworkI18nProvider catalogs={[SDKWORK_IAM_OFFICIAL_ACCOUNTS_I18N_CATALOG]} locale="zh-CN">
    <SdkworkIamOfficialAccountsPanel controller={controller} />
  </SdkworkI18nProvider>
</SdkworkThemeProvider>
```

The panel is a workspace, not a page: it renders no heading of its own and its
header is one toolbar row (search with its action on the left, refresh and add
on the right). A dialog that already names the surface therefore shows that copy
once. `SdkworkIamOfficialAccountsPage` supplies the title and description for a
standalone route.

Secrets are write-only: the panel never receives an AppSecret, message token,
or EncodingAESKey back from the API, and leaving the field blank keeps the
stored value.

## Specs

Package-local standards index: [`specs/README.md`](./specs/README.md). Root SDKWork
specs remain authoritative.

## Verification

```bash
pnpm --filter @sdkwork/iam-pc-oauth typecheck
pnpm --filter @sdkwork/iam-pc-oauth test
```
