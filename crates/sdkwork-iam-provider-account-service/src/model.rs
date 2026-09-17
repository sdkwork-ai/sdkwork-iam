//! Provider account and credential domain types plus validation.

use serde::{Deserialize, Serialize};

/// Lifecycle values accepted by `iam_provider_account.status`.
pub const ACCOUNT_STATUS_ACTIVE: &str = "active";
pub const ACCOUNT_STATUS_DISABLED: &str = "disabled";
pub const ACCOUNT_STATUS_DELETED: &str = "deleted";

/// Account lifecycle values accepted by `iam_provider_account.status`.
pub const ACCOUNT_STATUSES: &[&str] = &[
    ACCOUNT_STATUS_ACTIVE,
    ACCOUNT_STATUS_DISABLED,
    ACCOUNT_STATUS_DELETED,
];

/// Lifecycle values accepted by `iam_provider_credential.status`.
pub const CREDENTIAL_STATUS_ACTIVE: &str = "active";
pub const CREDENTIAL_STATUS_SUPERSEDED: &str = "superseded";
pub const CREDENTIAL_STATUS_REVOKED: &str = "revoked";

/// Credential shapes accepted by `iam_provider_credential.credential_kind`.
pub const CREDENTIAL_KIND_ACCESS_KEY_PAIR: &str = "access_key_pair";
pub const CREDENTIAL_KIND_BEARER_TOKEN: &str = "bearer_token";
pub const CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON: &str = "service_account_json";
pub const CREDENTIAL_KIND_SECRET_TEXT: &str = "secret_text";

pub const CREDENTIAL_KINDS: &[&str] = &[
    CREDENTIAL_KIND_ACCESS_KEY_PAIR,
    CREDENTIAL_KIND_BEARER_TOKEN,
    CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON,
    CREDENTIAL_KIND_SECRET_TEXT,
];

/// Credential slot name used when a caller does not name one explicitly.
pub const DEFAULT_CREDENTIAL_NAME: &str = "default";

/// Platform sentinel organization, matching the IAM persistence contract.
pub const DEFAULT_ORGANIZATION_ID: &str = "0";

/// Tenant that owns platform-wide resources, matching
/// `IAM_DIRECTORY_TEMPLATE_SPEC.md` ("seeds tenant `100001` and root org `0`").
/// Only operators acting inside this tenant may publish a `platform`-scope
/// account, which is what keeps a tenant administrator from minting a globally
/// visible credential.
pub const PLATFORM_TENANT_ID: &str = "100001";

/// A globally shared default account, resolvable from every tenant.
pub const ACCOUNT_SCOPE_PLATFORM: &str = "platform";
/// An application-tenant default account, visible to every member of the tenant
/// that holds `iam.provider_accounts.read`.
pub const ACCOUNT_SCOPE_TENANT: &str = "tenant";
/// An account kept by one organization inside a tenant. Only a member of that
/// organization holding the manage permission may change it, and nothing outside
/// the organization resolves to it. The root organization sentinel `0` is not a
/// real organization and is rejected, so this level can never be used to
/// re-spell a tenant-wide default.
pub const ACCOUNT_SCOPE_ORGANIZATION: &str = "organization";
/// A personal account created by an end user, visible to that user only.
pub const ACCOUNT_SCOPE_USER: &str = "user";

/// Values accepted by `iam_provider_account.scope_type`, ordered from narrowest
/// (highest precedence) to widest.
pub const ACCOUNT_SCOPES: &[&str] = &[
    ACCOUNT_SCOPE_USER,
    ACCOUNT_SCOPE_ORGANIZATION,
    ACCOUNT_SCOPE_TENANT,
    ACCOUNT_SCOPE_PLATFORM,
];

/// Precedence order used by the resolver: a personal account wins over the one
/// kept by the caller's organization, which wins over the tenant default, which
/// wins over the platform default.
pub const SCOPE_PRECEDENCE: &[&str] = ACCOUNT_SCOPES;

/// Account created through the classic per-tenant path, before scopes existed.
/// Kept as the column default so existing rows and older callers stay valid.
pub const DEFAULT_ACCOUNT_SCOPE: &str = ACCOUNT_SCOPE_TENANT;

/// Identity shapes accepted by `iam_provider_account.account_type`.
///
/// The column answers "what kind of programmatic identity is this?" rather than
/// "whose account is it?" — the latter is `scope_type`'s job. The vocabulary
/// follows how the mainstream clouds classify an automated identity, so a value
/// maps onto a real construct on the vendor side and can drive credential
/// rotation and audit policy.
pub const ACCOUNT_TYPE_LONG_TERM_KEY: &str = "long_term_key";
/// STS-style credentials that expire: a key pair (or key plus secret) handed out
/// with an expiry and a session token.
pub const ACCOUNT_TYPE_TEMPORARY_CREDENTIAL: &str = "temporary_credential";
/// A cloud-platform service account and its key file (for example a GCP service
/// account JSON document).
pub const ACCOUNT_TYPE_SERVICE_ACCOUNT: &str = "service_account";
/// A role a cloud service assumes on the account owner's behalf. There is no
/// static secret to rotate.
pub const ACCOUNT_TYPE_SERVICE_LINKED_ROLE: &str = "service_linked_role";
/// An identity federated in from an external issuer (OIDC or SAML), where the
/// vendor exchanges a signed assertion for short-lived credentials.
pub const ACCOUNT_TYPE_FEDERATED_IDENTITY: &str = "federated_identity";
/// A platform-managed identity attached to a cloud resource, with no secret
/// material at all.
pub const ACCOUNT_TYPE_MANAGED_IDENTITY: &str = "managed_identity";
/// A single opaque API key string with no accompanying secret.
pub const ACCOUNT_TYPE_API_KEY: &str = "api_key";

pub const ACCOUNT_TYPES: &[&str] = &[
    ACCOUNT_TYPE_LONG_TERM_KEY,
    ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
    ACCOUNT_TYPE_SERVICE_ACCOUNT,
    ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
    ACCOUNT_TYPE_FEDERATED_IDENTITY,
    ACCOUNT_TYPE_MANAGED_IDENTITY,
    ACCOUNT_TYPE_API_KEY,
];

/// Whether the identity shape is backed by a long-lived secret this platform
/// stores and therefore must rotate.
///
/// The other shapes either carry their own expiry or hold no secret at all, so a
/// console must not offer them a rotation action and an auditor must not flag
/// them for a missing rotation date.
pub fn account_type_requires_rotation(account_type: &str) -> bool {
    matches!(
        account_type,
        ACCOUNT_TYPE_LONG_TERM_KEY | ACCOUNT_TYPE_SERVICE_ACCOUNT | ACCOUNT_TYPE_API_KEY
    )
}

/// Environment values accepted by `iam_provider_account.environment`.
pub const ENVIRONMENTS: &[&str] = &["development", "sandbox", "production"];

/// Well-known vendor codes surfaced by the console. The column itself only
/// enforces the `^[a-z][a-z0-9_]{1,31}$` shape, so new providers can be added
/// without a schema change; this list exists so the UI can offer a picker.
///
/// Deploy's DNS-01 automation picks from this list rather than inventing codes
/// (see its `sdkwork-deploy-cloud-account-port` adapter), so a provider a business
/// module can drive belongs here even when the vendor is not a storage backend.
/// `cloudflare` is the case in point: it serves DNS and CDN rather than object
/// storage, and without it the console could not offer an account that Deploy
/// legitimately registers.
pub const KNOWN_VENDOR_CODES: &[&str] = &[
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
];

/// Capability hint recorded on an account: what the account can serve.
///
/// The column itself accepts any lowercased token, so a new cloud capability
/// ships without a schema change; this list documents the ones the console
/// offers today and keeps the resolver vocabulary stable across modules.
pub const CAPABILITY_OBJECT_STORAGE: &str = "object_storage";

pub const KNOWN_CAPABILITY_CODES: &[&str] = &[
    "object_storage",
    "cdn",
    "sms",
    "email",
    "dns",
    "certificate",
    "container_registry",
    "compute",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderAccountError {
    Validation(String),
    NotFound(String),
    Conflict(String),
    Unavailable(String),
    Cipher(String),
}

impl ProviderAccountError {
    /// Stable machine-readable code surfaced on the wire.
    pub fn wire_code(&self) -> &'static str {
        match self {
            Self::Validation(_) => "iam_provider_account_invalid",
            Self::NotFound(_) => "iam_provider_account_not_found",
            Self::Conflict(_) => "iam_provider_account_conflict",
            Self::Unavailable(_) => "iam_provider_account_database_unavailable",
            Self::Cipher(_) => "iam_provider_credential_cipher_unavailable",
        }
    }

    pub fn http_status_code(&self) -> u16 {
        match self {
            Self::Validation(_) => 400,
            Self::NotFound(_) => 404,
            Self::Conflict(_) => 409,
            Self::Unavailable(_) => 503,
            Self::Cipher(_) => 500,
        }
    }

    pub fn message(&self) -> &str {
        match self {
            Self::Validation(message)
            | Self::NotFound(message)
            | Self::Conflict(message)
            | Self::Unavailable(message)
            | Self::Cipher(message) => message,
        }
    }
}

impl std::fmt::Display for ProviderAccountError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(formatter, "{}: {}", self.wire_code(), self.message())
    }
}

impl std::error::Error for ProviderAccountError {}

/// A reusable upstream cloud account.
///
/// The account is the reusable half of the model: every cloud consumer
/// (object storage today, more capabilities later) points at one account id,
/// so rotating the secret once reaches all of them.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderAccount {
    pub id: String,
    pub uuid: String,
    pub tenant_id: String,
    pub organization_id: String,
    /// One of `ACCOUNT_SCOPES`.
    pub scope_type: String,
    /// Set when `scope_type = user`; `None` for the shared scopes.
    pub owner_user_id: Option<String>,
    pub vendor_code: String,
    pub account_code: String,
    pub display_name: String,
    pub account_type: String,
    pub environment: String,
    pub external_account_id: Option<String>,
    pub capability_codes: Vec<String>,
    pub region_code: Option<String>,
    /// Whether the account is its scope's default for its vendor + environment.
    pub is_default: bool,
    pub status: String,
    pub version: i64,
    pub created_by: String,
    pub updated_by: String,
    pub created_at: String,
    pub updated_at: String,
    /// Derived: whether an active credential row exists for this account.
    pub credential_configured: bool,
    /// Derived: how many non-deleted credential rows the account owns.
    pub credential_count: i64,
}

impl ProviderAccount {
    /// Shared accounts (platform / tenant) carry no owner.
    pub fn is_shared(&self) -> bool {
        self.owner_user_id.is_none()
    }

    /// Whether the account advertises the given cloud capability.
    ///
    /// An empty `capability_codes` list means "unspecified", which stays
    /// reusable for every capability — accounts created before capabilities
    /// were tracked must keep resolving.
    pub fn serves_capability(&self, capability_code: &str) -> bool {
        let wanted = capability_code.trim().to_ascii_lowercase();
        self.capability_codes.is_empty()
            || self
                .capability_codes
                .iter()
                .any(|code| code.eq_ignore_ascii_case(&wanted))
    }
}

/// Credential projection safe to return from an API. Never carries secret bytes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderCredential {
    pub id: String,
    pub uuid: String,
    pub provider_account_id: String,
    pub credential_kind: String,
    pub credential_name: String,
    pub masked_label: Option<String>,
    pub secret_fingerprint: String,
    pub secret_key_id: String,
    pub secret_algorithm: String,
    pub credential_version: i64,
    pub status: String,
    pub expires_at: Option<String>,
    pub last_rotated_at: Option<String>,
    pub last_verified_at: Option<String>,
    pub created_by: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Decrypted credential material handed to a consuming domain at runtime.
///
/// This type is deliberately not `Serialize`; it must never reach a wire
/// projection. Consumers read the fields they need and drop the value.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderCredentialMaterial {
    pub provider_account_id: String,
    pub credential_kind: String,
    /// Monotonic version of the credential row this material was decrypted from.
    ///
    /// A consumer that caches something built out of the material (drive caches
    /// the object-store client of a storage provider) has to key that cache on
    /// this value: rotation inserts a *new* credential row and bumps this
    /// version while leaving the account row untouched, so an account-level
    /// version would never invalidate the cache and a rotated credential would
    /// keep being ignored until something else changed.
    pub credential_version: i64,
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
    pub session_token: Option<String>,
    pub secret_text: Option<String>,
    pub expires_at: Option<String>,
}

/// The JSON body that gets sealed into `secret_ciphertext`.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub(crate) struct CredentialSecretPayload {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub access_key_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_access_key: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub session_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub secret_text: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct NewProviderAccount {
    pub tenant_id: String,
    pub organization_id: String,
    /// One of `ACCOUNT_SCOPES`; empty falls back to `DEFAULT_ACCOUNT_SCOPE`.
    pub scope_type: String,
    /// Required when `scope_type = user`, rejected otherwise.
    pub owner_user_id: Option<String>,
    pub vendor_code: String,
    pub account_code: String,
    pub display_name: String,
    pub account_type: String,
    pub environment: String,
    pub external_account_id: Option<String>,
    pub capability_codes: Vec<String>,
    pub region_code: Option<String>,
    /// Promote this account to its scope's default for its vendor.
    pub is_default: bool,
    pub actor_id: String,
}

/// Partial account update. `None` leaves a field untouched.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct ProviderAccountPatch {
    pub display_name: Option<String>,
    pub account_type: Option<String>,
    pub environment: Option<String>,
    /// Empty string clears the column.
    pub external_account_id: Option<String>,
    /// Empty string clears the column.
    pub region_code: Option<String>,
    pub capability_codes: Option<Vec<String>>,
    pub status: Option<String>,
    /// Only ever set to `true` here; unsetting a default is done by promoting
    /// another account, so a vendor never ends up with zero defaults.
    pub is_default: Option<bool>,
}

/// Which accounts a caller may see, expressed as a resolution walk.
///
/// `user_id` is what makes the personal layer reachable; callers acting on
/// behalf of the tenant (no user) simply skip it.
///
/// The two `include_*_shared` flags are deliberately separate from the walk
/// itself, because browsing a shared account and resolving through one are
/// different rights. An ordinary member resolves through the tenant default
/// (so nothing breaks for them) but does not browse it: a listing carries the
/// vendor, account code, region and default flag of a credential an operator
/// keeps on everyone's behalf, which is not the member's to see.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountVisibility {
    pub tenant_id: String,
    pub user_id: Option<String>,
    /// The organization the caller acts inside, when the request carries one.
    /// Enables the organization layer in a listing.
    pub organization_id: Option<String>,
    /// Include `platform`-scope accounts. Turned off for tenant-scoped console
    /// listings that should not expose platform credentials.
    pub include_platform: bool,
    /// Include `tenant`-scope accounts, the tenant-wide defaults. Only a caller
    /// holding the manage permission at tenant level should set this.
    pub include_tenant_shared: bool,
    /// Include `organization`-scope accounts kept by the caller's own
    /// organization. Only meaningful together with `organization_id`.
    pub include_organization_shared: bool,
    /// Restrict to a single scope level. `None` walks every visible level.
    pub scope_type: Option<String>,
    /// Restrict to one owner. Used by the "my accounts" view.
    pub owner_user_id: Option<String>,
}

/// What a consuming domain asks for when it needs cloud credentials.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountRequirement {
    pub tenant_id: String,
    /// The acting end user, when there is one. Enables the personal layer.
    pub user_id: Option<String>,
    pub vendor_code: String,
    /// Capability the account must advertise, e.g. `object_storage`.
    pub capability_code: Option<String>,
    pub environment: Option<String>,
    pub organization_id: Option<String>,
}

/// The account a requirement resolves to, plus how it was chosen.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AccountResolution {
    pub account: ProviderAccount,
    /// Which scope level supplied the account.
    pub matched_scope: String,
    /// `true` when the account carried `is_default`; `false` when it was the
    /// only candidate in its level.
    pub matched_by_default: bool,
    /// Candidate counts per level, narrowest first, so the console can explain
    /// why a wider account was picked.
    pub candidates_by_scope: Vec<ScopeCandidateCount>,
}

/// How many accounts a single scope level offered.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScopeCandidateCount {
    pub scope_type: String,
    pub count: i64,
}

/// Plaintext secret payload accepted when creating or rotating a credential.
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub struct NewProviderCredential {
    pub provider_account_id: String,
    pub credential_kind: String,
    pub credential_name: String,
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
    pub session_token: Option<String>,
    pub secret_text: Option<String>,
    pub expires_at: Option<String>,
    pub actor_id: String,
}

impl NewProviderCredential {
    pub(crate) fn secret_payload(&self) -> CredentialSecretPayload {
        CredentialSecretPayload {
            access_key_id: normalize_optional(self.access_key_id.as_deref()),
            secret_access_key: normalize_optional(self.secret_access_key.as_deref()),
            session_token: normalize_optional(self.session_token.as_deref()),
            secret_text: normalize_optional(self.secret_text.as_deref()),
        }
    }
}

fn normalize_optional(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty())
        .map(str::to_owned)
}

pub fn validate_vendor_code(raw: &str) -> Result<String, ProviderAccountError> {
    let code = raw.trim().to_ascii_lowercase();
    let shape_ok = {
        let mut characters = code.chars();
        match characters.next() {
            Some(first) if first.is_ascii_lowercase() => {
                let rest: Vec<char> = characters.collect();
                (2..=32).contains(&(rest.len() + 1))
                    && rest.iter().all(|character| {
                        character.is_ascii_lowercase()
                            || character.is_ascii_digit()
                            || *character == '_'
                    })
            }
            _ => false,
        }
    };
    if !shape_ok {
        return Err(ProviderAccountError::Validation(
            "vendorCode must match ^[a-z][a-z0-9_]{1,31}$".to_owned(),
        ));
    }
    Ok(code)
}

pub fn validate_account_code(raw: &str) -> Result<String, ProviderAccountError> {
    let code = raw.trim().to_ascii_lowercase();
    let shape_ok = {
        let mut characters = code.chars();
        match characters.next() {
            Some(first) if first.is_ascii_lowercase() || first.is_ascii_digit() => {
                let rest: Vec<char> = characters.collect();
                (2..=64).contains(&(rest.len() + 1))
                    && rest.iter().all(|character| {
                        character.is_ascii_lowercase()
                            || character.is_ascii_digit()
                            || *character == '_'
                            || *character == '.'
                            || *character == '-'
                    })
            }
            _ => false,
        }
    };
    if !shape_ok {
        return Err(ProviderAccountError::Validation(
            "accountCode must match ^[a-z0-9][a-z0-9_.-]{1,63}$".to_owned(),
        ));
    }
    Ok(code)
}

pub fn validate_display_name(raw: &str) -> Result<String, ProviderAccountError> {
    let name = raw.trim();
    if name.is_empty() || name.chars().count() > 128 {
        return Err(ProviderAccountError::Validation(
            "displayName must be 1 to 128 characters".to_owned(),
        ));
    }
    Ok(name.to_owned())
}

pub fn validate_choice(
    field: &str,
    raw: &str,
    allowed: &[&str],
) -> Result<String, ProviderAccountError> {
    let value = raw.trim().to_ascii_lowercase();
    if !allowed.contains(&value.as_str()) {
        return Err(ProviderAccountError::Validation(format!(
            "{field} must be one of {}",
            allowed.join(", ")
        )));
    }
    Ok(value)
}

pub fn validate_credential_name(raw: Option<&str>) -> Result<String, ProviderAccountError> {
    let name = raw
        .map(str::trim)
        .filter(|candidate| !candidate.is_empty())
        .unwrap_or(DEFAULT_CREDENTIAL_NAME);
    if name.chars().count() > 64 {
        return Err(ProviderAccountError::Validation(
            "credentialName must be at most 64 characters".to_owned(),
        ));
    }
    Ok(name.to_owned())
}

/// Who is asking, for the scope rules that depend on the caller.
///
/// These travel together because every non-platform scope is decided by
/// comparing them against the row, and keeping them in one value means a future
/// dimension (a role claim, an API-key principal) is added here once instead of
/// in every signature that needs it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScopeCaller<'a> {
    pub tenant_id: &'a str,
    /// The acting end user, when there is one. Enables the personal layer.
    pub user_id: Option<&'a str>,
    /// The organization the caller is acting inside, when the request carries
    /// one. Required to keep an `organization`-scope account.
    pub organization_id: Option<&'a str>,
    /// Whether the caller may keep and change accounts beyond their own: the
    /// tenant-wide default, the accounts their organization keeps, and the
    /// global platform default.
    ///
    /// This is what separates "an end user manages their own cloud account" from
    /// "an administrator manages the account a whole tenant resolves through". A
    /// caller without it still creates and edits `user`-scope accounts.
    pub may_manage_shared: bool,
}

impl<'a> ScopeCaller<'a> {
    /// A caller that may act on its own accounts only.
    pub fn new(
        tenant_id: &'a str,
        user_id: Option<&'a str>,
        organization_id: Option<&'a str>,
    ) -> Self {
        Self {
            tenant_id,
            user_id,
            organization_id,
            may_manage_shared: false,
        }
    }

    /// The same caller, carrying the shared-account rights of an administrator.
    ///
    /// The route layer decides this from the caller's permission scope, because
    /// only it can see the granted codes; the service layer then enforces it, so a
    /// consumer calling in-process is held to the same rule.
    pub fn managing_shared(mut self, allowed: bool) -> Self {
        self.may_manage_shared = allowed;
        self
    }

    /// The value to record as `updated_by`: the acting user when there is one,
    /// otherwise the tenant, so a system-initiated write still names somebody.
    pub fn actor_label(&self) -> &str {
        self.user_id
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(self.tenant_id)
    }
}

/// The three columns a scope decision produces.
///
/// `organization_id` is part of the outcome rather than an input the caller sets
/// freely: for an `organization`-scope account it is pinned to the caller's own
/// organization, so a member of one organization cannot publish an account that
/// a different organization would then administer.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ResolvedScope {
    pub scope_type: String,
    pub owner_user_id: Option<String>,
    pub organization_id: String,
}

/// Normalize an organization id, rejecting blanks and the root sentinel `0`.
///
/// The root organization is the tenant itself, so it is not a level below the
/// tenant and must never be used to carry an organization-scope account.
fn normalize_account_organization(raw: Option<&str>) -> Option<String> {
    raw.map(str::trim)
        .filter(|value| !value.is_empty())
        .filter(|value| *value != DEFAULT_ORGANIZATION_ID)
        .map(str::to_owned)
}

/// Decide the scope an account is being created or updated in.
///
/// This is the one place that decides who may publish a widely visible
/// account, so the rules are enforced here rather than at the route layer:
///
/// * `platform` accounts are globally resolvable, so they may only be minted
///   from inside the platform tenant. Without this a tenant administrator
///   could quietly hand every other tenant their own credential.
/// * `tenant` accounts are the tenant-wide default; any member with the
///   create permission may keep one.
/// * `organization` accounts belong to one organization inside a tenant. The
///   caller must be acting inside a real organization — the root sentinel `0`
///   is the tenant itself, not a level below it — and the row is pinned to that
///   organization so one organization cannot plant an account in another.
/// * `user` accounts belong to exactly one person. A caller may only manage
///   their own; the owner id is defaulted from the caller when omitted.
pub fn resolve_account_scope(
    scope_type: Option<&str>,
    owner_user_id: Option<&str>,
    caller: &ScopeCaller<'_>,
    requested_organization_id: Option<&str>,
) -> Result<ResolvedScope, ProviderAccountError> {
    let scope = scope_type
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase)
        .unwrap_or_else(|| DEFAULT_ACCOUNT_SCOPE.to_owned());

    if !ACCOUNT_SCOPES.contains(&scope.as_str()) {
        return Err(ProviderAccountError::Validation(format!(
            "scopeType must be one of {}",
            ACCOUNT_SCOPES.join(", ")
        )));
    }

    let requested_owner = owner_user_id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned);

    // A tenant-, platform- or user-scope row records the organization it belongs
    // to but stays visible across the tenant, so the requested value is honoured.
    let shared_organization = || {
        normalize_account_organization(requested_organization_id)
            .unwrap_or_else(|| DEFAULT_ORGANIZATION_ID.to_owned())
    };

    // A shared account is infrastructure a whole tenant or organization resolves
    // through, so keeping one is an administrator act — even though creating a
    // personal account is not.
    let ensure_can_manage_shared = |scope_name: &str| -> Result<(), ProviderAccountError> {
        if caller.may_manage_shared {
            Ok(())
        } else {
            Err(ProviderAccountError::Validation(format!(
                "scopeType={scope_name} requires permission to manage shared provider accounts"
            )))
        }
    };

    match scope.as_str() {
        ACCOUNT_SCOPE_PLATFORM => {
            ensure_can_manage_shared(ACCOUNT_SCOPE_PLATFORM)?;
            if caller.tenant_id.trim() != PLATFORM_TENANT_ID {
                return Err(ProviderAccountError::Validation(
                    "scopeType=platform is reserved for platform operators".to_owned(),
                ));
            }
            if requested_owner.is_some() {
                return Err(ProviderAccountError::Validation(
                    "ownerUserId must be empty for a platform-scope account".to_owned(),
                ));
            }
            Ok(ResolvedScope {
                scope_type: scope,
                owner_user_id: None,
                organization_id: DEFAULT_ORGANIZATION_ID.to_owned(),
            })
        }
        ACCOUNT_SCOPE_TENANT => {
            ensure_can_manage_shared(ACCOUNT_SCOPE_TENANT)?;
            if requested_owner.is_some() {
                return Err(ProviderAccountError::Validation(
                    "ownerUserId must be empty for a tenant-scope account".to_owned(),
                ));
            }
            Ok(ResolvedScope {
                scope_type: scope,
                owner_user_id: None,
                organization_id: shared_organization(),
            })
        }
        ACCOUNT_SCOPE_ORGANIZATION => {
            ensure_can_manage_shared(ACCOUNT_SCOPE_ORGANIZATION)?;
            if requested_owner.is_some() {
                return Err(ProviderAccountError::Validation(
                    "ownerUserId must be empty for an organization-scope account".to_owned(),
                ));
            }
            let organization =
                normalize_account_organization(caller.organization_id).ok_or_else(|| {
                    ProviderAccountError::Validation(
                        "scopeType=organization requires the caller to act inside a \
                         non-root organization"
                            .to_owned(),
                    )
                })?;
            Ok(ResolvedScope {
                scope_type: scope,
                owner_user_id: None,
                organization_id: organization,
            })
        }
        _ => {
            let owner = requested_owner
                .or_else(|| caller.user_id.map(str::to_owned))
                .ok_or_else(|| {
                    ProviderAccountError::Validation(
                        "ownerUserId is required for a user-scope account".to_owned(),
                    )
                })?;
            if owner.chars().count() > 64 {
                return Err(ProviderAccountError::Validation(
                    "ownerUserId must be at most 64 characters".to_owned(),
                ));
            }
            if let Some(caller_user_id) = caller.user_id {
                if caller_user_id.trim() != owner {
                    return Err(ProviderAccountError::Validation(
                        "a user-scope account may only be managed by its owner".to_owned(),
                    ));
                }
            }
            Ok(ResolvedScope {
                scope_type: scope,
                owner_user_id: Some(owner),
                organization_id: shared_organization(),
            })
        }
    }
}

/// Normalize the optional environment filter used while resolving an account.
pub fn normalize_environment_filter(raw: Option<&str>) -> Option<String> {
    raw.map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_ascii_lowercase)
}

/// Normalize a capability list: lowercase, trimmed, de-duplicated, stable order.
pub fn normalize_capability_codes(codes: &[String]) -> Vec<String> {
    let mut normalized: Vec<String> = codes
        .iter()
        .map(|code| code.trim().to_ascii_lowercase())
        .filter(|code| !code.is_empty())
        .collect();
    normalized.sort();
    normalized.dedup();
    normalized
}

/// Validate that a sealed payload actually carries the fields its kind needs.
pub(crate) fn validate_secret_payload(
    credential_kind: &str,
    payload: &CredentialSecretPayload,
) -> Result<(), ProviderAccountError> {
    let missing = |field: &str| {
        ProviderAccountError::Validation(format!(
            "{field} is required for credentialKind={credential_kind}"
        ))
    };
    match credential_kind {
        CREDENTIAL_KIND_ACCESS_KEY_PAIR => {
            if payload.access_key_id.is_none() {
                return Err(missing("accessKeyId"));
            }
            if payload.secret_access_key.is_none() {
                return Err(missing("secretAccessKey"));
            }
        }
        CREDENTIAL_KIND_BEARER_TOKEN | CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON => {
            if payload.secret_text.is_none() {
                return Err(missing("secretText"));
            }
        }
        CREDENTIAL_KIND_SECRET_TEXT => {
            if payload.secret_text.is_none() {
                return Err(missing("secretText"));
            }
        }
        other => {
            return Err(ProviderAccountError::Validation(format!(
                "credentialKind must be one of {} (received {other})",
                CREDENTIAL_KINDS.join(", ")
            )));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vendor_and_account_codes_are_lowercased_and_shape_checked() {
        assert_eq!(validate_vendor_code("ALIYUN").unwrap(), "aliyun");
        assert_eq!(validate_vendor_code("aliyun").unwrap(), "aliyun");
        assert!(validate_vendor_code("1aliyun").is_err());
        assert!(validate_vendor_code("").is_err());

        assert_eq!(validate_account_code("OSS.Main-A").unwrap(), "oss.main-a");
        assert!(validate_account_code("_leading").is_err());
        assert!(validate_account_code("bad code").is_err());
    }

    #[test]
    fn capability_codes_are_normalized_and_deduplicated() {
        let normalized = normalize_capability_codes(&[
            " Object_Storage ".to_owned(),
            "object_storage".to_owned(),
            String::new(),
            "ecs".to_owned(),
        ]);
        assert_eq!(normalized, vec!["ecs", "object_storage"]);
    }

    #[test]
    fn access_key_pair_requires_both_halves() {
        let mut payload = CredentialSecretPayload {
            access_key_id: Some("AKID".to_owned()),
            ..Default::default()
        };
        assert!(validate_secret_payload(CREDENTIAL_KIND_ACCESS_KEY_PAIR, &payload).is_err());

        payload.secret_access_key = Some("SECRET".to_owned());
        assert!(validate_secret_payload(CREDENTIAL_KIND_ACCESS_KEY_PAIR, &payload).is_ok());
    }

    #[test]
    fn unknown_credential_kind_is_rejected() {
        let payload = CredentialSecretPayload {
            secret_text: Some("value".to_owned()),
            ..Default::default()
        };
        assert!(validate_secret_payload("smtp_password", &payload).is_err());
    }

    /// An ordinary member: no organization context, no shared-account rights.
    fn caller<'a>(tenant_id: &'a str, user_id: Option<&'a str>) -> ScopeCaller<'a> {
        ScopeCaller::new(tenant_id, user_id, None)
    }

    /// A tenant administrator: shared-account rights, no organization context.
    fn admin<'a>(tenant_id: &'a str, user_id: Option<&'a str>) -> ScopeCaller<'a> {
        ScopeCaller::new(tenant_id, user_id, None).managing_shared(true)
    }

    /// A member acting inside a named organization, without shared rights.
    fn org_caller<'a>(
        tenant_id: &'a str,
        user_id: Option<&'a str>,
        organization_id: &'a str,
    ) -> ScopeCaller<'a> {
        ScopeCaller::new(tenant_id, user_id, Some(organization_id))
    }

    /// An organization administrator: inside the organization, with shared rights.
    fn org_admin<'a>(
        tenant_id: &'a str,
        user_id: Option<&'a str>,
        organization_id: &'a str,
    ) -> ScopeCaller<'a> {
        ScopeCaller::new(tenant_id, user_id, Some(organization_id)).managing_shared(true)
    }

    #[test]
    fn platform_scope_is_reserved_for_the_platform_tenant() {
        let resolved = resolve_account_scope(
            Some("platform"),
            None,
            &admin(PLATFORM_TENANT_ID, Some("u-1")),
            None,
        )
        .unwrap();
        assert_eq!(resolved.scope_type, "platform");
        assert_eq!(resolved.owner_user_id, None);
        assert_eq!(
            resolved.organization_id, DEFAULT_ORGANIZATION_ID,
            "a platform account belongs to no organization"
        );

        let refused =
            resolve_account_scope(Some("platform"), None, &admin("200002", Some("u-1")), None);
        assert!(
            refused.is_err(),
            "a tenant must not publish a global account"
        );
    }

    #[test]
    fn tenant_scope_rejects_an_owner() {
        let resolved =
            resolve_account_scope(Some("tenant"), None, &admin("200002", Some("u-1")), None)
                .unwrap();
        assert_eq!(resolved.scope_type, "tenant");
        assert_eq!(resolved.owner_user_id, None);

        assert!(resolve_account_scope(
            Some("tenant"),
            Some("u-1"),
            &admin("200002", Some("u-1")),
            None
        )
        .is_err());
    }

    #[test]
    fn shared_scopes_require_the_management_right() {
        // An ordinary member reaches the account center to manage their own
        // accounts and must not be able to mint one the whole tenant resolves
        // through. That separation is the entire reason the right is a code of its
        // own rather than a reuse of `iam.provider_accounts.update`.
        for scope in ["platform", "tenant", "organization"] {
            let plain = if scope == "organization" {
                org_caller("200002", Some("u-1"), "org-7")
            } else {
                caller("200002", Some("u-1"))
            };
            assert!(
                resolve_account_scope(Some(scope), None, &plain, None).is_err(),
                "scopeType={scope} must need the shared-account right"
            );
        }

        // The same caller keeps full control of their own account.
        let personal =
            resolve_account_scope(Some("user"), None, &caller("200002", Some("u-1")), None)
                .unwrap();
        assert_eq!(personal.scope_type, "user");
    }

    #[test]
    fn user_scope_defaults_to_the_caller_and_rejects_someone_else() {
        let defaulted =
            resolve_account_scope(Some("user"), None, &caller("200002", Some("u-1")), None)
                .unwrap();
        assert_eq!(defaulted.scope_type, "user");
        assert_eq!(defaulted.owner_user_id, Some("u-1".to_owned()));

        let explicit = resolve_account_scope(
            Some("user"),
            Some("u-1"),
            &caller("200002", Some("u-1")),
            None,
        )
        .unwrap();
        assert_eq!(explicit.owner_user_id, Some("u-1".to_owned()));

        assert!(
            resolve_account_scope(
                Some("user"),
                Some("u-2"),
                &caller("200002", Some("u-1")),
                None
            )
            .is_err(),
            "a user must not create an account for a different owner"
        );
        assert!(
            resolve_account_scope(Some("user"), None, &caller("200002", None), None).is_err(),
            "a user-scope account needs an owner"
        );
    }

    #[test]
    fn organization_scope_is_pinned_to_the_callers_organization() {
        let resolved = resolve_account_scope(
            Some("organization"),
            None,
            &org_admin("200002", Some("u-1"), "org-7"),
            // The request names a different organization; it must not stick.
            Some("org-9"),
        )
        .unwrap();
        assert_eq!(resolved.scope_type, "organization");
        assert_eq!(resolved.owner_user_id, None);
        assert_eq!(
            resolved.organization_id, "org-7",
            "the row is pinned to the caller's own organization, not the requested one"
        );
    }

    #[test]
    fn organization_scope_requires_a_real_organization() {
        assert!(
            resolve_account_scope(
                Some("organization"),
                None,
                &admin("200002", Some("u-1")),
                None
            )
            .is_err(),
            "an organization-scope account needs an organization to live in"
        );

        assert!(
            resolve_account_scope(
                Some("organization"),
                None,
                &org_admin("200002", Some("u-1"), DEFAULT_ORGANIZATION_ID),
                None,
            )
            .is_err(),
            "the root organization is the tenant itself, not a level below it"
        );

        assert!(
            resolve_account_scope(
                Some("organization"),
                Some("u-1"),
                &org_admin("200002", Some("u-1"), "org-7"),
                None,
            )
            .is_err(),
            "an organization-scope account is shared, so it carries no owner"
        );
    }

    #[test]
    fn scope_defaults_to_tenant_and_unknown_values_are_rejected() {
        let defaulted =
            resolve_account_scope(None, None, &admin("200002", Some("u-1")), None).unwrap();
        assert_eq!(defaulted.scope_type, "tenant");

        let blank = resolve_account_scope(Some("  "), None, &admin("200002", None), None).unwrap();
        assert_eq!(blank.scope_type, "tenant");

        assert!(resolve_account_scope(Some("global"), None, &admin("200002", None), None).is_err());
    }

    #[test]
    fn scope_precedence_is_narrowest_first() {
        assert_eq!(
            SCOPE_PRECEDENCE,
            &["user", "organization", "tenant", "platform"]
        );
    }

    #[test]
    fn account_types_are_identity_shapes_not_relationship_labels() {
        assert_eq!(
            ACCOUNT_TYPES,
            &[
                "long_term_key",
                "temporary_credential",
                "service_account",
                "service_linked_role",
                "federated_identity",
                "managed_identity",
                "api_key",
            ]
        );
        assert!(
            ACCOUNT_TYPES
                .iter()
                .all(|kind| !matches!(*kind, "standard" | "partner" | "delegated")),
            "the relationship labels must not survive as identity kinds"
        );

        // Only the shapes that hold a secret this platform must rotate ask for it.
        for kind in [
            ACCOUNT_TYPE_LONG_TERM_KEY,
            ACCOUNT_TYPE_SERVICE_ACCOUNT,
            ACCOUNT_TYPE_API_KEY,
        ] {
            assert!(
                account_type_requires_rotation(kind),
                "{kind} holds a credential secret"
            );
        }
        for kind in [
            ACCOUNT_TYPE_TEMPORARY_CREDENTIAL,
            ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
            ACCOUNT_TYPE_FEDERATED_IDENTITY,
            ACCOUNT_TYPE_MANAGED_IDENTITY,
        ] {
            assert!(
                !account_type_requires_rotation(kind),
                "{kind} carries its own expiry or no secret at all"
            );
        }
    }

    #[test]
    fn empty_capability_list_serves_every_capability() {
        let mut account = sample_account();
        account.capability_codes = Vec::new();
        assert!(account.serves_capability("cdn"));

        account.capability_codes = vec!["object_storage".to_owned()];
        assert!(account.serves_capability("OBJECT_STORAGE"));
        assert!(!account.serves_capability("cdn"));
    }

    fn sample_account() -> ProviderAccount {
        ProviderAccount {
            id: "iampacct-1".to_owned(),
            uuid: "uuid-1".to_owned(),
            tenant_id: "200002".to_owned(),
            organization_id: DEFAULT_ORGANIZATION_ID.to_owned(),
            scope_type: ACCOUNT_SCOPE_TENANT.to_owned(),
            owner_user_id: None,
            vendor_code: "aliyun".to_owned(),
            account_code: "oss.main".to_owned(),
            display_name: "Aliyun main".to_owned(),
            account_type: ACCOUNT_TYPE_LONG_TERM_KEY.to_owned(),
            environment: "production".to_owned(),
            external_account_id: None,
            capability_codes: vec!["object_storage".to_owned()],
            region_code: Some("cn-hangzhou".to_owned()),
            is_default: false,
            status: ACCOUNT_STATUS_ACTIVE.to_owned(),
            version: 1,
            created_by: "u-1".to_owned(),
            updated_by: "u-1".to_owned(),
            created_at: "2026-09-17T00:00:00Z".to_owned(),
            updated_at: "2026-09-17T00:00:00Z".to_owned(),
            credential_configured: false,
            credential_count: 0,
        }
    }
}
