# sdkwork-iam-provider-account-service

Platform-wide service-provider account center for SDKWork IAM.

One row in `iam_provider_account` describes a reusable upstream account — for
example one Alibaba Cloud account. Its secret material lives in
`iam_provider_credential` as an AES-256-GCM envelope (`secret_ciphertext` +
`secret_key_id` + `secret_algorithm` + `secret_fingerprint`), so no plaintext
secret is ever persisted or returned by an API projection.

Consuming domains reference the account by id instead of embedding their own
credential copy. Object storage (`sdkwork-drive`) is the first consumer; the
`capability_codes` column records which capabilities an account can serve so
further consumers (compute, CDN, DNS, …) reuse the same account.

## Modules

- `model`: provider account and credential domain types.
- `envelope`: fail-closed AES-256-GCM envelope sealing/opening plus fingerprinting.
- `repository`: PostgreSQL persistence and credential resolution.

## Verification

```bash
cargo test -p sdkwork-iam-provider-account-service
```

See `../../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md` and `../../sdkwork-specs/IAM_SPEC.md`.
