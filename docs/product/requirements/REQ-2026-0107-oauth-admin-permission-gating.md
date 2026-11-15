# REQ-2026-0107 OAuth Admin Pages: Button-Level Permission Gating

```yaml
id: REQ-2026-0107
owner: sdkwork-iam
status: implemented
type: feature
scope:
  producers:
    - apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-admin-oauth
  consumers:
    - sdkwork-webserver-pc (packages/sdkwork-webserver-pc-admin-iam IamAdminSurface)
verification:
  - vitest on sdkwork-iam-pc-admin-oauth (new gating suites per page)
  - pnpm --dir apps/sdkwork-webserver-pc test
```

## Summary

The four OAuth admin pages render every mutation affordance to every reader of
`iam.oauth.read`; only the server's per-operation permission checks stop a
read-only operator (403). The account-binding surface already models this in
the UI (`canUpdate` on `SdkworkIamAccountBindingSettings`, REQ-2026-0106
follow-up), and `iam-audit` is read-only. This requirement closes the last
gap: the OAuth pages take a structured `permissions` prop and hide or disable
their mutation affordances accordingly.

## Server-Side Permission Codes (authority: backend-api manifest)

| Page | create | update | delete |
| --- | --- | --- | --- |
| Provider connections | `iam.oauth.integrations.create` | `iam.oauth.integrations.update` | `iam.oauth.integrations.delete` |
| Mini-program accounts | `iam.oauth.resourceAccounts.create` | `iam.oauth.resourceAccounts.update` | `iam.oauth.resourceAccounts.delete` |
| Official accounts | same as mini-program accounts, plus `iam.oauth.resourceAccounts.customMenus.update` / `.publish` for the custom-menu editor | | |
| Scan-login settings | `iam.oauth.scanLoginPreviews.create` | `iam.oauth.scanLoginSettings.update` | — |

## Design

1. Each page accepts
   `permissions?: { create?: boolean; update?: boolean; delete?: boolean }`.
   Every member defaults to `true`: callers that do not model permissions keep
   today's behavior (open-closed), and the server remains the enforcement
   point either way.
2. The shared `oauth-account-setup-section` (used by both account pages) takes
   the same prop and gates: the add-account drawer trigger, per-row
   enable/suspend/revoke, delete, and the logo attach actions.
3. The host (`IamAdminSurface`) derives each page's prop from the session
   scope with `can("iam.oauth.<family>.<action>")`, exactly as it already
   does for the users/tenants/roles surfaces.
4. `OauthOfficialAccountCustomMenuPage` additionally disables publish/save
   without `customMenus.update` / `.publish`.

## Non-Goals

- No server-side change: the backend-api manifest already enforces every code
  listed above.
- No new catalog codes: the plane already exists; this is UI discovery of it.

## Update 2026-11-15: account maintenance opens to every signed-in member

Tenant-owned OAuth account maintenance (the unified
`iam_oauth_resource_account` rows and the login integrations, custom menus,
follow QR codes, and login checks the shared official-account / mini-program
panels use) no longer requires a seeded OAuth permission:

- The backend-api manifest maps `iam.oauth.resourceAccounts.*` and
  `iam.oauth.integrations.*` to no required permission; those routes require
  only an authenticated principal. Tenant isolation and the service layer's
  ownership checks remain authoritative, and the host no longer needs to seed
  `iam.oauth.read` / `iam.oauth.manage` before the pages can be used.
- The account pages in cloudrouter/webserver stop deriving capabilities from
  `iam.oauth.resourceAccounts.*` scopes; their UI defaults to open, and the
  server still refuses what the service layer forbids.
- Enterprise OAuth configuration (provider catalog, policies, secrets,
  tenants, scan-login settings) keeps its `iam.oauth.read` / `iam.oauth.manage`
  codes.

