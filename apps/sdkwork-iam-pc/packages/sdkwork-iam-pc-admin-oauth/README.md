# @sdkwork/iam-pc-admin-oauth

IAM backend OAuth administration UI for PC React workspaces.

## Scope

Backend OAuth management per `IAM_OAUTH_SPEC.md`. The primary entries are the
three quick-setup pages:

| Entry | Route | Resources |
|-------|-------|-----------|
| `SdkworkIamOauthProviderConnectionsPage` | `/admin/iam/oauth/providers` | platform catalog cards; configure + enable/disable `iam_oauth_integration` |
| `SdkworkIamOauthMiniProgramAccountsPage` | `/admin/iam/oauth/mini-programs` | `resource_account` rows with kind `mini_program`; one-click `wechat_mini_program` integration |
| `SdkworkIamOauthOfficialAccountsPage` | `/admin/iam/oauth/official-accounts` | `resource_account` rows with kind `official_account`; one-click `wechat` web-authorization integration |

Enabling an integration (or a mini program / official account, which syncs its
integration) makes `oauth.providers.list` return the provider code, so the
login page renders the matching OAuth entry immediately.

### Official account CRUD delegation

Official-account CRUD is owned by `@sdkwork/iam-pc-official-accounts`.
`SdkworkIamOauthOfficialAccountsPage` is a thin shell: it builds that package's
operator-mode controller over this package's backend controller
(`createOperatorTransport` + `DEFAULT_OPERATOR_CAPABILITIES`, see
`src/services/official-account-operator-operations.ts`) and threads it through
`OauthAccountSetupSection`. Every create (one-click integration setup), profile /
credential / configuration write, enable toggle, delete, follow-QR generation,
and verification run is issued by the shared controller; the section keeps only
presentation state and the WeChat console validation rules.

### Official account domain configuration

The official-account drawer's 开发配置 tab mirrors 公众平台 → 设置与开发 →
公众号设置 → 功能设置, which exposes three independent protected-domain sets:

| Set | Cap | Role |
|-----|-----|------|
| JS 接口安全域名 (`jsSecureDomains`) | 5 | Pages that call the JS-SDK; a parent domain covers its legal subdomains. |
| 网页授权域名 (`webAuthDomains`) | 2 | The OAuth 网页授权 callback page must live on one of them. |
| 业务域名 (`businessDomains`) | 3 | Pages that open in WeChat without re-layout; accepts `domain` or `domain/path`. |

- Every row stays inline-editable; the add field stays available at the cap so a
  full set explains the console limit instead of hiding the control. Values are
  normalized to the console's bare-host shape (lower-cased, no scheme, no
  trailing slash) and rejected when they are an IP address, a port, a query
  string, a wildcard, or a short link.
- The account's OAuth callback URL is derived from the **first 网页授权域名**
  (`https://{domain}/auth/oauth/callback`); the legacy `webDomain` remains only
  as the fallback for accounts saved before the set existed. A manually edited
  callback URL wins, but a save is refused when it points outside every
  configured web-authorization domain.
- WeChat issues **one** `MP_verify_*.txt` per official account and expects that
  same file at every configured domain root, so the drawer stores a single
  `verifyFile` and lists every configured domain's
  `https://{domain}/MP_verify_*.txt` address for deployment. A legacy per-domain
  `verifyFiles` array is adopted as that single file on open and retired on the
  next save.
- The console allows only three domain saves per calendar month, so the drawer
  refuses to persist a configuration the console would reject instead of
  spending one of those saves. The domain rules live in
  `src/utils/official-account-domains.ts`.

`SdkworkIamOauthAdminWorkspace` (tabbed console) and `SdkworkIamOauthAdminSettings`
(`view`/`tab` sections) remain exported for advanced/embedded usage but are no
longer mounted in the admin menu.

| Section | Backend operations |
|---------|-------------------|
| Provider catalog | list, create, retrieve, activate/deactivate |
| Integrations | list, create, retrieve, enable/disable, delete |
| OAuth clients | list, create, retrieve, enable/disable, delete |
| OAuth secrets | list, create, delete (write-only secret value) |
| Scope profiles | list, create, activate/deactivate |
| Claim mappings | list, create, activate/deactivate |
| Webhook configs | list, create, enable/disable, verify |
| Flow configs | list, create, enable/disable |
| Surfaces | list, create, enable/disable, delete |
| OAuth policies | list, create, activate/deactivate |
| Tenant bindings | list, create, activate/deactivate |
| Operator platforms | list, create, enable/disable, pre-authorize |
| Diagnostic runs | list, create, retrieve |
| Resource accounts | list, create, enable/disable, verify, refresh authorization, mini program login check |
| Resource authorizations | list, create, activate/deactivate |
| Operational resources | list, create, enable/disable, delete, publish |
| Account links | list, update status (activate / suspend / revoke inline) |
| OAuth grants | list, revoke (`iam.oauth.grants.delete`) |
| Callback events | list (read-only) |
| SDKWork relying party (§4.2) | retrieve + update via `iam.tenantApplications.*` (redacted `clientSecretHash` on read) |

Consumes `@sdkwork/iam-service` (`service.iam.oauth.*`, `service.iam.tenantApplications.retrieve`, `service.iam.tenantApplications.update`) only.

## Module layout

- `pages/OauthAdminWorkspace.tsx` — tabbed workspace shell (SegmentedControl navigation)
- `pages/OauthAdminSettings.tsx` — settings dispatcher (`view`/`tab` → page)
- `pages/oauth-inbound-pages.tsx` — inbound tab and provider/application/login-configuration views
- `pages/oauth-provider-pages.tsx` — authorization-server tab and authorizations view
- `pages/oauth-extended-pages.tsx` — extended tab and governance/resources views
- `pages/oauth-audit-pages.tsx` — audit tab and activity view
- `components/oauth-*-sections.tsx` — per-resource settings sections
- `components/OauthAdminResourceList.tsx` — managed resource lists and operational actions
- `components/OauthAdminManagedList.tsx` — generic lifecycle list component
- `components/oauth-admin-ui.tsx` — shared field/drawer/detail UI primitives
- `hooks/use-oauth-admin-page-state.ts` — page-level list/status state
- `services/oauth-admin-controller.ts` — stateful admin controller
- `types/oauth-admin-types.ts` / `types/oauth-admin-messages.ts` / `utils/oauth-admin-utils.ts` — contracts and helpers
- `utils/official-account-domains.ts` — WeChat 公众号 protected-domain rules (caps, host/path shape, verification-file addresses, callback-domain resolution)
- `i18n/` — en-US/zh-CN message catalog (`iam.oauth.admin` namespace)

## Security

- Provider onboarding creates the integration, client, protected secret, and redirect surface in one backend transaction.
- Secret registration accepts `secretValue` as write-only input; the backend encodes it into the protected secret reference and never returns plaintext.
- Relying-party `clientSecretHash` must be a precomputed argon2id hash; plaintext secrets are never stored.
- Grant revocation calls backend delete to invalidate server-side token lookup (§7).
- Disabling an integration or surface fails closed for inbound OAuth login when tenant policy requires enabled registrations.
- Diagnostic run responses are redacted server-side.

## Verification

Included in `pnpm run test:iam-standard-contracts`.

```bash
pnpm --filter @sdkwork/iam-pc-admin-oauth typecheck
pnpm exec vitest run apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-admin-oauth/tests --config vitest.config.ts --configLoader native --pool vmThreads
```
