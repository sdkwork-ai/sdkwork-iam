# @sdkwork/iam-pc-console-cloud-account

Cloud account center console via `@sdkwork/iam-service`.

Route: `/console/iam/cloud-accounts`

## What it manages

One reusable resource with four ownership levels, resolved narrowest-first
(`user` → `organization` → `tenant` → `platform`) by the server's resolver:

| Level | Who reads it | Who may change it |
|---|---|---|
| `user` | only the person who owns the account | the owner |
| `organization` | members of that organization | a member holding `iam.provider_accounts.manage_shared` |
| `tenant` | every tenant member holding `iam.provider_accounts.read` | a caller holding `iam.provider_accounts.manage_shared` |
| `platform` | every tenant (globally shared) | a platform operator only |

The console offers the three self-service levels. `platform` is never offered as a
choice: the server answers `iam_provider_account_scope_forbidden` for anyone
outside the platform tenant, so showing it would only produce a dead end.

## Why the backend route set

The account center is published **once**, at
`/backend/v3/api/iam/provider_accounts`, and declared `dual-token`. One route set
therefore serves both the end user managing a personal account and an
administrator managing the account a whole organization or tenant resolves
through; which level a caller reaches is decided by the rights it holds, never by
which endpoint it called. That is why there is no app-api mirror and why this
console package reaches the resource through `SdkworkIamService`, whose host is
responsible for injecting a backend client.

This package constructs no HTTP client and declares no backend SDK dependency: the
`pc-console` tier forbids one, and the service facade is the seam that keeps the
console tier free of it.

## Credentials

A credential is a write-mostly envelope. The listing projection carries
`maskedLabel` and `secretFingerprint` for recognition and never the ciphertext, so
no secret can be read back out. Storing into a slot that already holds an active
credential **rotates** it — the previous row is superseded in the same call — and
consumers referencing the account pick up the new value without a configuration
change of their own.

### Why a credential form is not a form of fields

Three different things decide what the register form shows, and each owns a
different part of the answer:

| Decides | What it owns | Where it lives |
|---|---|---|
| the **identity shape** | *which* fields exist | `iamCloudAccountCredentialFields` |
| the **credential kind** | what the single blob in them *means* | `iamCloudAccountTypeCredentialKind` |
| the **provider** | what each of those is *called* | `vendorConfigFor` |

They are separate because the contract's own vocabulary collapses them. Seven
identity shapes map onto four credential kinds, and `service_account` and
`api_key` draw the **identical single field**: a key document and an opaque token
differ in nothing but which kind says so. So a label resolved from the field alone
cannot tell them apart and is wrong for whichever one it does not name, and a
label resolved from the kind alone cannot tell Google's API key from Alibaba
Cloud's — one provider has a word for that blob and the other does not.

A provider this build has never heard of reads from `vendorFallbackConfig` rather
than from a neighbouring provider's entry. `vendor_code` is only shape-checked
server-side, so an account can name a provider nobody here has seen, and lending it
"AccessKey ID" would assert a fact about that provider. The platform's own neutral
words are the honest answer for an unknown provider, an unknown kind, and an
unknown identity shape alike.

### The three shapes that hold no secret

`service_linked_role`, `federated_identity` and `managed_identity` register no
credential with this platform — the provider resolves them out of band — so the
form asks for nothing and `iamCloudAccountCredentialFields` returns an **empty
list rather than a fallback**. That empty list is a finding, not a gap: the form
renders the *reason* in place of the fields, and each of the three gets its own,
because a role is granted on the provider's side, an assertion is exchanged there,
and a managed identity is bound to a resource there. One shared sentence told the
operator holding a SAML assertion that there was nothing to configure at all.

### One row, one name

A stored credential is named on three surfaces — the register form's derived-kind
line, the credential dialog's kind picker, and the detail's credential listing —
and all three resolve through `credentialKindName`. Until they did, the form read
the provider's words while the listing read the platform's, so a Google API key
was typed into a field called "API 密钥" and then listed as "密钥文本": a word the
operator never chose and cannot act on.

A key pair is the deliberate exception. It is *two* field names rather than one
word, so no provider has a single name to lend and the platform's own name for that
envelope is the only honest one; lending the pair's first field name would name the
envelope after half of what it holds.

