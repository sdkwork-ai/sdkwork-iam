import {
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_ENVIRONMENTS,
  IAM_CLOUD_ACCOUNT_KNOWN_CAPABILITY_CODES,
  IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES,
  IAM_CLOUD_ACCOUNT_TYPES,
  type IamCloudAccountRegionCodesOf,
  type IamCloudAccountRegionVendor,
  type IamCloudAccountSecretlessType,
  type IamCloudAccountSingleSecretCredentialKind,
  type IamCloudAccountVendor,
} from "@sdkwork/iam-contracts";

/**
 * One label per code of a closed server vocabulary.
 *
 * A `Record` over the contract's own tuple rather than an open bag of strings:
 * the five vocabularies below are `as const` in `@sdkwork/iam-contracts`, so
 * adding a code there turns every catalog that has not been translated into a
 * compile error instead of a raw machine code rendered into a Chinese console.
 * That is the whole point of routing them through the message contract — the
 * page's labels and the server's vocabulary cannot drift apart silently.
 *
 * Codes *outside* the tuple still have to render (the server accepts more
 * vendors than the console offers, and an account may carry a credential kind
 * the picker does not list), so the label helpers fall back to the raw code
 * rather than to an empty string. See `vocabularyLabel` in the page.
 */
export type SdkworkIamCloudAccountVocabularyLabels<Code extends string> = Record<Code, string>;

/**
 * The identity shapes that *do* hold a secret here — the complement of the
 * contract's own secret-less set, derived from it rather than listed a second
 * time.
 *
 * The register form words the credential group *per shape*, and the two halves of
 * that wording are not the same set: a shape that holds a secret gets a sentence
 * about the boxes it draws, while a shape that holds none gets the reason it draws
 * nothing (`credentialNotNeeded`) — so the two vocabularies have to partition the
 * seven shapes rather than overlap.
 *
 * Derived with `Exclude` because the contract already pins
 * `IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES` to the shape→kind bridge in *both*
 * directions, which makes it a subset of `IAM_CLOUD_ACCOUNT_TYPES` — and hence
 * makes this exactly the rest of them. A shape added to the contract therefore
 * lands on one side or the other with no third case, and a catalogue that has not
 * worded the side it landed on fails to compile instead of rendering the other
 * side's sentence.
 */
export type SdkworkIamCloudAccountSecretHoldingType = Exclude<
  (typeof IAM_CLOUD_ACCOUNT_TYPES)[number],
  IamCloudAccountSecretlessType
>;

/**
 * One label per credential kind that carries its whole secret in one block of
 * text.
 *
 * A `Record` over the contract's own tuple rather than one `secretTextLabel`
 * string per provider, because those kinds share the single `secret_text`
 * *field* while meaning different things in it. One string could not be right for
 * more than one of them, and it was wrong for most: a provider naming its API
 * token (Cloudflare: `API 令牌`) is not naming its service-account key document,
 * and keying the label by provider alone made eight providers out of ten render
 * `密钥文本` for both `service_account` and `api_key` — two identity shapes the
 * contract treats as different, shown with one word.
 *
 * Exhaustive over the kinds that have no second half, so a provider that has not
 * been translated is a compile error rather than a field label that silently
 * reads as the fallback for an identity shape the operator chose deliberately.
 */
export type SdkworkIamCloudAccountSecretLabels = Record<
  IamCloudAccountSingleSecretCredentialKind,
  string
>;

/**
 * Where the operator creates each credential kind, on the provider's own console.
 *
 * Keyed by kind and not by provider alone, for the same reason the labels are: a
 * hint reading "创建 JSON 密钥" is wrong sitting above an API-key field, and the
 * pair's hint (`AccessKey 管理`) names a page that has nothing to do with a
 * service-account key document.
 *
 * Exhaustive over all four kinds. A provider with no first-class page for a kind
 * says so with the platform's own neutral sentence rather than by omitting the
 * entry — an absent entry would render as an empty gap, which reads as a form that
 * forgot to explain itself.
 */
export type SdkworkIamCloudAccountKindHints = Record<
  (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number],
  string
>;

/**
 * What one provider calls the concrete configuration of an account.
 *
 * The credential's *shape* is contract-wide — `access_key_pair` is one kind for
 * every provider, and `iamCloudAccountCredentialFields` decides whether a
 * registration asks for a pair or for one blob — but its *wording* is not, and
 * neither is the account's own identifier on the provider's side. Alibaba Cloud
 * prints `AccessKey ID`, Tencent Cloud prints `SecretId`, Azure prints
 * `Application (client) ID`, MinIO prints `Secret Key`; asking an operator for a
 * field their provider's console does not have named that way is how a key ends
 * up pasted into the wrong box. So each provider states its own words here and
 * the form renders what the operator will actually see on the other side.
 *
 * A provider whose credential is not a pair still names one, and it names it with
 * the platform's own generic wording rather than with an invented vendor term:
 * `service_account` and `api_key` have no second half in reality, but an operator
 * may still register that provider under a key-pair identity shape, and the field
 * has to say *something* truthful. Reusing the generic words keeps the page from
 * claiming a vendor has a concept it does not.
 *
 * Every entry is keyed by the *kind* it names wherever the kinds disagree, which
 * is the whole point: the identity shape selects the kind, the kind selects the
 * fields, and the provider selects the words for those fields. A provider whose
 * word is the same for two kinds states it once per kind, so the mapping stays
 * total and no shape falls back to another shape's wording.
 */
export interface SdkworkIamCloudAccountVendorConfigCopy {
  /**
   * What the provider calls the account identifier it issues for the account
   * itself — AWS's account ID, Azure's subscription ID, a project ID.
   */
  accountIdLabel: string;
  accountIdPlaceholder: string;
  /** Where to create the credential, per kind, on the provider's own console. */
  hint: SdkworkIamCloudAccountKindHints;
  /** The provider's name for the non-secret half of a key pair. */
  keyIdLabel: string;
  /** The provider's name for the secret half of a key pair. */
  keySecretLabel: string;
  /** The provider's name for the single secret of each single-secret kind. */
  secretLabel: SdkworkIamCloudAccountSecretLabels;
}

/**
 * Copy for the cloud account center.
 *
 * The page is the one console surface whose resource lives in another module's
 * contract (`iam.provider_accounts`), so the vocabulary it *offers* comes from
 * `@sdkwork/iam-contracts` while the words it *renders* live here. Keeping both
 * translations behind one interface is what stops the two from drifting: a key
 * added to `en-US` without its `zh-CN` twin fails to compile.
 */
export interface SdkworkIamCloudAccountConsoleMessages {
  /**
   * Subtitle the platform operator's admin surface shows instead of
   * `subtitle`. The two surfaces render the same page over the same route, so
   * the copy that differs between them lives beside the copy that does not.
   */
  adminSubtitle: string;
  actions: {
    cancel: string;
    /** Dismisses the read-only detail dialog; "cancel" would be a lie there. */
    close: string;
    create: string;
    delete: string;
    /** Opens the read-only detail dialog (the row click does the same). */
    detail: string;
    disable: string;
    edit: string;
    enable: string;
    loadMore: string;
    resolve: string;
    save: string;
    setDefault: string;
  };
  /** Labels for the closed vocabulary of identity shapes. */
  accountType: SdkworkIamCloudAccountVocabularyLabels<(typeof IAM_CLOUD_ACCOUNT_TYPES)[number]>;
  /**
   * What the console says about an account that advertises no capability.
   *
   * This is not a fallback string: the server reads an empty list as
   * *unspecified* and keeps the account resolvable for every capability, so an
   * account with no narrowing genuinely serves any of them.
   */
  capabilityAny: string;
  /** Labels for the closed vocabulary of cloud capabilities an account may advertise. */
  capability: SdkworkIamCloudAccountVocabularyLabels<
    (typeof IAM_CLOUD_ACCOUNT_KNOWN_CAPABILITY_CODES)[number]
  >;
  /** Column headers of the account table. Keys are named after the field, not the wording. */
  columns: {
    accountCode: string;
    actions: string;
    credential: string;
    displayName: string;
    environment: string;
    isDefault: string;
    /** Recognisable mask of a stored credential (`LTAI****1234`); never the secret itself. */
    maskedLabel: string;
    scope: string;
    status: string;
    vendor: string;
  };
  create: {
    accountCode: string;
    accountCodePlaceholder: string;
    /**
     * Why the register form asks for the provider's own account identifier.
     *
     * The field is optional and stays optional: the server stores it as a note
     * about which provider-side account the credential belongs to, and an
     * operator who does not know it yet must still be able to register.
     *
     * Stated **provider-neutrally**, with no example of what some other provider
     * calls it. The field's own label is the provider's word (`阿里云账号 ID`,
     * `订阅 ID`, `项目 ID`), and naming a second provider's term underneath it is
     * the same mistake as labelling a Tencent Cloud field `AccessKey ID`: it reads
     * as a fact about the provider in front of the operator. Every provider's
     * wording is already carried by `accountIdLabel` and `accountIdPlaceholder`.
     */
    accountIdHint: string;
    accountType: string;
    capabilities: string;
    /**
     * Why the register form does not offer the capability list at all.
     *
     * Capability is a *narrowing* of an account that is already keyed by vendor
     * and environment, and the server's default (unspecified ⇒ serves every
     * capability) is the one an operator almost always wants. Offering eight
     * checkboxes at registration invited a decision with no upside and a real
     * cost: narrowing to one capability silently removes the account from every
     * other demand, including the DNS one certificate issuance depends on.
     */
    capabilitiesHint: string;
    /**
     * What the credential group asks for, **per identity shape**.
     *
     * The shape is the only axis that decides how many boxes appear, so a sentence
     * that describes the fields has to be keyed by it. One shared paragraph that
     * enumerated every shape instead ("a long-term key asks for a pair, a temporary
     * credential adds the session token, a service account asks for one secret,
     * a shape with no secret asks for nothing") made the operator read four
     * configurations to find the one in front of them, and it read as a
     * mis-description the moment the selected shape was not the first one listed.
     *
     * Keyed over `SdkworkIamCloudAccountSecretHoldingType` and not over all seven
     * shapes, because the other three draw no field at all: their wording is the
     * *reason* they draw none, which `credentialNotNeeded` already owns per shape.
     * The two key sets partition the vocabulary, so neither sentence can be reached
     * through the other's shape.
     */
    credentialShapeHint: SdkworkIamCloudAccountVocabularyLabels<SdkworkIamCloudAccountSecretHoldingType>;
    /**
     * Shown when the identity shape holds a secret here and none was typed.
     *
     * The form does not block on it — registering now and pasting the key later is
     * a workflow the platform supports, and `credentialConfigured` is a listing
     * column precisely because it can be false — so the field is optional and the
     * consequence is stated instead of enforced.
     */
    credentialMissingNote: string;
    /**
     * Why *this* identity shape holds no secret here, keyed by the shape.
     *
     * Three shapes render no fields, and they render none for three different
     * reasons: a service-linked role is assumed by the cloud service on the
     * owner's behalf, a federated identity trades an assertion an external issuer
     * signed, and a managed identity carries no secret material at all. One shared
     * sentence for all three is wrong twice over — it tells the operator holding a
     * SAML assertion that there is nothing to configure, and it never tells the
     * operator registering a role that the role has to be granted on the
     * provider's side.
     *
     * Keyed by the contract's own `IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES`, so a shape
     * that loses its credential kind there turns this into a compile error in
     * every catalogue rather than silently rendering the wrong reason.
     */
    credentialNotNeeded: SdkworkIamCloudAccountVocabularyLabels<IamCloudAccountSecretlessType>;
    /**
     * Shown when the shape has no fields and this build does not recognise it.
     *
     * `account_type` is only choice-checked server-side against a list that can
     * grow, so a row can name a shape this build has never heard of; the form then
     * has an empty area and no reason it can truthfully state. It says it does not
     * know rather than borrowing one of the three reasons above, which would be
     * asserting a fact about a shape nobody here has seen.
     */
    credentialNotNeededUnknown: string;
    /** Caption of the credential group inside the register form. */
    credentialSection: string;
    /**
     * Line the editor modal shows under its title while registering.
     *
     * Says what the form does — register the account and its credential in one
     * pass — and stops there. The consequence of leaving the credential out is
     * `credentialMissingNote`'s job, stated at the field that is empty; keeping it
     * here as well made the modal explain the same rule 400px above the box that
     * demonstrated it.
     */
    description: string;
    displayName: string;
    displayNamePlaceholder: string;
    environment: string;
    /**
     * The default-account checkbox, with `{scope}` substituted by the page.
     *
     * The placeholder is not decoration: the ownership level is a *picker* only
     * where the caller may act on more than one level, so on the console — where
     * exactly one level exists — the form shows no level control at all and a
     * sentence referring to "this level" has no visible referent. Naming the level
     * reads correctly in both shapes of the form, and it names the field the
     * default is scoped to (`setDefaultAccount` promotes within the account's own
     * level).
     */
    isDefault: string;
    organizationId: string;
    organizationIdPlaceholder: string;
    ownership: string;
    provider: string;
    region: string;
    /**
     * Accessible name of the control that empties the region field.
     *
     * Not to be confused with `regionEmpty` below, which is the list's empty
     * *state*: this one names the button that produces an empty *value*.
     */
    regionClear: string;
    /**
     * Shown inside the empty region field.
     *
     * Neutral about picking versus typing on purpose: the field is a combobox
     * for the providers that publish regions and a plain input for the three
     * that do not (`cloudflare`, `minio`, `custom`), and it is the same field.
     */
    regionPlaceholder: string;
    /**
     * Why the candidate list changes when the provider does, and why it is not
     * a constraint.
     *
     * Region is provider-scoped vocabulary — `cn-hangzhou` is Alibaba Cloud's
     * Hangzhou and means nothing to AWS — so the list is keyed by provider. It
     * is also *only* a candidate list: `region_code` is free `TEXT` with no
     * check and the resolver never matches on it, so a region the provider does
     * not list has to stay accepted, which is what the hint says.
     *
     * Shown only where there *is* a candidate list; see `regionHintNoCandidates`.
     */
    regionHint: string;
    /**
     * The same hint for a provider that publishes no regions at all.
     *
     * The field degrades to free text for `cloudflare`, `minio` and `custom`
     * (three providers with no region concept between them: one anycast network,
     * one deployment wherever it was installed, one nobody here has seen), and the
     * candidate sentence above is false there in its first clause — "candidates
     * come from the selected provider" promises a list that does not exist.
     *
     * The second clause is kept, and it is not a copy of the one above by
     * accident: `iamCloudAccountVendorAcceptsRegion` answers `false` for every
     * non-empty code when the provider publishes none, so switching *to* one of
     * these three clears whatever was typed. The hint has to say so, because the
     * operator cannot tell from a free-text box that the value is about to go.
     */
    regionHintNoCandidates: string;
    /**
     * Empty state of the region list when a typed query matches none of the
     * provider's candidates. Says the typed value is still taken, because it is.
     */
    regionEmpty: string;
    submit: string;
    title: string;
  };
  credentials: {
    /** Opens the credential form's own dialog from the detail's credential group. */
    add: string;
    /**
     * Title of that dialog. Distinct from `title` because the detail already
     * carries `title` as a *group caption*; a dialog wants a sentence about what it
     * is for, and reusing the caption reads like a section heading floating at the
     * top of a window.
     */
    addTitle: string;
    empty: string;
    kind: string;
    name: string;
    namePlaceholder: string;
    revoke: string;
    rotationApplies: string;
    sessionToken: string;
    /**
     * Why the session token is asked for alongside a key pair.
     *
     * It is the third part of an STS-style grant rather than a secret of its own,
     * so the field only appears where the identity shape says a token was issued —
     * and it would otherwise look like an unexplained extra box under the key.
     */
    sessionTokenHint: string;
    store: string;
    subtitle: string;
    title: string;
  };
  /** Labels for the closed vocabulary of stored credential shapes. */
  credentialKind: SdkworkIamCloudAccountVocabularyLabels<
    (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number]
  >;
  detail: {
    /**
     * Confirmation the delete dialog shows. `{name}` is substituted by the page,
     * because the shared dialog carries no localisation layer of its own.
     */
    deleteDescription: string;
    editTitle: string;
    /** Caption of the account's own facts inside the detail dialog. */
    factsTitle: string;
    resolutionEmpty: string;
    resolutionTitle: string;
  };
  /** Labels for the closed vocabulary of deployment environments. */
  environment: SdkworkIamCloudAccountVocabularyLabels<
    (typeof IAM_CLOUD_ACCOUNT_ENVIRONMENTS)[number]
  >;
  errors: {
    createAccount: string;
    /**
     * Shown when the account was created and its credential was not.
     *
     * The two are separate requests (`providerAccounts.create` then
     * `credentials.create`), so a refusal can land between them. Reporting that as
     * a plain "registration failed" would be wrong twice: the account *is* in the
     * listing, and it will never resolve until a credential is written — the exact
     * silent half-state this page exists to avoid. `{name}` and `{reason}` are
     * substituted by the page.
     */
    credentialAfterCreate: string;
    deleteAccount: string;
    loadAccounts: string;
    loadCredentials: string;
    resolve: string;
    revokeCredential: string;
    setDefault: string;
    storeCredential: string;
    updateAccount: string;
  };
  list: {
    /** Credential column, when at least one credential exists. `{count}` is substituted by the page. */
    credentialConfigured: string;
    /** Credential column, when the account can be resolved through nothing yet. */
    credentialMissing: string;
    default: string;
    emptyDescription: string;
    emptyTitle: string;
    /**
     * Pagination summary. `{loaded}` and `{total}` are substituted by the shared
     * pagination control, which defaults to English when no copy is injected.
     */
    showingOf: string;
  };
  /**
   * Labels for the region candidates, **keyed by provider**.
   *
   * Region names cannot be flattened across providers, because the codes collide
   * and mean different places: `ap-southeast-1` is Singapore for Alibaba Cloud
   * and AWS but China Hong Kong for Huawei Cloud. The shape is derived from
   * `IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR` rather than written out, so adding a
   * region to the table — or a provider to the table — turns every catalogue
   * that has not named it into a compile error instead of a bare `cn-hangzhou`
   * rendered into a Chinese console. A provider with no region concept resolves
   * to an empty map, which the catalogue states explicitly.
   *
   * Codes outside the table still render: the server accepts any `region_code`
   * and the lookup falls back to the code itself.
   */
  region: {
    [Vendor in IamCloudAccountRegionVendor]: SdkworkIamCloudAccountVocabularyLabels<
      IamCloudAccountRegionCodesOf<Vendor>
    >;
  };
  scope: {
    organization: string;
    platform: string;
    tenant: string;
    user: string;
  };
  status: {
    active: string;
    deleted: string;
    disabled: string;
  };
  subtitle: string;
  title: string;
  /** Labels for the closed vocabulary of cloud providers the console offers. */
  vendor: SdkworkIamCloudAccountVocabularyLabels<
    (typeof IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES)[number]
  >;
  /**
   * What each provider calls the concrete configuration of an account.
   *
   * Keyed by provider and **exhaustive over the same tuple `vendor` is**, so a
   * provider added to the picker cannot ship without someone deciding what its
   * key fields are called. A lookup for a provider this build has never heard of
   * falls back to `vendorFallbackConfig` below rather than to an empty string:
   * the server accepts more provider codes than the picker offers, and the form
   * still has to render for one.
   */
  vendorConfig: {
    [Vendor in IamCloudAccountVendor]: SdkworkIamCloudAccountVendorConfigCopy;
  };
  /**
   * Wording used for a provider code this build does not know.
   *
   * The platform's own neutral words, not a provider's: claiming "AccessKey ID"
   * for an unrecognised vendor would be inventing a fact about it.
   */
  vendorFallbackConfig: SdkworkIamCloudAccountVendorConfigCopy;
}
