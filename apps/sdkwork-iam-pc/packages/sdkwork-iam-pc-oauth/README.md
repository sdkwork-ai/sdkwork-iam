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
  ≤2, 业务域名 ≤3) as inline-editable rows: every added domain stays editable
  (blur or Enter commits, an invalid or duplicate edit reverts with an inline
  error), and the add field stays available at the WeChat limit, where adding
  past it explains the cap instead of hiding the control. Domain edits are
  validated as they are added; submit-time errors render inline on the basic tab.
  When the host injects the domain-verification capability, each row also
  uploads the WeChat `MP_verify_*.txt` that the platform serves at the domain
  root, and reports whether the domain belongs to a managed zone.
- **服务器信息** — the deployment's published server egress IPs, each copyable,
  so an operator can paste them into the 公众号 IP allowlist. The host supplies
  the list (the Harness adapter reads `SDKWORK_OFFICIAL_ACCOUNT_SERVER_IPS` from
  its active environment profile); an empty list states that the deployment
  publishes none instead of inventing addresses.

### Enumerated controls use a native select

Account type, message encryption mode, and menu button type render through a
native `<select>` instead of the shared Radix select. The Radix options panel
portals to `document.body`, and inside the Harness management modal that portal
lands outside the dialog's stacking band — the options painted behind the
drawer and a click never reached an item. Native options render in the
platform's own layer and inherit the field's stacking context, which keeps the
drawer operable wherever the panel is embedded.

### Standard WeChat notify URL

The callback URL is server-owned and derived, never typed:

```
{gateway}/iam/v3/api/iam/oauth/official_accounts/{accountId}/wechat/notify
```

The IAM open API (`crates/sdkwork-iam-web-adapter/src/official_account_notify.rs`)
answers the GET URL verification and receives POSTed messages. It verifies the
three-value `signature` (明文模式) or the four-value `msg_signature` over the
`Encrypt` element (安全模式/兼容模式), decrypts with the stored
EncodingAESKey, requires the decrypted receive id to equal the account's AppID,
enforces the five-minute timestamp window and a bounded duplicate seen-set owned
by the router, normalizes the XML into one channel-neutral notification, and acks
`success`. Official accounts and mini programs share the wire and the normalized
shape, so both channels are handled by one engine. The basic tab shows the URL
read-only with a copy action and defers it until a new account has an id. Token
and EncodingAESKey expose 生成 and 复制 links that write a console-accepted value
— a 24-character alphanumeric token (rule: 3–32 letters/digits) and a
43-character EncodingAESKey (rule: exactly 43), drawn from the WeChat alphabet
with `crypto.getRandomValues` and an unbiased modulo — and copy the current
value so the same string can be pasted into the WeChat console.

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
