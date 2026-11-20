# SDKWork IAM API Changelog

Breaking, additive, deprecated, and removed operations are recorded here
(`API_SPEC.md` section 5). The IAM contracts are pre-launch and workspace-internal
(the SDK families are consumed through `workspace:*`), so the breaking set below
is applied with explicit no-compatibility approval instead of a parallel v2
surface (`API_SPEC.md` section 15.8: "Breaking changes require a new version or
explicit no-compatibility approval for pre-launch systems").

## 2026-11-20 — operation-pattern conformance

Every change below is recorded against the `application factory` hardening pass.
The generated SDKs, the contracts catalog, the service facade, and the console
controllers were updated in the same change.

### Changed (breaking)

- `iam.oauth.officialAccountSettings.retrieve` → `oauth.officialAccountSettings.retrieve`
- `iam.oauth.officialAccounts.list` → `oauth.officialAccounts.list`
- `iam.oauth.officialAccounts.create` → `oauth.officialAccounts.create`
- `iam.oauth.officialAccounts.retrieve` → `oauth.officialAccounts.retrieve`
- `iam.oauth.officialAccounts.update` → `oauth.officialAccounts.update`
- `iam.oauth.officialAccounts.delete` → `oauth.officialAccounts.delete`
- `iam.oauth.officialAccounts.customMenus.publish` → `oauth.officialAccounts.customMenus.publish`
- `iam.oauth.officialAccounts.customMenus.rollback` → `oauth.officialAccounts.customMenus.rollback`
- `iam.oauth.officialAccounts.customMenus.sync` → `oauth.officialAccounts.customMenus.sync`

  The redundant `iam.` prefix repeated the tag. The generated client path is
  unchanged (`client.iam.oauth.officialAccounts...`) because the tag still roots
  the resource.

- `providerAccounts.resolve` → `providerAccounts.resolve.retrieve`
- `providerAccounts.setDefault` → `providerAccounts.default`
- `providerAccounts.credentials.reveal` → `providerAccounts.credentials.reveal.retrieve`

  The service facade mirrors the SDK paths: `resolve` is now
  `{ retrieve }`, `setDefault` became `default`, and `credentials.reveal` is now
  `{ retrieve }`.

- `POST /app/v3/api/oauth/authorizations` now answers `201` with `data.item`
  instead of `200` with a bare `data` object.
- `POST /app/v3/api/oauth/authorizations/{authorizationStateId}/completions` now
  answers `201` with `data.item`.
- `POST /app/v3/api/oauth/desktop_sessions` now answers `201` with `data.item`.

  The generated SDK still returns the same object: the schema moved the payload
  under `data.item`, so the item unwrap yields the previous `data` value.

- `POST /app/v3/api/auth/sessions/current/logout` now answers `200` with
  `data.accepted` instead of a bodiless `204` (it is a command, not a delete).

### Changed (non-breaking)

- WeChat payment entry points are marked external vendor wire:
  `wechatPaymentOauth.callback` (`wechat-payment-callback`),
  `wechatPaymentOauth.start` and `wechatPaymentOauth.cashierStart`
  (`wechat-payment-redirect`). They are redirects/callbacks rather than SDKWork
  JSON operations.
