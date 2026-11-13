# REQ-2026-0112 IAM Registration/Login Hardening: Session, Credential and Lockout Integrity

```yaml
id: REQ-2026-0112
owner: sdkwork-iam
status: implemented
type: bugfix
scope:
  producers:
    - crates/sdkwork-routes-iam-app-api
    - crates/sdkwork-iam-web-adapter
    - apps/sdkwork-iam-common/packages/sdkwork-iam-contracts
    - apps/sdkwork-iam-common/packages/sdkwork-iam-service
    - apis/app-api/iam/sdkwork-iam-app-api.openapi.yaml
  consumers:
    - apps/sdkwork-iam-pc
    - apps/sdkwork-iam-h5
    - apps/sdkwork-iam-mini-program
    - sdks/sdkwork-iam-app-sdk
verification:
  - cargo test -p sdkwork-routes-iam-app-api --lib
  - cargo check -p sdkwork-routes-iam-app-api -p sdkwork-iam-web-adapter --features sqlite
  - cargo test -p sdkwork-routes-iam-app-api --test iam_http_standard
  - pnpm run api:materialize && pnpm run sdk:generate:app
  - node vitest run apps/sdkwork-iam-common/packages
```

## Summary

An audit of the IAM registration/sign-in surface found nine defects, each fixed
here without changing the public shape of any operation beyond additive fields.
They fall into three groups: session lifecycle integrity, credential/lockout
correctness, and "switch that does nothing" policy gaps.

## Defects And Fixes

### 1. `deviceId` was accepted but only honoured by one path (session leak)

`create_session_record_with_device` exists precisely so that a sign-in replaces
the previous session **of that application on that device** rather than every
session of the application. Only the desktop-session handler passed a device id;
password login, code login, registration, OAuth, mini program, phone binding and
login-continuation completion all called `create_session_record` (device `None`).

Because the revocation predicate is `device_id IS NOT DISTINCT FROM $4`, a
`None` device id revokes only sessions that also have no device — so re-signing
in on the same device accumulated live sessions instead of replacing one.

Fix: `LocalSession` carries `device_id`; every interactive login accepts
`deviceId` (`resolve_request_device_id`) and threads it through
`create_authenticated_session_response` / `create_authenticated_session_or_challenge`;
the pending login continuation and the pending phone-binding ticket store it so
the challenge branches keep it; the session payload echoes it.

### 2. Refresh rotation dropped the device binding

`refresh_session` reused `create_session_record` (device `None`), so the very
first token refresh silently moved a device-bound session into the no-device
slot and escaped every later same-device revocation.

Fix: `SESSION_REFRESH_SELECT` and the dual-token session query select
`s.device_id`; `refresh_session` rotates through
`create_session_record_with_device` with the claimed session's device.

### 3. A password change left every other session alive

`PATCH /app/v3/api/auth/sessions/current` (password update) rotated the
credential but kept all existing sessions, so a stolen session outlived the
rotation that was supposed to kill it. Password **reset** already revoked.

Fix: after a successful change the handler calls `revoke_sessions_except`
keeping only the session that performed the change, and records
`users.current.password.update` with `sessionsRevoked: true`.

### 4. Unknown-account password login skipped the hashing work (enumeration)

`authenticate_password` returned immediately when no user matched, while the
wrong-password branch spent a full Argon2 verification. The resulting timing
difference exposes which accounts exist.

Fix: `spend_absent_account_verification` performs one verification against a
hash of per-process random entropy (`timing_equivalent_password_hash`), so no
candidate can ever verify and both branches cost the same work.

### 5. Lockout never reset after expiry (one attempt forever)

`failed_attempts` kept its value after `locked_until` elapsed. The next mistake
computed `failed_attempts + 1`, which was already at the threshold, and re-locked
the account for a full window — permanently limiting a user who once tripped the
lock to a single attempt per lockout period.

Fix: `failed_attempt_baseline` restarts the run at zero when a lock had expired;
applied to both the PostgreSQL and the SQLite authentication paths.

### 6. `contactBinding.requireVerification` was a dead switch

The admin toggle existed and was stored, but the app-api always demanded a code:
turning the requirement off made every bind attempt fail with
`iam_verification_code_required`.

Fix: `bind_contact_for_user` takes the code as optional plus the policy flag. A
supplied code is always honoured and marks the contact verified; an absent code
is accepted only when the operator disabled the requirement, and the contact is
then stored **unverified** — so it can never satisfy code login or OAuth phone
association, which both test the verified flag.

### 7. Unlinking could strand an account; contact unbind ignored OAuth

`DELETE /app/v3/api/oauth/account_links/{id}` had no last-login-method guard, so
a WeChat-only user could unlink their only way to sign in. Meanwhile
`ensure_contact_can_be_removed` counted only password + contacts, so a user who
still had an OAuth login could not remove a contact.

Fix: a single `count_remaining_login_methods(pg, user, exclude_contact,
exclude_account_link_id)` counts password, present contacts and active OAuth
links; both the contact unbind and the OAuth unlink require at least one method
to remain (OAuth unlink answers `409 iam_last_login_method_required`).

### 8. Disabled identities blocked registration with a 500

`identity_exists` ignored accounts whose status is `disabled`, while
`iam_user (tenant_id, email|phone)` is unique regardless of status. Registering
with a disabled account's phone passed the pre-check and then failed the unique
index as an internal error.

Fix: the check counts every non-deleted account, so the caller gets the normal
`409 iam_account_already_exists`.

### 9. OAuth phone association could resurrect a disabled account

A provider-verified phone owned by a disabled/suspended account matched no
active user, so the flow tried to create a new account on that phone: a unique
index violation at best, an identity resurrection through a different login
surface at worst.

Fix: `phone_owner_status` + `reject_phone_owned_by_unavailable_account` let the
direct OAuth path reject the sign-in, and the phone-binding completion rejects
it with `403 iam_oauth_account_unavailable`.

### 10. The `sqlite` runtime did not compile and lost QR fields

`LocalQrSession`'s initializer in `ephemeral_pool.rs` was missing `follow_login`
and `qr_image_url`, so `--features sqlite` failed to build; its payload
serializer/deserializer also dropped both fields, so official-account
follow-login and the server-rendered QR image could never round-trip in the
SQLite runtime even after compiling.

Fix: the initializer and both payload directions now mirror the PostgreSQL
payload in `ephemeral.rs` field for field.

### 11. Organization upserts still targeted the pre-0027 primary key

Migration `0027_iam_organization_tenant_scoped_identity` re-keyed
`iam_organization` from `id` to `(tenant_id, id)`. Two Postgres fixtures still
upserted with `ON CONFLICT (id)`, which now throws
`there is no unique or exclusion constraint matching the ON CONFLICT
specification` — so every backend integration test and the app-api directory
integration test aborted while seeding.

Fix: both fixtures upsert with `ON CONFLICT (tenant_id, id)`. (Production code
was audited: its remaining `ON CONFLICT (id)` clauses target
`iam_tenant`, `iam_tenant_application`, `iam_application_template`,
`iam_oauth_account_link`, `iam_module_registry_snapshot` and
`iam_catalog_materialization`, all of which still have a global `id` key.)

## Behaviour Notes

- `deviceId` is optional everywhere. Omitting it keeps the legacy single-slot
  behaviour (only device-less sessions are revoked), so existing clients are
  unaffected.
- A password change signs out other devices; clients should treat a later `401`
  on another device as expected and re-authenticate.
- An unverified bound contact is still a valid password-login identifier but is
  not accepted for code login or OAuth phone association.

## Non-Goals

- No new MFA surface; `AuthLevel` assignment is unchanged.
- No absolute session-lifetime cap was introduced; refresh keeps the existing
  sliding-window semantics.
- No change to the OAuth authorization-server role or the relying-party model.
