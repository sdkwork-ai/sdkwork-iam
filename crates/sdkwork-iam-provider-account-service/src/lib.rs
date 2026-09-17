//! SDKWork IAM platform-wide cloud account center.
//!
//! One account row describes a reusable upstream cloud account (for example one
//! Alibaba Cloud account) and carries a scope that decides how widely it is
//! reused:
//!
//! * `platform` — a global default kept by platform operators, resolvable from
//!   every tenant.
//! * `tenant` — an application-tenant default kept by the tenant administrator.
//! * `organization` — an account kept by one organization inside a tenant, only
//!   for that organization to administer and resolve through.
//! * `user` — a personal account created by one end user.
//!
//! Secret material lives in a separate write-only credential row, sealed with a
//! fail-closed AES-256-GCM envelope. Consuming domains (object storage today,
//! further cloud capabilities later) reference the account by id and call
//! [`repository::resolve_account`] or [`repository::resolve_credential_material`],
//! so one account is reused across businesses and a single rotation reaches
//! every consumer at once.

pub mod envelope;
pub mod model;
pub mod repository;

pub use envelope::{
    active_master_secret, fingerprint, legacy_master_secrets, mask_secret_label, open,
    open_with_masters, resolve_active_master, seal, seal_with_master, sealing_available,
    ENVELOPE_ALGORITHM, ENVELOPE_PREFIX, LEGACY_MASTER_SECRETS_ENV, MASTER_SECRET_ENV,
    PRIMARY_KEY_ID,
};

pub use model::{
    account_type_requires_rotation, normalize_capability_codes, normalize_environment_filter,
    resolve_account_scope, validate_account_code, validate_choice, validate_credential_name,
    validate_display_name, validate_vendor_code, AccountRequirement, AccountResolution,
    AccountVisibility, NewProviderAccount, NewProviderCredential, ProviderAccount,
    ProviderAccountError, ProviderAccountPatch, ProviderCredential, ProviderCredentialMaterial,
    ResolvedScope, ScopeCaller, ScopeCandidateCount, ACCOUNT_SCOPES, ACCOUNT_SCOPE_ORGANIZATION,
    ACCOUNT_SCOPE_PLATFORM, ACCOUNT_SCOPE_TENANT, ACCOUNT_SCOPE_USER, ACCOUNT_STATUSES,
    ACCOUNT_STATUS_ACTIVE, ACCOUNT_STATUS_DELETED, ACCOUNT_STATUS_DISABLED, ACCOUNT_TYPES,
    ACCOUNT_TYPE_API_KEY, ACCOUNT_TYPE_FEDERATED_IDENTITY, ACCOUNT_TYPE_LONG_TERM_KEY,
    ACCOUNT_TYPE_MANAGED_IDENTITY, ACCOUNT_TYPE_SERVICE_ACCOUNT, ACCOUNT_TYPE_SERVICE_LINKED_ROLE,
    ACCOUNT_TYPE_TEMPORARY_CREDENTIAL, CAPABILITY_OBJECT_STORAGE, CREDENTIAL_KINDS,
    CREDENTIAL_KIND_ACCESS_KEY_PAIR, CREDENTIAL_KIND_BEARER_TOKEN, CREDENTIAL_KIND_SECRET_TEXT,
    CREDENTIAL_KIND_SERVICE_ACCOUNT_JSON, CREDENTIAL_STATUS_ACTIVE, CREDENTIAL_STATUS_REVOKED,
    CREDENTIAL_STATUS_SUPERSEDED, DEFAULT_ACCOUNT_SCOPE, DEFAULT_CREDENTIAL_NAME,
    DEFAULT_ORGANIZATION_ID, ENVIRONMENTS, KNOWN_CAPABILITY_CODES, KNOWN_VENDOR_CODES,
    PLATFORM_TENANT_ID, SCOPE_PRECEDENCE,
};

pub use repository::{
    account_is_visible_to, create_account, find_account, find_account_for_caller, list_accounts,
    list_credentials, load_bound_account, resolve_account, resolve_account_credentials,
    resolve_bound_credential_material, resolve_credential_material, revoke_credential,
    set_default_account, soft_delete_account, update_account, upsert_active_credential,
};
