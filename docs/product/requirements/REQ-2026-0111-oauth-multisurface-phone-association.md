# REQ-2026-0111 Multi-Surface OAuth Login: Phone-Based Account Association

```yaml
id: REQ-2026-0111
owner: sdkwork-iam
status: implemented
type: feature
scope:
  producers:
    - crates/sdkwork-iam-web-adapter
    - crates/sdkwork-routes-iam-app-api
    - crates/sdkwork-routes-iam-backend-api
    - apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-admin-account-binding
    - apis/app-api/iam/sdkwork-iam-app-api.openapi.yaml
  consumers:
    - apps/sdkwork-iam-mini-program
    - apps/sdkwork-iam-h5
    - apps/sdkwork-iam-pc
    - sdks/sdkwork-iam-app-sdk
verification:
  - cargo test -p sdkwork-iam-web-adapter -p sdkwork-routes-iam-app-api
  - cargo test -p sdkwork-routes-iam-app-api --test iam_http_standard
  - pnpm run api:materialize
  - pnpm run sdk:generate:app
  - pnpm --dir apps/sdkwork-iam-pc/packages/sdkwork-iam-pc-admin-account-binding typecheck
```

## Summary

A person who registers on the PC owns one IAM account keyed by a verified
phone number. Before this requirement, every OAuth surface that was not already
linked minted a **new** account: signing in from a WeChat mini program or an
official account produced a second, unrelated user with no phone, so the product
had two identities for one human and no way to reconcile them.

This requirement makes the phone number the association anchor across surfaces,
in the way established multi-channel identity systems do it:

1. an existing external-subject (or union-id) link always wins;
2. a **provider-verified** phone that already owns an account associates the
   external identity with that account, so the PC account is reused;
3. when the phone cannot be trusted, or no phone is present and the tenant
   requires one, the login returns a phone-binding challenge instead of a
   session, and the identity is attached only after the person proves ownership
   of the phone with an SMS code;
4. a phone that already belongs to another account is **never** cloned onto a
   second account — `iam_user.tenant_id + phone` stays unique.

The whole matrix is tenant-configurable and fails closed, and the switches are
exposed in the admin IAM center (账号绑定 → OAuth 登录 → 手机号关联).

## Why the naive version is unsafe

Auto-linking on a provider-supplied phone is an account-takeover vector if the
claim is not trustworthy:

- an OAuth provider that echoes an unverified `phone` claim would let an
  attacker claim any phone number and inherit the account behind it;
- a self-asserted number typed into a form proves nothing at all.

Therefore the flow distinguishes **trusted** provider phones (WeChat
`getPhoneNumber`, or an explicit `phone_number_verified` assertion from the
provider) from unverified claims, and requires an SMS ownership proof for
everything else. Unverified provider phones are no longer written onto
`iam_user.phone` at all.

## Account-association decision matrix

Authority: `sdkwork_iam_web_adapter::decide_oauth_phone_association`.

| Trusted provider phone | Existing account owns the phone | `phoneAssociation.enabled` | `autoLinkVerifiedPhone` | Outcome |
| --- | --- | --- | --- | --- |
| yes | yes | on | on | link the external identity to the existing account and sign in |
| yes | yes | on | off | phone-binding challenge (`existing_account`), link after SMS proof |
| yes | no | on | either | register a new account carrying the verified phone (if auto-registration is on), else reject |
| yes | yes | off | either | phone-binding challenge (`existing_account`) — never a duplicate account |
| no | — | on + `requirePhoneBinding` | either | phone-binding challenge (`missing_phone`) |
| no | — | on, `requirePhoneBinding` off | either | register a new account without a phone (legacy behaviour) |
| no | — | off | either | register a new account without a phone (legacy behaviour) |
| any | any | — | — | reject when OAuth auto-registration is disabled and no account matched |

Fail-closed properties:

- Disabling `phoneAssociation` never *widens* access; it removes silent linking
  and therefore forces the stronger proof path.
- The ownership proof is per-ticket, single-use, and bound to the exact phone
  the code was sent to.
- Silent linking requires the provider to assert verification **and** the
  tenant to allow it; both conditions are stored policy, not deployment flags.

## Policy contract (`iam.account_binding`)

```json
{
  "oauthLogin": {
    "enabled": true,
    "allowedProviders": ["wechat_mini_program", "wechat", "google"],
    "autoRegistrationEnabled": true,
    "phoneAssociation": {
      "enabled": true,
      "autoLinkVerifiedPhone": true,
      "requirePhoneBinding": false
    }
  }
}
```

- `enabled` — master switch for phone-based association.
- `autoLinkVerifiedPhone` — link a provider-verified phone to the account that
  already owns it without an extra proof. Off forces the SMS step.
- `requirePhoneBinding` — force the binding step for OAuth identities that carry
  no trusted phone, so every account ends with a verified phone.

Absent fields default to the safe/legacy values (`enabled: false`,
`autoLinkVerifiedPhone: true`, `requirePhoneBinding: false`), so a policy
document persisted before this requirement keeps its previous behaviour.

Admin surface: `SdkworkIamAccountBindingSettings`
(`@sdkwork/iam-pc-admin-account-binding`) renders the block under
"OAuth 登录"; it is gated by the existing `iam.account_binding_policy.update`
permission, and the server remains the enforcement point.

## Wire contract

### `POST /app/v3/api/oauth/mini_program_sessions`

`WechatMiniProgramSessionCreateCommand` gains an optional `phoneCode` — the
one-time code from the mini program `getPhoneNumber` grant. WeChat only mints it
after the user confirms the prompt and has verified the SIM, so the resulting
number is trusted.

### `POST /app/v3/api/oauth/phone_binding_sessions/verification_code_requests`

`OauthPhoneBindingVerificationCodeRequestCommand`: `continuationToken`, `phone`.
Pre-auth (credential-entry bootstrap); the ticket itself is the authorization.
Rate limited per phone. In the local fixed-code deployment the response carries
`devCode`, mirroring `auth/verification_code_requests`.

### `POST /app/v3/api/oauth/phone_binding_sessions`

`OauthPhoneBindingSessionCreateCommand`: `continuationToken`, `phone`,
`verificationCode` (optional `surfaceCode`). Consumes the ticket exactly once,
verifies the code, then links or registers. Answers with the standard session
payload (or the existing `LOGIN_CONTEXT_SELECTION` challenge for an account
that belongs to several organizations).

### Challenge body (no session tokens)

Returned by `oauth/mini_program_sessions`, `oauth/sessions`, and
`oauth/callbacks/{providerCode}` when a binding step is required:

```json
{
  "code": 0,
  "data": {
    "accessToken": null,
    "authToken": null,
    "refreshToken": null,
    "challengeType": "OAUTH_PHONE_BINDING_REQUIRED",
    "continuationToken": "<single-use ticket>",
    "expiresAt": 1763000000000,
    "phoneAssociation": {
      "reason": "missing_phone",
      "maskedPhone": null,
      "provider": "wechat_mini_program",
      "verificationCodeScene": "OAUTH_PHONE_BINDING"
    }
  }
}
```

`reason` is `missing_phone` (the provider returned no trusted phone) or
`existing_account` (the phone already owns an account and the tenant does not
allow silent linking). `maskedPhone` is a display hint such as `138****8000` and
never the full number of another account.

## Security notes

- The ticket lives in `iam_ephemeral_artifact` (kind `oauth_phone_binding`),
  expires after 10 minutes, and is deleted by the completion call; a replayed
  completion cannot mint a second link or a second session.
- The ticket records the phone the code was sent to (`requestedPhone`), and
  completion rejects a different number.
- The phone is normalised with the same rule as contact binding, so the lookup
  and the stored value cannot disagree in case or separators.
- Successful association is audited as `oauth_phone_binding` on both the
  security-event and audit-event planes, and
  `iam_oauth_account_link.link_source` records `phone_association` (provider
  phone matched an account) versus `oauth_login` / `phone_binding`.
- A proven phone upgrades `iam_user.phone_verified` to 1.
- Verification codes are verified through the same messaging challenge store as
  login (`messaging_verification_challenge`, scene `OAUTH_PHONE_BINDING`); the
  local fixed-code mode additionally requires the code staged on the ticket.

## Non-Goals

- Not an OIDC `id_token` change; the SDKWork authorization-server role is
  untouched.
- No automatic merge of two accounts that already exist with different phones;
  that stays an operator action through the account-link admin surface.
- WeChat payment OAuth and device/QR login are unchanged.
