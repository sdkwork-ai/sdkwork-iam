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
| `SdkworkIamOfficialAccountsPanel` | Transport-agnostic panel: list, create/edit, enable/disable, delete, custom-menu draft editor, and the Drive-backed logo field (host-injected `driveUploadImageService`). |
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

The account logo is uploaded through Drive, never typed as a URL: the host
service layer builds `createDriveUploadImageService` over its own declared
upload intent and injects it as `driveUploadImageService`. Edit mode uploads
against the account id; create mode parks the pick and the panel flushes it
after the account exists (`DRIVE_SPEC.md` section 18.3). Without the injected
service the field keeps a stored logo visible and states that uploads are
unavailable — there is no URL input and no data-URL fallback.

The create/edit drawer mirrors the WeChat 公众号 console in two tabs:

- **基础信息** — logo, account name, AppID, AppSecret, original id, account type,
  the enable switch, and the message-push server configuration (callback URL
  restricted to http:80 / https:443, Token 3–32 letters or digits,
  EncodingAESKey exactly 43 letters or digits, and the 明文/兼容/安全 encryption
  mode). Each control carries the console rule it must satisfy, plus an inline
  reminder about the IP allowlist.
- **域名配置** — the three protected-domain sets (JS 接口安全域名 ≤5, 网页授权域名
  ≤2, 业务域名 ≤3) as removable rows. Domain edits are validated as they are
  added; submit-time errors render inline on the basic tab. When the host
  injects the domain-verification capability, each row also uploads the WeChat
  `MP_verify_*.txt` that the platform serves at the domain root, and reports
  whether the domain belongs to a managed zone.
- **服务器信息** — the deployment's published server egress IPs, each copyable,
  so an operator can paste them into the 公众号 IP allowlist. The host supplies
  the list (the Harness adapter reads `SDKWORK_OFFICIAL_ACCOUNT_SERVER_IPS` from
  its active environment profile); an empty list states that the deployment
  publishes none instead of inventing addresses.

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
