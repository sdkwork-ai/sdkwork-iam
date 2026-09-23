import {
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
  listIamCloudAccountVendorRegions,
  type IamCloudAccountCredentialField,
  type IamCloudAccountSecretlessType,
  type IamCloudAccountVendor,
} from "@sdkwork/iam-contracts";

import type {
  SdkworkIamCloudAccountConsoleMessages,
  SdkworkIamCloudAccountSecretHoldingType,
  SdkworkIamCloudAccountVendorConfigCopy,
} from "../types/cloud-account-console-messages";

/**
 * Which catalogue entry names one field of one credential, for one provider —
 * which one explains an identity shape that has no field at all, which one says
 * what a shape *with* fields asks for, and which one describes the region field.
 *
 * This lives outside the page because it is *the* rule both credential surfaces
 * render, and because a rule stated inside a component is reachable only through a
 * render: the identity-shape × provider matrix below has seventy cells, and a form
 * is the wrong instrument for asserting anything about seventy cells. The page
 * resolves its labels through these functions and so does the gate in `tests/`, so
 * a change to the rule cannot leave the two disagreeing.
 *
 * Every axis that selects copy is resolved here, and each one is selected by the
 * thing that actually decides it: a field label by *field + kind + provider*, a
 * secret-less shape's reason by *shape*, a shape's own sentence by *shape*, and the
 * region hint by *whether the provider publishes any region at all*. A sentence
 * picked by an axis other than its own is how one shape's wording ends up on
 * another shape's box.
 */

/**
 * What the provider calls each field of the credential form.
 *
 * A provider the catalogue does not know reads from `vendorFallbackConfig` rather
 * than from a neighbouring provider's entry: `vendor_code` is only shape-checked
 * server-side, so an account can name a provider this build has never heard of,
 * and borrowing "AccessKey ID" for it would be asserting a fact about a provider
 * nobody here has seen. The platform's own neutral words are the honest answer.
 */
export function vendorConfigFor(
  vendorCode: string | undefined,
  messages: SdkworkIamCloudAccountConsoleMessages,
): SdkworkIamCloudAccountVendorConfigCopy {
  const key = (vendorCode ?? "").trim().toLowerCase();
  const table: Readonly<Partial<Record<IamCloudAccountVendor, SdkworkIamCloudAccountVendorConfigCopy>>> =
    messages.vendorConfig;
  return table[key as IamCloudAccountVendor] ?? messages.vendorFallbackConfig;
}

/**
 * The label of one credential field, in the provider's own words.
 *
 * Three things decide it, and each one owns a different part of the answer: the
 * *identity shape* decides which fields exist (through
 * `iamCloudAccountCredentialFields`), the *kind* decides what the single-blob
 * field means, and the *provider* decides what each of those is called. So the
 * label is resolved from all three rather than from the field plus the vendor
 * copy — a `secret_text` field holds a Cloudflare API token under one shape and a
 * Google service-account JSON key under another, and one word for both was only
 * ever right for one of them.
 *
 * A vendor with no key pair still names one, and a vendor with no first-class page
 * for a kind still names the field: an operator may register that provider under
 * any shape, and a field has to say *something* truthful. See
 * `SdkworkIamCloudAccountVendorConfigCopy`.
 */
export function credentialFieldLabel(
  field: IamCloudAccountCredentialField,
  kind: string | undefined,
  config: SdkworkIamCloudAccountVendorConfigCopy,
  messages: SdkworkIamCloudAccountConsoleMessages,
): string {
  switch (field) {
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID:
      return config.keyIdLabel;
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET:
      return config.keySecretLabel;
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT:
      return secretLabelForKind(kind, config);
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN:
      return messages.credentials.sessionToken;
    default:
      return field;
  }
}

/**
 * The provider's word for the single secret one credential kind carries.
 *
 * Keyed by kind because that is the only thing that can tell two of them apart:
 * `service_account_json` and `secret_text` draw the *same* single field, so a word
 * attached to the field would have to be wrong for one of them. The old shape of
 * this catalogue did exactly that and rendered {@link IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT}'s
 * name for both.
 *
 * Falls back to the provider's `secret_text` wording when the kind is unknown to
 * this build — a credential row written by a newer console may carry a kind this
 * one has never heard of, and the honest answer there is the provider's generic
 * word for an opaque secret rather than an empty field label.
 */
export function secretLabelForKind(
  kind: string | undefined,
  config: SdkworkIamCloudAccountVendorConfigCopy,
): string {
  const labels = config.secretLabel as Readonly<Record<string, string | undefined>>;
  return (
    (kind === undefined ? undefined : labels[kind])
    ?? labels[IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT]
    ?? ""
  );
}

/**
 * Where the operator gets the credential of one kind, in the provider's words.
 *
 * Keyed by kind for the same reason the field label is: the sentence names a
 * concrete page of the provider's console, and those pages differ by kind. "在
 * Google Cloud 控制台的「IAM 和管理 → 服务账号 → 密钥」里创建 JSON 密钥" sitting above
 * an API-key field sends the operator to a page that does not issue what the field
 * wants, which is the failure the hint exists to prevent.
 *
 * Falls back to the provider's generic sentence for an unknown kind, exactly as
 * `secretLabelForKind` does: a newer console may have written a kind this build
 * has never heard of, and the provider's neutral wording is still true there while
 * nothing about a page it does not have is.
 */
export function kindHintForKind(
  kind: string | undefined,
  config: SdkworkIamCloudAccountVendorConfigCopy,
): string {
  const hints = config.hint as Readonly<Record<string, string | undefined>>;
  return (
    (kind === undefined ? undefined : hints[kind])
    ?? hints[IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT]
    ?? ""
  );
}

/**
 * Why this identity shape has nothing to type here — and it is *per shape*, not
 * one sentence for the whole family.
 *
 * The three secret-less shapes are empty for three different reasons, so a shared
 * sentence is wrong twice: it tells the operator holding a SAML assertion that
 * there is nothing to configure, and it never tells the operator registering a
 * service-linked role that the role has to be granted on the provider's side. The
 * reason is what the operator actually acts on, so it is resolved from the shape
 * exactly the way a field label is resolved from the field.
 *
 * A shape this build has never heard of gets the "not covered by this build"
 * sentence rather than one of the three — `account_type` is choice-checked
 * server-side against a list that can grow, and borrowing another shape's reason
 * would assert a fact about a shape nobody here has seen. That is the same rule
 * `vendorConfigFor` follows for an unknown provider.
 */
export function credentialNotNeededFor(
  accountType: string | undefined,
  messages: SdkworkIamCloudAccountConsoleMessages,
): string {
  const table = messages.create
    .credentialNotNeeded as Readonly<Partial<Record<IamCloudAccountSecretlessType, string>>>;
  const reason = accountType === undefined ? undefined : table[accountType as IamCloudAccountSecretlessType];
  return reason ?? messages.create.credentialNotNeededUnknown;
}

/**
 * What the register form says the *selected* identity shape asks for.
 *
 * Keyed by the shape because the shape is the only thing that decides how many
 * boxes are drawn — so it is the only thing a sentence about those boxes can be
 * written for. The paragraph this replaced was keyed by nothing and enumerated all
 * four shapes at once, which made the operator read four configurations to find
 * theirs and read as a description of the wrong one whenever the selected shape was
 * not the first listed.
 *
 * Returns an empty string for a shape that holds no secret here, and for a shape
 * this build has never heard of. Neither is a gap to defend against: the page
 * renders this only where `iamCloudAccountCredentialFields` returned something, and
 * that list is non-empty for exactly the shapes this table is total over. The
 * secret-less shapes get {@link credentialNotNeededFor} instead — the two key sets
 * partition the vocabulary, so neither sentence is reachable through the other's
 * shape.
 */
export function credentialShapeHintFor(
  accountType: string | undefined,
  messages: SdkworkIamCloudAccountConsoleMessages,
): string {
  const table = messages.create.credentialShapeHint as Readonly<
    Partial<Record<SdkworkIamCloudAccountSecretHoldingType, string>>
  >;
  if (accountType === undefined) {
    return "";
  }
  return table[accountType as SdkworkIamCloudAccountSecretHoldingType] ?? "";
}

/**
 * The region hint that matches what the control in front of the operator does.
 *
 * The field is a combobox for a provider that publishes regions and free text for
 * one that does not, and the two need different sentences: the candidate sentence
 * opens by promising a list, which is precisely the thing that does not exist for
 * `cloudflare`, `minio` and `custom`. It is chosen from the same call the field's own
 * `options` come from, so the hint and the control cannot end up describing
 * different fields.
 */
export function regionHintFor(
  vendorCode: string | undefined,
  messages: SdkworkIamCloudAccountConsoleMessages,
): string {
  return listIamCloudAccountVendorRegions(vendorCode).length === 0
    ? messages.create.regionHintNoCandidates
    : messages.create.regionHint;
}

/**
 * What the console calls a credential *already stored*, in the account's own
 * provider's words.
 *
 * The register form and the credential listing describe the same row, and until
 * this existed they resolved its name from two different tables: the form from the
 * provider's words, the listing from the platform's kind vocabulary. The split is
 * invisible for a provider with no opinion — the neutral entries of both tables
 * agree — and shows up exactly where the provider *has* a word. A Google API key
 * was typed into a field called "API 密钥" and then listed as "密钥文本": a word the
 * operator never chose, never saw on the way in, and cannot act on. The rule the
 * field label already follows is the rule the name shown back has to follow too,
 * which is why the blob kinds are resolved through {@link secretLabelForKind}
 * rather than through the kind vocabulary.
 *
 * A key pair is the exception, and deliberately so: it is *two* field names, not
 * one word, so a provider has no single name to lend and the platform's own name
 * for that envelope (from `messages.credentialKind`) is the only honest answer.
 * Lending the pair's first field name would name the envelope after one half of
 * it.
 *
 * Keyed by kind and not by field for the same reason the blob label is: the three
 * single-secret kinds share one field, so a name attached to the field would be
 * wrong for two of them.
 */
export function credentialKindName(
  kind: string | undefined,
  config: SdkworkIamCloudAccountVendorConfigCopy,
  messages: SdkworkIamCloudAccountConsoleMessages,
): string {
  if (kind !== IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR) {
    const blobName = secretLabelForKind(kind, config);
    if (blobName !== "") {
      return blobName;
    }
  }
  const labels = messages.credentialKind as Readonly<Record<string, string | undefined>>;
  return (
    (kind === undefined ? undefined : labels[kind])
    ?? labels[IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR]
    ?? ""
  );
}
