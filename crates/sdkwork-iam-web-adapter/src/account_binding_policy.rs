use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sqlx::PgPool;

pub const IAM_ACCOUNT_BINDING_POLICY_CODE: &str = "iam.account_binding";

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ContactBindingPolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_true")]
    pub email_enabled: bool,
    #[serde(default = "default_true")]
    pub phone_enabled: bool,
    #[serde(default = "default_true")]
    pub email_change_enabled: bool,
    #[serde(default = "default_true")]
    pub phone_change_enabled: bool,
    #[serde(default)]
    pub email_unbind_enabled: bool,
    #[serde(default)]
    pub phone_unbind_enabled: bool,
    #[serde(default = "default_true")]
    pub require_verification: bool,
}

/// Phone-based account association policy for inbound OAuth login.
///
/// Multi-surface products let a person sign in from a PC browser, a WeChat
/// mini program, an official account, or any other OAuth provider. The phone
/// number is the one stable identifier those surfaces share, so this policy
/// decides whether a provider-verified phone may be used to associate the
/// external identity with an existing IAM account instead of fabricating a
/// duplicate account on every new surface.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OauthLoginPhoneAssociationPolicy {
    /// Master switch. When disabled, the provider phone never associates an
    /// external identity with an existing account, and a phone that already
    /// belongs to another account downgrades to the ownership-proof step
    /// instead of creating a second account on the same phone.
    #[serde(default)]
    pub enabled: bool,
    /// When the provider asserts a verified phone that matches an existing
    /// account, link and sign in directly. When disabled the person must
    /// prove control of the phone with a verification code before the link is
    /// created, which is the defence against provider-side phone spoofing.
    #[serde(default = "default_true")]
    pub auto_link_verified_phone: bool,
    /// Force the phone-binding step for OAuth identities that carry no
    /// trusted phone number, so every account ends up with a verified phone.
    #[serde(default)]
    pub require_phone_binding: bool,
}

impl Default for OauthLoginPhoneAssociationPolicy {
    fn default() -> Self {
        Self {
            enabled: false,
            auto_link_verified_phone: true,
            require_phone_binding: false,
        }
    }
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OauthLoginPolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub allowed_providers: Vec<String>,
    #[serde(default = "default_true")]
    pub auto_registration_enabled: bool,
    #[serde(default)]
    pub phone_association: OauthLoginPhoneAssociationPolicy,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct OauthBindingPolicy {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default)]
    pub self_service_link_enabled: bool,
    #[serde(default)]
    pub self_service_unlink_enabled: bool,
    #[serde(default)]
    pub allowed_providers: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AccountBindingPolicyDocument {
    #[serde(default)]
    pub contact_binding: ContactBindingPolicy,
    #[serde(default)]
    pub oauth_login: OauthLoginPolicy,
    #[serde(default)]
    pub oauth_binding: OauthBindingPolicy,
}

#[derive(Clone, Debug, Default)]
pub struct AccountBindingPolicyOverrides {
    pub contact_binding_enabled: Option<bool>,
    pub oauth_binding_enabled: Option<bool>,
    pub oauth_login_enabled: Option<bool>,
}

fn default_true() -> bool {
    true
}

pub fn default_account_binding_policy() -> AccountBindingPolicyDocument {
    AccountBindingPolicyDocument {
        contact_binding: ContactBindingPolicy {
            enabled: true,
            email_enabled: true,
            phone_enabled: true,
            email_change_enabled: true,
            phone_change_enabled: true,
            email_unbind_enabled: false,
            phone_unbind_enabled: false,
            require_verification: true,
        },
        oauth_login: OauthLoginPolicy {
            enabled: false,
            allowed_providers: Vec::new(),
            auto_registration_enabled: true,
            phone_association: OauthLoginPhoneAssociationPolicy {
                enabled: false,
                auto_link_verified_phone: true,
                require_phone_binding: false,
            },
        },
        oauth_binding: OauthBindingPolicy {
            enabled: false,
            self_service_link_enabled: false,
            self_service_unlink_enabled: false,
            allowed_providers: Vec::new(),
        },
    }
}

pub fn account_binding_policy_to_json(policy: &AccountBindingPolicyDocument) -> Value {
    serde_json::to_value(policy).unwrap_or_else(|_| json!({}))
}

pub fn parse_account_binding_policy(value: &Value) -> AccountBindingPolicyDocument {
    serde_json::from_value(value.clone()).unwrap_or_else(|_| default_account_binding_policy())
}

pub fn merge_account_binding_policy(
    stored: AccountBindingPolicyDocument,
    overrides: &AccountBindingPolicyOverrides,
) -> AccountBindingPolicyDocument {
    let mut policy = stored;
    if let Some(enabled) = overrides.contact_binding_enabled {
        policy.contact_binding.enabled = enabled;
    }
    if let Some(enabled) = overrides.oauth_binding_enabled {
        policy.oauth_binding.enabled = enabled;
    }
    if let Some(enabled) = overrides.oauth_login_enabled {
        policy.oauth_login.enabled = enabled;
    }
    policy
}

pub async fn load_account_binding_policy(
    pg: &PgPool,
    tenant_id: &str,
) -> Result<AccountBindingPolicyDocument, String> {
    let row = sqlx::query_scalar::<_, String>(
        "SELECT policy_json FROM iam_policy \
         WHERE tenant_id = $1 AND code = $2 AND status = 'active' \
         LIMIT 1",
    )
    .bind(tenant_id)
    .bind(IAM_ACCOUNT_BINDING_POLICY_CODE)
    .fetch_optional(pg)
    .await
    .map_err(|error| format!("load account binding policy failed: {error}"))?;

    match row {
        Some(raw) => serde_json::from_str(&raw)
            .map_err(|error| format!("decode account binding policy failed: {error}")),
        None => Ok(default_account_binding_policy()),
    }
}

pub async fn save_account_binding_policy(
    pg: &PgPool,
    tenant_id: &str,
    policy: &AccountBindingPolicyDocument,
) -> Result<(), String> {
    let now = chrono::Utc::now();
    let policy_json = serde_json::to_string(policy)
        .map_err(|error| format!("serialize account binding policy failed: {error}"))?;
    let policy_id = format!("{tenant_id}:account_binding");

    sqlx::query(
        "INSERT INTO iam_policy (id, tenant_id, code, name, policy_json, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $6) \
         ON CONFLICT (tenant_id, code) DO UPDATE SET \
           policy_json = EXCLUDED.policy_json, \
           name = EXCLUDED.name, \
           status = 'active', \
           updated_at = EXCLUDED.updated_at",
    )
    .bind(&policy_id)
    .bind(tenant_id)
    .bind(IAM_ACCOUNT_BINDING_POLICY_CODE)
    .bind("Account binding policy")
    .bind(policy_json)
    .bind(now)
    .execute(pg)
    .await
    .map_err(|error| format!("save account binding policy failed: {error}"))?;

    Ok(())
}

pub fn contact_binding_allowed(
    policy: &AccountBindingPolicyDocument,
    kind: ContactBindingActionKind,
) -> bool {
    if !policy.contact_binding.enabled {
        return false;
    }

    match kind {
        ContactBindingActionKind::BindEmail | ContactBindingActionKind::ChangeEmail => {
            policy.contact_binding.email_enabled
                && (kind != ContactBindingActionKind::ChangeEmail
                    || policy.contact_binding.email_change_enabled)
        }
        ContactBindingActionKind::UnbindEmail => {
            policy.contact_binding.email_enabled && policy.contact_binding.email_unbind_enabled
        }
        ContactBindingActionKind::BindPhone | ContactBindingActionKind::ChangePhone => {
            policy.contact_binding.phone_enabled
                && (kind != ContactBindingActionKind::ChangePhone
                    || policy.contact_binding.phone_change_enabled)
        }
        ContactBindingActionKind::UnbindPhone => {
            policy.contact_binding.phone_enabled && policy.contact_binding.phone_unbind_enabled
        }
    }
}

pub fn oauth_binding_allowed(
    policy: &AccountBindingPolicyDocument,
    action: OauthBindingActionKind,
    provider_code: Option<&str>,
) -> bool {
    if !policy.oauth_binding.enabled {
        return false;
    }

    let provider_allowed = provider_code
        .map(|provider| {
            policy.oauth_binding.allowed_providers.is_empty()
                || policy
                    .oauth_binding
                    .allowed_providers
                    .iter()
                    .any(|allowed| allowed.eq_ignore_ascii_case(provider))
        })
        .unwrap_or(true);

    if !provider_allowed {
        return false;
    }

    match action {
        OauthBindingActionKind::List => true,
        OauthBindingActionKind::Link => policy.oauth_binding.self_service_link_enabled,
        OauthBindingActionKind::Unlink => policy.oauth_binding.self_service_unlink_enabled,
    }
}

pub fn oauth_login_allowed(
    policy: &AccountBindingPolicyDocument,
    provider_code: Option<&str>,
) -> bool {
    if !policy.oauth_login.enabled {
        return false;
    }

    provider_code
        .map(|provider| {
            crate::oauth_provider_catalog::oauth_provider_allowed(
                &policy.oauth_login.allowed_providers,
                provider,
            )
        })
        .unwrap_or(true)
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContactBindingActionKind {
    BindEmail,
    ChangeEmail,
    UnbindEmail,
    BindPhone,
    ChangePhone,
    UnbindPhone,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OauthBindingActionKind {
    List,
    Link,
    Unlink,
}

/// The account-association decision for one inbound OAuth sign-in.
///
/// This is the complete outcome space of the phone-association matrix; the
/// caller maps it onto "issue a session", "link an existing account", or
/// "return a phone-binding challenge".
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum OauthPhoneAssociationOutcome {
    /// A provider-verified phone matched an existing account and the policy
    /// allows silent linking. The external identity is attached and the
    /// person signs in as that account.
    LinkExistingAccount,
    /// The phone belongs to an existing account but silent linking is not
    /// allowed (or the association switch is off). The person must prove
    /// control of the phone before the link is created.
    RequireOwnershipProof,
    /// The OAuth identity carries no trusted phone and the policy requires
    /// one, so the person must bind a phone before an account is issued.
    RequirePhoneBinding,
    /// No account matched and registration is allowed.
    RegisterNewAccount,
    /// No account matched and OAuth auto-registration is disabled.
    RejectRegistrationDisabled,
}

/// True when the tenant allows phone-based account association at all.
#[must_use]
pub fn oauth_phone_association_enabled(policy: &AccountBindingPolicyDocument) -> bool {
    policy.oauth_login.enabled && policy.oauth_login.phone_association.enabled
}

/// True when a phone-binding challenge must be raised instead of silently
/// creating an account: the tenant wants every OAuth account to own a phone.
#[must_use]
pub fn oauth_phone_binding_required(policy: &AccountBindingPolicyDocument) -> bool {
    oauth_phone_association_enabled(policy)
        && policy.oauth_login.phone_association.require_phone_binding
}

/// Decides how one inbound OAuth identity should be turned into a session.
///
/// `provider_phone_present` must only be `true` when the provider asserted a
/// phone number and its verification state is trusted. `existing_account_found`
/// is the result of the caller's tenant-scoped phone lookup and is only
/// consulted together with a present phone.
#[must_use]
pub fn decide_oauth_phone_association(
    policy: &AccountBindingPolicyDocument,
    provider_phone_present: bool,
    existing_account_found: bool,
) -> OauthPhoneAssociationOutcome {
    let oauth_login = &policy.oauth_login;
    let phone_association = &oauth_login.phone_association;
    let registration_enabled = oauth_login.auto_registration_enabled;

    if provider_phone_present && phone_association.enabled {
        if existing_account_found {
            return if phone_association.auto_link_verified_phone {
                OauthPhoneAssociationOutcome::LinkExistingAccount
            } else {
                OauthPhoneAssociationOutcome::RequireOwnershipProof
            };
        }
        return if registration_enabled {
            OauthPhoneAssociationOutcome::RegisterNewAccount
        } else {
            OauthPhoneAssociationOutcome::RejectRegistrationDisabled
        };
    }

    // A phone that another account already owns must never be cloned onto a
    // second account: the single-phone index is the identity invariant.
    if existing_account_found {
        return OauthPhoneAssociationOutcome::RequireOwnershipProof;
    }

    if phone_association.enabled && phone_association.require_phone_binding {
        return OauthPhoneAssociationOutcome::RequirePhoneBinding;
    }

    if registration_enabled {
        OauthPhoneAssociationOutcome::RegisterNewAccount
    } else {
        OauthPhoneAssociationOutcome::RejectRegistrationDisabled
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn contact_binding_respects_master_and_channel_switches() {
        let policy = AccountBindingPolicyDocument {
            contact_binding: ContactBindingPolicy {
                enabled: true,
                email_enabled: true,
                phone_enabled: false,
                email_change_enabled: true,
                phone_change_enabled: true,
                email_unbind_enabled: true,
                phone_unbind_enabled: false,
                require_verification: true,
            },
            ..Default::default()
        };

        assert!(contact_binding_allowed(
            &policy,
            ContactBindingActionKind::BindEmail
        ));
        assert!(!contact_binding_allowed(
            &policy,
            ContactBindingActionKind::BindPhone
        ));
        assert!(contact_binding_allowed(
            &policy,
            ContactBindingActionKind::UnbindEmail
        ));
        assert!(!contact_binding_allowed(
            &policy,
            ContactBindingActionKind::UnbindPhone
        ));
    }

    #[test]
    fn oauth_list_is_available_when_feature_enabled() {
        let policy = AccountBindingPolicyDocument {
            oauth_binding: OauthBindingPolicy {
                enabled: true,
                self_service_link_enabled: false,
                self_service_unlink_enabled: false,
                allowed_providers: vec!["github".to_owned()],
            },
            ..Default::default()
        };

        assert!(oauth_binding_allowed(
            &policy,
            OauthBindingActionKind::List,
            None
        ));
        assert!(!oauth_binding_allowed(
            &policy,
            OauthBindingActionKind::Link,
            Some("github")
        ));
        assert!(!oauth_binding_allowed(
            &policy,
            OauthBindingActionKind::Link,
            Some("google")
        ));
    }

    fn oauth_login_policy(
        enabled: bool,
        registration: bool,
        phone_enabled: bool,
        auto_link: bool,
        require_binding: bool,
    ) -> AccountBindingPolicyDocument {
        AccountBindingPolicyDocument {
            oauth_login: OauthLoginPolicy {
                enabled,
                allowed_providers: Vec::new(),
                auto_registration_enabled: registration,
                phone_association: OauthLoginPhoneAssociationPolicy {
                    enabled: phone_enabled,
                    auto_link_verified_phone: auto_link,
                    require_phone_binding: require_binding,
                },
            },
            ..Default::default()
        }
    }

    #[test]
    fn verified_phone_links_existing_account_when_policy_allows_it() {
        let policy = oauth_login_policy(true, true, true, true, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, true, true),
            OauthPhoneAssociationOutcome::LinkExistingAccount
        );
    }

    #[test]
    fn verified_phone_requires_ownership_proof_when_auto_link_is_off() {
        let policy = oauth_login_policy(true, true, true, false, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, true, true),
            OauthPhoneAssociationOutcome::RequireOwnershipProof
        );
    }

    #[test]
    fn disabled_association_never_clones_a_phone_onto_a_second_account() {
        let policy = oauth_login_policy(true, true, false, true, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, true, true),
            OauthPhoneAssociationOutcome::RequireOwnershipProof
        );
    }

    #[test]
    fn phone_less_oauth_requires_binding_when_policy_demands_it() {
        let policy = oauth_login_policy(true, true, true, true, true);
        assert_eq!(
            decide_oauth_phone_association(&policy, false, false),
            OauthPhoneAssociationOutcome::RequirePhoneBinding
        );

        let policy = oauth_login_policy(true, true, true, true, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, false, false),
            OauthPhoneAssociationOutcome::RegisterNewAccount
        );
    }

    #[test]
    fn registration_disabled_rejects_unknown_identities() {
        let policy = oauth_login_policy(true, false, true, true, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, true, false),
            OauthPhoneAssociationOutcome::RejectRegistrationDisabled
        );
        assert_eq!(
            decide_oauth_phone_association(&policy, false, false),
            OauthPhoneAssociationOutcome::RejectRegistrationDisabled
        );
    }

    #[test]
    fn unverified_phone_of_an_existing_account_still_needs_proof() {
        // No provider phone at all, but the caller resolved a collision.
        let policy = oauth_login_policy(true, true, true, true, false);
        assert_eq!(
            decide_oauth_phone_association(&policy, false, true),
            OauthPhoneAssociationOutcome::RequireOwnershipProof
        );
    }

    #[test]
    fn phone_association_round_trips_through_the_policy_document() {
        let policy = oauth_login_policy(true, true, true, false, true);
        let json = account_binding_policy_to_json(&policy);
        assert_eq!(
            json["oauthLogin"]["phoneAssociation"]["enabled"],
            json!(true)
        );
        assert_eq!(
            json["oauthLogin"]["phoneAssociation"]["autoLinkVerifiedPhone"],
            json!(false)
        );
        assert_eq!(
            json["oauthLogin"]["phoneAssociation"]["requirePhoneBinding"],
            json!(true)
        );
        assert_eq!(parse_account_binding_policy(&json), policy);
    }

    #[test]
    fn legacy_policy_documents_default_to_safe_phone_association() {
        // A document persisted before this policy existed must keep the old
        // behavior: phone association off, silent linking allowed but unused.
        let legacy = json!({
            "oauthLogin": {
                "enabled": true,
                "allowedProviders": ["wechat_mini_program"],
                "autoRegistrationEnabled": true
            }
        });
        let policy = parse_account_binding_policy(&legacy);
        assert!(policy.oauth_login.enabled);
        assert!(!policy.oauth_login.phone_association.enabled);
        assert!(
            policy
                .oauth_login
                .phone_association
                .auto_link_verified_phone
        );
        assert!(!policy.oauth_login.phone_association.require_phone_binding);
    }
}
