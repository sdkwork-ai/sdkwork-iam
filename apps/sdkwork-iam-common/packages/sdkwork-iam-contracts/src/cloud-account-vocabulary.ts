import { hasPermissionInScope } from "./backend-operation-permissions.ts";

/**
 * Cloud account center vocabulary.
 *
 * Mirrors the constant block in
 * `crates/sdkwork-iam-provider-account-service/src/model.rs` so every console
 * offers the same pickers the server-side validation accepts, from one place
 * instead of one copy per client tier.
 *
 * These are *pickers, not enums*. The columns only enforce shapes — `vendor_code`
 * is `^[a-z][a-z0-9_]{1,31}$` and `capability_codes` accepts any lowercased token
 * — so a server may publish a provider this list does not know yet without a
 * client change. A value read back from the API is therefore always preserved and
 * rendered, never dropped for being absent here.
 */

/** Global default shared by every tenant. Only a platform operator may publish one. */
export const IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM = "platform";
/** Tenant-wide default, visible to every tenant member holding `read`. */
export const IAM_CLOUD_ACCOUNT_SCOPE_TENANT = "tenant";
/** Kept by one organization inside a tenant; nothing outside it resolves here. */
export const IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION = "organization";
/** A personal account, visible to the single user who owns it. */
export const IAM_CLOUD_ACCOUNT_SCOPE_USER = "user";

/**
 * Values accepted by `iam_provider_account.scope_type`, ordered from narrowest
 * (highest resolution precedence) to widest — the order the resolver walks.
 */
export const IAM_CLOUD_ACCOUNT_SCOPE_LEVELS = [
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
  IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
  IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM,
] as const;

export type IamCloudAccountScopeLevel = (typeof IAM_CLOUD_ACCOUNT_SCOPE_LEVELS)[number];

/**
 * The three ownership levels a self-service console offers.
 *
 * `platform` is deliberately absent: publishing a globally resolvable account is
 * reserved for platform operators and the server answers
 * `iam_provider_account_scope_forbidden` when a tenant tries, so no client offers
 * it as a choice.
 */
export const IAM_CLOUD_ACCOUNT_SELF_SERVICE_SCOPE_LEVELS = [
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
  IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
] as const;

/**
 * Tenant whose members are platform operators.
 *
 * Mirrors `PLATFORM_TENANT_ID` in
 * `crates/sdkwork-iam-provider-account-service/src/model.rs`. The `platform`
 * level is gated on *membership of this tenant*, not on `manage_shared`: a route
 * cannot express "platform tenant only" in its declared permission, so
 * `provider_accounts.rs` compares the caller's tenant against this value
 * directly and answers `iam_provider_account_scope_forbidden` otherwise.
 */
export const IAM_CLOUD_ACCOUNT_PLATFORM_TENANT_ID = "100001";

/** Permission that widens a caller from its own accounts to the shared levels. */
export const IAM_CLOUD_ACCOUNT_PERMISSION_PREFIX = "iam.provider_accounts";
export const IAM_CLOUD_ACCOUNT_PERMISSION_MANAGE_SHARED = "iam.provider_accounts.manage_shared";

/**
 * Whether the granted scope reaches the organization and tenant defaults.
 *
 * The server decides this from the same code (`PERM_MANAGE_SHARED_ACCOUNTS` in
 * the route crate), so a console uses it to render the level honestly instead of
 * offering a choice the request would be refused for. A console that shows the
 * level anyway is still safe — the server refuses rather than silently narrowing —
 * but it would be offering a dead end.
 */
export function hasIamCloudAccountManageSharedScope(grantedCodes: readonly string[]): boolean {
  return hasPermissionInScope(grantedCodes, IAM_CLOUD_ACCOUNT_PERMISSION_MANAGE_SHARED);
}

/** Whether the signed-in tenant is the one whose members are platform operators. */
export function isIamCloudAccountPlatformTenant(tenantId: string | undefined): boolean {
  return (tenantId ?? "").trim() === IAM_CLOUD_ACCOUNT_PLATFORM_TENANT_ID;
}

/**
 * Which host surface is rendering the cloud account center.
 *
 * The two surfaces differ in *whose* accounts they are for, not merely in their
 * copy: the console is the signed-in user's own area, so it is pinned to the
 * personal level, while the admin surface is the operator's and projects every
 * level the caller actually holds.
 */
export type IamCloudAccountSurface = "admin" | "console";

export interface IamCloudAccountScopeProjectionOptions {
  /**
   * Which surface is rendering. Defaults to `console`, so a host that forgets to
   * pass anything gets the narrower, personal-only projection rather than the
   * wider one.
   */
  surface?: IamCloudAccountSurface;
  /** Session tenant, which is the only fact that decides the `platform` level. */
  tenantId?: string;
}

/**
 * The ownership levels one caller may be offered on a given surface.
 *
 * Both host surfaces mount the same page over the same route set; what differs is
 * which levels are projected as pickable, so the rule lives here rather than in
 * either host.
 *
 * **The console is personal-only.** It is the signed-in user's own area, and the
 * first thing it must not do is show one user another's accounts or the global
 * platform defaults. Its projection is therefore the single `user` level: no
 * tabs, no level picker, and a listing pinned to `mine`. An operator who needs
 * the shared levels uses the admin surface, which is gated separately by the
 * host (`hasWebserverAdminAccess`) before it is even mounted.
 *
 * **The admin surface mirrors the server's two gates honestly instead of
 * collapsing them.** The `organization` and `tenant` levels ride on
 * `manage_shared` alone. The `platform` level is narrower and needs *both*
 * `manage_shared` **and** membership of `IAM_CLOUD_ACCOUNT_PLATFORM_TENANT_ID` —
 * the same pair `model::resolve_account_scope` demands before it will keep a
 * platform-scope row, and the same pair the route gate uses before it will list
 * one. Offering a level the server refuses is safe (it refuses rather than
 * silently narrowing), but it would be offering a dead end, so the projection
 * stops at the levels that would actually be accepted.
 */
export function resolveIamCloudAccountManageableScopeLevels(
  grantedCodes: readonly string[],
  options: IamCloudAccountScopeProjectionOptions = {},
): readonly IamCloudAccountScopeLevel[] {
  if ((options.surface ?? "console") !== "admin") {
    return [IAM_CLOUD_ACCOUNT_SCOPE_USER];
  }
  const levels: IamCloudAccountScopeLevel[] = [];
  const manageShared = hasIamCloudAccountManageSharedScope(grantedCodes);
  if (manageShared) {
    levels.push(IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION, IAM_CLOUD_ACCOUNT_SCOPE_TENANT);
    if (isIamCloudAccountPlatformTenant(options.tenantId)) {
      levels.push(IAM_CLOUD_ACCOUNT_SCOPE_PLATFORM);
    }
  }
  // Personal accounts carry no shared requirement, so they are always offered and
  // the returned list is never empty — the page needs at least one level to render.
  return [IAM_CLOUD_ACCOUNT_SCOPE_USER, ...levels];
}

export const IAM_CLOUD_ACCOUNT_STATUS_ACTIVE = "active";
export const IAM_CLOUD_ACCOUNT_STATUS_DISABLED = "disabled";
export const IAM_CLOUD_ACCOUNT_STATUS_DELETED = "deleted";

export const IAM_CLOUD_ACCOUNT_STATUSES = [
  IAM_CLOUD_ACCOUNT_STATUS_ACTIVE,
  IAM_CLOUD_ACCOUNT_STATUS_DISABLED,
  IAM_CLOUD_ACCOUNT_STATUS_DELETED,
] as const;

/** Identity shape a long-lived secret backs, so it must be rotated. */
export const IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY = "long_term_key";
export const IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL = "temporary_credential";
export const IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT = "service_account";
export const IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE = "service_linked_role";
export const IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY = "federated_identity";
export const IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY = "managed_identity";
export const IAM_CLOUD_ACCOUNT_TYPE_API_KEY = "api_key";

export const IAM_CLOUD_ACCOUNT_TYPES = [
  IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY,
  IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
  IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT,
  IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
  IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY,
  IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY,
  IAM_CLOUD_ACCOUNT_TYPE_API_KEY,
] as const;

/**
 * Whether the identity shape carries a secret this platform stores and must
 * rotate. The other shapes expire on their own or hold no secret at all, so a
 * console must not offer them a rotation action.
 */
export function iamCloudAccountTypeRequiresRotation(accountType: string | undefined): boolean {
  return (
    accountType === IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY
    || accountType === IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT
    || accountType === IAM_CLOUD_ACCOUNT_TYPE_API_KEY
  );
}

export const IAM_CLOUD_ACCOUNT_ENVIRONMENTS = ["development", "sandbox", "production"] as const;

/**
 * Well-known vendor codes the console offers as a picker — the same list the
 * server exports. `cloudflare` is the case that justifies keeping a
 * business-module-driven provider here: it serves DNS and CDN rather than object
 * storage, and without it a console could not offer an account Deploy's DNS-01
 * automation legitimately registers.
 */
export const IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES = [
  "aliyun",
  "tencent",
  "huawei",
  "volcengine",
  "aws",
  "google",
  "azure",
  "cloudflare",
  "minio",
  "custom",
] as const;

/**
 * The providers this console offers, as a type.
 *
 * Named once and reused by every catalogue whose keys are providers — the region
 * table below, and the per-provider wording of the concrete configuration a
 * registration asks for. A provider added to the picker therefore has to be
 * named by every consumer rather than silently falling through a lookup.
 */
export type IamCloudAccountVendor = (typeof IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES)[number];

/**
 * Regions each provider publishes, keyed by `vendor_code`.
 *
 * A region is the one account field that is *provider-scoped vocabulary*: it is
 * meaningless on its own and has to be read against the provider it belongs to.
 * `cn-hangzhou` is Alibaba Cloud's Hangzhou and means nothing to AWS — and the
 * codes collide across providers rather than merely differing, so a flat list
 * would silently mislabel them: `ap-southeast-1` is Singapore for Alibaba Cloud
 * and AWS but China Hong Kong for Huawei Cloud, and `ap-southeast-3` is Malaysia
 * for Alibaba Cloud while Huawei uses it for Singapore. That is why this table is
 * keyed by vendor instead of flattened.
 *
 * **These are candidates, not the contract.** `region_code` is a plain `TEXT`
 * column with no check and no service-side validation, and the resolver never
 * matches on it — it is a note about where an account's resources live. So the
 * list exists to save typing, and the console must keep accepting any value,
 * including one this table has never heard of. A provider therefore appears here
 * with an empty list when it genuinely has no region concept (`cloudflare` is a
 * single anycast network; `minio` is wherever the operator installed it;
 * `custom` is by definition unknown), and the field degrades to free text.
 *
 * `satisfies` rather than a type annotation: the table stays literal (so
 * `IamCloudAccountRegionCode` can be derived from it and every catalog is forced
 * to translate each code) while a provider *missing* from the table is still a
 * compile error.
 */
export const IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR = {
  aliyun: [
    "cn-hangzhou",
    "cn-shanghai",
    "cn-beijing",
    "cn-zhangjiakou",
    "cn-qingdao",
    "cn-wulanchabu",
    "cn-shenzhen",
    "cn-heyuan",
    "cn-guangzhou",
    "cn-chengdu",
    "cn-hongkong",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-southeast-3",
    "ap-southeast-5",
    "ap-northeast-1",
    "ap-south-1",
    "us-west-1",
    "us-east-1",
    "eu-central-1",
    "eu-west-1",
  ],
  aws: [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "ca-central-1",
    "sa-east-1",
    "eu-west-1",
    "eu-west-2",
    "eu-central-1",
    "ap-south-1",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-northeast-3",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-east-1",
    "cn-north-1",
    "cn-northwest-1",
  ],
  azure: [
    "chinaeast2",
    "chinanorth3",
    "eastasia",
    "southeastasia",
    "japaneast",
    "japanwest",
    "koreacentral",
    "eastus",
    "eastus2",
    "centralus",
    "westus2",
    "northeurope",
    "westeurope",
    "uksouth",
    "germanywestcentral",
  ],
  // The three empty lists below are findings, not gaps waiting to be filled:
  // Cloudflare is one anycast network whose placement is chosen for the
  // customer rather than declared by them; MinIO runs wherever the operator
  // installed it; and `custom` names no provider at all. Each is a real answer
  // to "which regions does this provider have?", and the field still works —
  // with no candidates offered it simply stays an ordinary text input.
  cloudflare: [],
  custom: [],
  google: [
    "asia-east1",
    "asia-east2",
    "asia-northeast1",
    "asia-northeast2",
    "asia-northeast3",
    "asia-south1",
    "asia-southeast1",
    "asia-southeast2",
    "us-central1",
    "us-east1",
    "us-west1",
    "europe-west1",
    "europe-west2",
    "europe-west3",
    "europe-west4",
  ],
  huawei: [
    "cn-north-4",
    "cn-north-1",
    "cn-east-3",
    "cn-east-2",
    "cn-south-1",
    "cn-southwest-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-southeast-3",
  ],
  minio: [], // See the note above `cloudflare`: it has no regions to declare.
  tencent: [
    "ap-guangzhou",
    "ap-shanghai",
    "ap-beijing",
    "ap-chengdu",
    "ap-chongqing",
    "ap-nanjing",
    "ap-hongkong",
    "ap-singapore",
    "ap-tokyo",
    "ap-seoul",
    "ap-mumbai",
    "ap-bangkok",
    "ap-jakarta",
    "na-siliconvalley",
    "na-ashburn",
    "sa-saopaulo",
    "eu-frankfurt",
  ],
  volcengine: [
    "cn-beijing",
    "cn-shanghai",
    "cn-guangzhou",
    "cn-hongkong",
  ],
} as const satisfies Readonly<
  Record<(typeof IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES)[number], readonly string[]>
>;

/**
 * A region is not a globally meaningful code, and this is the case that proves
 * it: `ap-southeast-1` is Singapore for Alibaba Cloud and AWS but **China Hong
 * Kong** for Huawei Cloud, and `ap-southeast-3` is Malaysia for Alibaba Cloud
 * while Huawei uses it for Singapore. One flat code-to-name table would therefore
 * be factually wrong for at least one provider, which is the reason the labels
 * derived from this type are keyed by vendor rather than flattened.
 *
 * The union itself stays useful for the places that only need "is this a region
 * we know at all", and it is what the lookup helper is typed against.
 */
export type IamCloudAccountRegionCode =
  (typeof IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR)[keyof typeof IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR][number];

/** Providers the region table is keyed by, derived so it cannot fall behind. */
export type IamCloudAccountRegionVendor = keyof typeof IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR;

/**
 * The region codes one provider publishes.
 *
 * Instantiated with a *literal* vendor, as a catalogue does, this resolves to
 * exactly that provider's codes — which is what makes a per-provider label map
 * checkable. A provider with no regions resolves to `never`, so its map is `{}`
 * and the catalogue has to say so out loud rather than leave it out.
 */
export type IamCloudAccountRegionCodesOf<Vendor extends IamCloudAccountRegionVendor> =
  (typeof IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR)[Vendor][number];

/**
 * Candidate regions for one provider, or an empty list when it has none.
 *
 * Never throws and never returns `undefined`: the vendor code arrives from a row
 * the server owns, which may name a provider this table does not list, and the
 * field still has to render. Matching is case- and padding-insensitive for the
 * same reason.
 */
export function listIamCloudAccountVendorRegions(
  vendorCode: string | undefined,
): readonly string[] {
  const table: Readonly<Record<string, readonly string[]>> = IAM_CLOUD_ACCOUNT_REGIONS_BY_VENDOR;
  return table[(vendorCode ?? "").trim().toLowerCase()] ?? [];
}

/**
 * Whether a region is one this provider itself publishes.
 *
 * The console uses this to decide whether a value survives a provider change: a
 * region typed for one provider is almost certainly wrong for another, so it is
 * dropped rather than carried over — but a value both providers publish (or an
 * empty field) is left alone.
 *
 * Comparison ignores case and padding for the same reason the candidate list is
 * matched that way: `region_code` is free `TEXT` and the operator may have typed
 * a published region in another case. Rejecting such a value would drop one the
 * provider does publish — losing input is the worse error, so this rule is the
 * field's matching rule rather than a second, stricter one.
 */
export function iamCloudAccountVendorAcceptsRegion(
  vendorCode: string | undefined,
  regionCode: string | undefined,
): boolean {
  const candidate = (regionCode ?? "").trim().toLowerCase();
  return candidate.length === 0
    || listIamCloudAccountVendorRegions(vendorCode).some(
      (code) => code.toLowerCase() === candidate,
    );
}

export const IAM_CLOUD_ACCOUNT_CAPABILITY_OBJECT_STORAGE = "object_storage";

export const IAM_CLOUD_ACCOUNT_KNOWN_CAPABILITY_CODES = [
  "object_storage",
  "cdn",
  "sms",
  "email",
  "dns",
  "certificate",
  "container_registry",
  "compute",
] as const;

export const IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR = "access_key_pair";
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN = "bearer_token";
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON = "service_account_json";
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT = "secret_text";

export const IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS = [
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
] as const;

export const IAM_CLOUD_ACCOUNT_CREDENTIAL_STATUS_ACTIVE = "active";
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_STATUS_SUPERSEDED = "superseded";
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_STATUS_REVOKED = "revoked";

/** Slot name used when a caller does not name one explicitly. */
export const IAM_CLOUD_ACCOUNT_DEFAULT_CREDENTIAL_NAME = "default";

/**
 * Which credential shape each identity shape is *entered* with.
 *
 * This is the one bridge between the two vocabularies, and it is policy, not
 * derivation: nothing on the server derives a credential kind from an account
 * type, so a console that wants to ask for the right fields at registration
 * time needs this table. The entries follow what each shape *is*:
 *
 * - `long_term_key` is the classic console key pair — an access key id plus its
 *   secret.
 * - `temporary_credential` is the same pair issued with an expiry, so it also
 *   carries the session token that proves the issue.
 * - `service_account` is a whole key document (GCP-style), entered as one block
 *   of secret text.
 * - `api_key` is an opaque string with no structure the console could name
 *   fields for, so it too is one block of secret text.
 * - `service_linked_role`, `federated_identity` and `managed_identity` hold no
 *   secret on this platform (`undefined`) — the provider resolves them out of
 *   band, so a console must not ask for one.
 *
 * Keyed exhaustively over `IAM_CLOUD_ACCOUNT_TYPES`, so adding a seventh shape
 * without deciding its credential shape is a type error rather than a silently
 * unenterable account.
 */
export const IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS = {
  [IAM_CLOUD_ACCOUNT_TYPE_LONG_TERM_KEY]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  [IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  [IAM_CLOUD_ACCOUNT_TYPE_SERVICE_ACCOUNT]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
  [IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE]: undefined,
  [IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY]: undefined,
  [IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY]: undefined,
  [IAM_CLOUD_ACCOUNT_TYPE_API_KEY]: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
} as const satisfies Record<
  (typeof IAM_CLOUD_ACCOUNT_TYPES)[number],
  (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number] | undefined
>;

/**
 * The credential shape an identity type is entered with, or `undefined` when
 * the shape holds no secret here. Unknown types read as "no credential", which
 * keeps a console from inventing fields for a type it has never heard of.
 */
export function iamCloudAccountTypeCredentialKind(
  accountType: string | undefined,
): (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number] | undefined {
  if (accountType === undefined) {
    return undefined;
  }
  return IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS[accountType as keyof typeof IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS];
}

/** Non-secret half of a key pair: the vendor's key id, client id, or similar. */
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID = "key_id";
/** Secret half of a key pair. */
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET = "key_secret";
/** A whole secret that has no second half: a token, or a key document. */
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT = "secret_text";
/**
 * The proof that a temporary credential really was issued by the provider.
 *
 * Only ever asked for alongside a key pair, because it means nothing without one:
 * it is the third part of an STS-style grant, not a secret of its own.
 */
export const IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN = "session_token";

export const IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELDS = [
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
] as const;

export type IamCloudAccountCredentialField = (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELDS)[number];

/**
 * The credential fields a registration must ask for, given the identity shape.
 *
 * This is what makes the register form collect the concrete configuration instead
 * of an account nothing can use. Nothing on the server derives a credential kind
 * from an account type, so without this a console can only record the account and
 * leave it unresolvable until someone reopens it and writes a credential — which
 * is the state this helper exists to remove.
 *
 * It is *derived from `iamCloudAccountTypeCredentialKind`* rather than stated a
 * second time, so the two cannot drift: a shape whose credential is a key pair
 * asks for the pair, every other kind is one blob, and the session token is added
 * only where the shape itself says there is one (`temporary_credential` is the
 * only such shape — the others either expire without one or hold no secret).
 *
 * An identity shape that holds no secret on this platform returns an **empty
 * list, not a fallback**: `service_linked_role`, `federated_identity` and
 * `managed_identity` are resolved by the provider out of band, so asking for a
 * key would be asking the operator to invent one. A console renders that as "this
 * shape needs nothing", never as a form it forgot to fill in.
 *
 * An unknown shape also returns an empty list, for the same reason the bridge
 * reads it as "no credential": a client that has not heard of a shape must not
 * invent fields for it.
 */
export function iamCloudAccountCredentialFields(
  accountType: string | undefined,
): readonly IamCloudAccountCredentialField[] {
  const kind = iamCloudAccountTypeCredentialKind(accountType);
  if (kind === undefined) {
    return [];
  }
  // The kind's own fields come from `iamCloudAccountCredentialKindFields`, so the
  // register form and the credential dialog cannot disagree about what a kind
  // asks for; the shape contributes exactly one field on top of that.
  const fields = iamCloudAccountCredentialKindFields(kind);
  if (
    accountType === IAM_CLOUD_ACCOUNT_TYPE_TEMPORARY_CREDENTIAL
    && kind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR
  ) {
    return [...fields, IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN];
  }
  return fields;
}

/**
 * Forces a type-level comparison to have come out empty.
 *
 * `Record`-keyed catalogues are only exhaustive if the key type really is the
 * narrowed set, and the two vocabularies below exist precisely to *be* that set.
 * `Array.prototype.filter` does not narrow a `readonly [...]` tuple — it returns
 * `T[]` over the whole element union — so a "derived" tuple written with `filter`
 * silently resolves back to every member, and an exhaustive `Record` over it then
 * demands translations for shapes that should not have any. Using this alias makes
 * a failed comparison a compile error at the declaration instead of a quietly
 * wider key type.
 */
type AssertNever<Candidate extends never> = Candidate;

/**
 * The credential shapes whose whole secret is one block of text with no second
 * half — which is exactly the set a console has to name *per shape*.
 *
 * This list exists because those kinds share the single `secret_text` **field**
 * while meaning different things in it, so a label attached to the field rather
 * than to the kind ends up lying about one of them for every provider that names
 * them differently: a Cloudflare API token is not a service-account key
 * document, and a Google service-account JSON is not an API key.
 *
 * Written out rather than filtered, with the two assertions below pinning it to
 * `IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS` in both directions: a kind added there is
 * either named here or a compile error, and a kind named here that stops being a
 * single-secret kind is a compile error too. There is no third case.
 */
export const IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS = [
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_BEARER_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
] as const;

export type IamCloudAccountSingleSecretCredentialKind =
  (typeof IAM_CLOUD_ACCOUNT_SINGLE_SECRET_CREDENTIAL_KINDS)[number];

/** Every single-secret kind is a kind the contract defines, and vice versa. */
type _SingleSecretKindsAreNeverMissing = Exclude<
  Exclude<
    (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number],
    (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR)
  >,
  IamCloudAccountSingleSecretCredentialKind
>;
type _SingleSecretKindsAreNeverExtra = Exclude<
  IamCloudAccountSingleSecretCredentialKind,
  Exclude<
    (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS)[number],
    (typeof IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR)
  >
>;
type _CheckSingleSecretKinds =
  | AssertNever<_SingleSecretKindsAreNeverMissing>
  | AssertNever<_SingleSecretKindsAreNeverExtra>;

/**
 * The identity shapes that hold no credential on this platform — the ones a
 * register form must render as "nothing to type here, and here is why".
 *
 * Three shapes land here and they land here for three *different* reasons, which
 * is the whole point of listing them apart from the empty result: a
 * service-linked role is assumed by the cloud service itself, a federated
 * identity trades an assertion the external issuer signed, and a managed identity
 * has no secret material at all. A console that renders one shared sentence for
 * all three tells the operator the wrong thing twice — the operator who holds a
 * SAML assertion is told there is nothing to configure, and the operator who must
 * register a role with a cloud service is told nothing about where to do it.
 *
 * Pinned to the bridge in both directions by the assertions below, so a shape
 * whose credential kind is removed from `IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS`
 * has to be listed here — and every catalogue that has not worded the new absence
 * then fails to compile instead of falling through to the wrong sentence.
 *
 * This is the *reason* axis, and it is deliberately not a second field
 * vocabulary: `iamCloudAccountCredentialFields` still answers `[]` for every
 * member, and the emptiness is a contract fact (the provider resolves these out
 * of band) rather than a console omission.
 */
export const IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES = [
  IAM_CLOUD_ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
  IAM_CLOUD_ACCOUNT_TYPE_FEDERATED_IDENTITY,
  IAM_CLOUD_ACCOUNT_TYPE_MANAGED_IDENTITY,
] as const;

export type IamCloudAccountSecretlessType = (typeof IAM_CLOUD_ACCOUNT_SECRETLESS_TYPES)[number];

/** Shapes the bridge says hold no credential kind. */
type SecretlessPerBridge = {
  [Shape in (typeof IAM_CLOUD_ACCOUNT_TYPES)[number]]:
    (typeof IAM_CLOUD_ACCOUNT_TYPE_CREDENTIAL_KINDS)[Shape] extends undefined ? Shape : never;
}[(typeof IAM_CLOUD_ACCOUNT_TYPES)[number]];

// Both directions, which together are equality: nothing the bridge calls
// secretless is missing from the list, and nothing in the list is a shape the
// bridge gives a credential kind to.
type _SecretlessAreNeverMissing = Exclude<SecretlessPerBridge, IamCloudAccountSecretlessType>;
type _SecretlessAreNeverExtra = Exclude<IamCloudAccountSecretlessType, SecretlessPerBridge>;
type _CheckSecretlessTypes =
  | AssertNever<_SecretlessAreNeverMissing>
  | AssertNever<_SecretlessAreNeverExtra>;

/**
 * The credential fields a *credential kind* asks for, with no identity shape in
 * the picture.
 *
 * The credential dialog picks a kind directly — it has no account type to consult
 * — and the register form reaches the same place through the shape→kind bridge,
 * so both need the field list for a kind alone. Keeping it here rather than in the
 * page is what stops the two surfaces from disagreeing about which fields a kind
 * has: the dialog and the form render the same fields for the same kind because
 * they ask the same function.
 *
 * The identity shape adds exactly one field on top of this (`session_token`, and
 * only for `temporary_credential`), which is why
 * `iamCloudAccountCredentialFields` is defined in terms of this one.
 */
export function iamCloudAccountCredentialKindFields(
  kind: string | undefined,
): readonly IamCloudAccountCredentialField[] {
  if (kind === undefined) {
    return [];
  }
  if (!(IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS as readonly string[]).includes(kind)) {
    return [];
  }
  return kind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR
    ? [IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID, IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET]
    : [IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT];
}

export function isIamCloudAccountScopeLevel(value: string): value is IamCloudAccountScopeLevel {
  return (IAM_CLOUD_ACCOUNT_SCOPE_LEVELS as readonly string[]).includes(value);
}
