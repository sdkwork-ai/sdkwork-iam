# Component Specs

Local, narrowing specs for `sdkwork-iam-provider-account-service`.

## Responsibility

Own the platform-wide service-provider account aggregate: reusable vendor
accounts, the write-only envelope-encrypted credential material attached to
them, and credential resolution for consuming domains.

## Boundaries

- Must not expose plaintext secret material through any API projection; only
  `credentialKind`, `credentialStatus`, `secretFingerprint`, `maskedLabel`, and
  timestamps are projectable.
- Must fail closed: sealing a credential without a configured master secret is
  an error, never a silent plaintext/`base64` fallback.
- Must not own domain-specific provider semantics (bucket layout, endpoint
  policy, retry policy); those stay with the consuming domain.

## Canonical specs

- `../../../../sdkwork-specs/IAM_SPEC.md`
- `../../../../sdkwork-specs/DATABASE_FRAMEWORK_SPEC.md`
- `../../../../sdkwork-specs/RUST_CODE_SPEC.md`
- `../../../../sdkwork-specs/NAMING_SPEC.md`
