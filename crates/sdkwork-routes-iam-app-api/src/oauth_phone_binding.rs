//! OAuth phone binding: the ownership-proof step that completes a
//! multi-surface account association.
//!
//! A person who registered on the PC owns one IAM account keyed by a verified
//! phone. When they later sign in from a WeChat mini program, an official
//! account, or any other OAuth provider, one of three things is true:
//!
//! 1. the external identity is already linked, and the OAuth flow issues a
//!    session directly (handled by `oauth_login`);
//! 2. the provider asserted a verified phone that already belongs to the
//!    account, and the tenant allows silent association (`oauth_login`);
//! 3. the identity cannot be linked without proof of phone ownership.
//!
//! Case 3 is this module. A short-lived ticket is issued instead of a session;
//! the client collects a phone number plus an SMS code, and only then is the
//! external identity attached to whichever account owns that phone (or a new
//! account created when none exists and registration is allowed). The ticket is
//! consumed exactly once, so a replayed completion cannot mint a second
//! session or a second link.

use serde_json::{json, Value};
use sqlx::PgPool;

use crate::{
    contacts::{normalize_contact_target, ContactBindingKind},
    oauth_login::{
        create_oauth_user, find_user_id_by_phone, link_oauth_identity, upsert_oauth_account_link,
    },
    state::{LocalIamConfig, LocalIamUser},
    utils::{current_millis, fixed_verification_code_allowed},
};

use sdkwork_iam_web_adapter::{
    messaging_verification_enabled, verify_and_consume_messaging_challenge,
    AccountBindingPolicyDocument, LocalOAuthProviderProfile, MessagingVerificationRequest,
    MESSAGING_VERIFICATION_SCENE_OAUTH_PHONE_BINDING,
};

/// Wire challenge type returned while a phone-binding step is outstanding.
pub(crate) const OAUTH_PHONE_BINDING_CHALLENGE_TYPE: &str = "OAUTH_PHONE_BINDING_REQUIRED";

/// The persisted pending association.
#[derive(Clone)]
pub(crate) struct PendingOAuthPhoneBinding {
    pub tenant_id: String,
    pub runtime_app_id: String,
    /// Client device identity captured when the challenge was raised, so the
    /// session issued after the ownership proof still replaces the previous
    /// session of that device instead of leaving a stale one behind.
    pub device_id: Option<String>,
    pub provider: String,
    pub integration_id: String,
    pub profile: LocalOAuthProviderProfile,
    /// `missing_phone` or `existing_account`; echoed to the client so the
    /// binding screen can explain why the extra step appeared.
    pub reason: String,
    pub masked_phone: Option<String>,
    pub expire_time_millis: u128,
    /// Development-only verification code staged by the code-request call.
    pub dev_code: Option<String>,
    /// Phone the code-request call sent the code to. Completion must bind the
    /// same number, so a code minted for one number cannot claim another.
    pub requested_phone: Option<String>,
}

impl PendingOAuthPhoneBinding {
    pub(crate) fn new(
        tenant_id: &str,
        runtime_app_id: &str,
        profile: &LocalOAuthProviderProfile,
        integration_id: &str,
        reason: &str,
        masked_phone: Option<String>,
        ttl_millis: u128,
        device_id: Option<&str>,
    ) -> Self {
        Self {
            tenant_id: tenant_id.to_owned(),
            runtime_app_id: runtime_app_id.to_owned(),
            device_id: device_id
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(str::to_string),
            provider: profile.provider.clone(),
            integration_id: integration_id.to_owned(),
            profile: profile.clone(),
            reason: reason.to_owned(),
            masked_phone,
            expire_time_millis: current_millis() + ttl_millis,
            dev_code: None,
            requested_phone: None,
        }
    }

    fn to_payload(&self) -> Value {
        json!({
            "expireTimeMs": self.expire_time_millis as u64,
            "integrationId": self.integration_id,
            "maskedPhone": self.masked_phone,
            "profile": self.profile,
            "provider": self.provider,
            "reason": self.reason,
            "requestedPhone": self.requested_phone,
            "runtimeAppId": self.runtime_app_id,
            "tenantId": self.tenant_id,
            "deviceId": self.device_id,
            "devCode": self.dev_code,
        })
    }

    fn from_payload(payload: &Value) -> Option<Self> {
        let expire_time_millis = payload.get("expireTimeMs").and_then(Value::as_u64)? as u128;
        let profile: LocalOAuthProviderProfile =
            serde_json::from_value(payload.get("profile")?.clone()).ok()?;
        Some(Self {
            tenant_id: payload.get("tenantId")?.as_str()?.to_string(),
            runtime_app_id: payload.get("runtimeAppId")?.as_str()?.to_string(),
            device_id: payload
                .get("deviceId")
                .and_then(Value::as_str)
                .map(str::to_string),
            provider: payload
                .get("provider")
                .and_then(Value::as_str)
                .unwrap_or(&profile.provider)
                .to_string(),
            integration_id: payload.get("integrationId")?.as_str()?.to_string(),
            profile,
            reason: payload
                .get("reason")
                .and_then(Value::as_str)
                .unwrap_or("missing_phone")
                .to_string(),
            masked_phone: payload
                .get("maskedPhone")
                .and_then(Value::as_str)
                .map(str::to_string),
            expire_time_millis,
            dev_code: payload
                .get("devCode")
                .and_then(Value::as_str)
                .map(str::to_string),
            requested_phone: payload
                .get("requestedPhone")
                .and_then(Value::as_str)
                .map(str::to_string),
        })
    }
}

/// Semantic failure kinds; the HTTP layer maps them onto problem details.
#[derive(Debug)]
pub(crate) enum OAuthPhoneBindingError {
    /// The ticket is unknown, expired, or already consumed.
    TicketInvalid,
    /// The submitted phone number is not a usable phone.
    PhoneInvalid(String),
    /// The submitted verification code is wrong, expired, or replayed.
    CodeInvalid,
    /// No verification-code store is configured on this deployment.
    VerificationUnavailable,
    /// The tenant's policy forbids creating an account for this identity.
    RegistrationDisabled,
    /// The proven phone belongs to an account that cannot sign in.
    AccountUnavailable,
    /// Infrastructure failure while reading or writing the ticket.
    Storage(String),
    /// The link could not be created.
    Resolution(String),
}

/// Issues a fresh ticket for a pending association.
pub(crate) async fn issue_ticket(
    pg: &PgPool,
    binding: &PendingOAuthPhoneBinding,
) -> Result<String, OAuthPhoneBindingError> {
    let token = crate::tokens::generate_opaque_token("oauth-phone-binding");
    crate::ephemeral::upsert_oauth_phone_binding(
        pg,
        LOCAL_BINDING_SCOPE,
        &token,
        binding.expire_time_millis,
        &binding.to_payload(),
    )
    .await
    .map_err(OAuthPhoneBindingError::Storage)?;
    Ok(token)
}

/// Returns the challenge body emitted instead of a session.
pub(crate) fn challenge_json(token: &str, binding: &PendingOAuthPhoneBinding) -> Value {
    json!({
        "accessToken": Value::Null,
        "authToken": Value::Null,
        "refreshToken": Value::Null,
        "challengeType": OAUTH_PHONE_BINDING_CHALLENGE_TYPE,
        "continuationToken": token,
        "expiresAt": binding.expire_time_millis as u64,
        "phoneAssociation": {
            "reason": binding.reason,
            "maskedPhone": binding.masked_phone,
            "provider": binding.provider,
            "verificationCodeScene": MESSAGING_VERIFICATION_SCENE_OAUTH_PHONE_BINDING,
        }
    })
}

/// Requests the ownership-proof code for the phone the client wants to bind.
///
/// Returns the development code when the deployment runs the local fixed-code
/// mode, mirroring `auth/verification_code_requests`.
pub(crate) async fn request_code(
    pg: &PgPool,
    config: &LocalIamConfig,
    expected_tenant_id: &str,
    token: &str,
    phone: &str,
) -> Result<Option<String>, OAuthPhoneBindingError> {
    let phone = normalize_contact_target(ContactBindingKind::Phone, phone)
        .map_err(OAuthPhoneBindingError::PhoneInvalid)?;
    let Some(mut binding) = load_ticket(pg, token).await? else {
        return Err(OAuthPhoneBindingError::TicketInvalid);
    };
    if !ticket_belongs_to_tenant(&binding, expected_tenant_id) {
        return Err(OAuthPhoneBindingError::TicketInvalid);
    }

    if !messaging_verification_enabled() && !fixed_verification_code_allowed(config) {
        return Err(OAuthPhoneBindingError::VerificationUnavailable);
    }

    let mut dev_code = None;
    if !messaging_verification_enabled() {
        let code = config
            .dev_fixed_verify_code
            .clone()
            .unwrap_or_else(generate_verification_code);
        binding.dev_code = Some(code.clone());
        dev_code = Some(code);
    }

    // Record the target phone on the ticket so the completion call cannot be
    // steered onto a different number than the one the code was sent to.
    binding.requested_phone = Some(phone);
    crate::ephemeral::upsert_oauth_phone_binding(
        pg,
        LOCAL_BINDING_SCOPE,
        token,
        binding.expire_time_millis,
        &binding.to_payload(),
    )
    .await
    .map_err(OAuthPhoneBindingError::Storage)?;

    Ok(dev_code)
}

/// A completed phone-binding association.
pub(crate) struct CompletedOAuthPhoneBinding {
    pub user: LocalIamUser,
    pub tenant_id: String,
    pub runtime_app_id: String,
    pub provider: String,
    pub device_id: Option<String>,
}

/// Completes the association after the ownership proof succeeded.
pub(crate) async fn complete(
    pg: &PgPool,
    config: &LocalIamConfig,
    policy: &AccountBindingPolicyDocument,
    expected_tenant_id: &str,
    token: &str,
    phone: &str,
    code: &str,
) -> Result<CompletedOAuthPhoneBinding, OAuthPhoneBindingError> {
    let phone = normalize_contact_target(ContactBindingKind::Phone, phone)
        .map_err(OAuthPhoneBindingError::PhoneInvalid)?;
    let code = code.trim();
    if code.is_empty() {
        return Err(OAuthPhoneBindingError::CodeInvalid);
    }

    // The ticket is consumed before verification so a burst of concurrent
    // completion attempts cannot each verify and each create a link.
    let Some(binding) = take_ticket(pg, token).await? else {
        return Err(OAuthPhoneBindingError::TicketInvalid);
    };
    if !ticket_belongs_to_tenant(&binding, expected_tenant_id) {
        return Err(OAuthPhoneBindingError::TicketInvalid);
    }

    verify_binding_code(pg, config, &binding, &phone, code).await?;

    // A code minted for one number must not be replayed to claim another.
    if let Some(requested) = binding.requested_phone.as_deref() {
        if requested != phone {
            return Err(OAuthPhoneBindingError::CodeInvalid);
        }
    }

    let scope = CompletedScope {
        tenant_id: binding.tenant_id.clone(),
        runtime_app_id: binding.runtime_app_id.clone(),
        provider: binding.provider.clone(),
        device_id: binding.device_id.clone(),
    };

    if let Some(user_id) = crate::oauth_login::find_user_id_by_oauth_subject(
        pg,
        &binding.tenant_id,
        &binding.integration_id,
        &binding.profile,
    )
    .await
    .map_err(OAuthPhoneBindingError::Resolution)?
    {
        if let Some(user) = crate::contacts::load_user_by_id(pg, &binding.tenant_id, &user_id)
            .await
            .map_err(OAuthPhoneBindingError::Resolution)?
        {
            crate::oauth_login::upsert_oauth_account_link(
                pg,
                &user,
                &binding.profile,
                &binding.integration_id,
                "phone_binding",
            )
            .await
            .map_err(OAuthPhoneBindingError::Resolution)?;
            return Ok(scope.finish(user));
        }
    }

    let mut proven_profile = binding.profile.clone();
    proven_profile.phone = Some(phone.clone());
    proven_profile.phone_verified = true;

    // A phone owned by a disabled or suspended account must not be reused: the
    // unique phone index would fight the insert, and creating a second account
    // would resurrect an identity the operator took out of service.
    if let Some(status) = crate::oauth_login::phone_owner_status(pg, &binding.tenant_id, &phone)
        .await
        .map_err(OAuthPhoneBindingError::Resolution)?
    {
        if status != "active" {
            return Err(OAuthPhoneBindingError::AccountUnavailable);
        }
    }

    if let Some(user_id) = find_user_id_by_phone(pg, &binding.tenant_id, &phone)
        .await
        .map_err(OAuthPhoneBindingError::Resolution)?
    {
        let user = crate::contacts::load_user_by_id(pg, &binding.tenant_id, &user_id)
            .await
            .map_err(OAuthPhoneBindingError::Resolution)?
            .ok_or_else(|| {
                OAuthPhoneBindingError::Resolution(
                    "phone association target account is unavailable".to_string(),
                )
            })?;
        crate::contacts::mark_phone_verified(pg, &binding.tenant_id, &user.id, &phone)
            .await
            .map_err(OAuthPhoneBindingError::Resolution)?;
        link_oauth_identity(pg, &user, &proven_profile)
            .await
            .map_err(OAuthPhoneBindingError::Resolution)?;
        upsert_oauth_account_link(
            pg,
            &user,
            &proven_profile,
            &binding.integration_id,
            "phone_association",
        )
        .await
        .map_err(OAuthPhoneBindingError::Resolution)?;
        return Ok(scope.finish(user));
    }

    if !policy.oauth_login.auto_registration_enabled {
        return Err(OAuthPhoneBindingError::RegistrationDisabled);
    }

    let user = create_oauth_user(
        pg,
        &binding.tenant_id,
        &binding.integration_id,
        &proven_profile,
    )
    .await
    .map_err(OAuthPhoneBindingError::Resolution)?;
    link_oauth_identity(pg, &user, &proven_profile)
        .await
        .map_err(OAuthPhoneBindingError::Resolution)?;
    upsert_oauth_account_link(
        pg,
        &user,
        &proven_profile,
        &binding.integration_id,
        "phone_binding",
    )
    .await
    .map_err(OAuthPhoneBindingError::Resolution)?;
    Ok(scope.finish(user))
}

struct CompletedScope {
    tenant_id: String,
    runtime_app_id: String,
    provider: String,
    device_id: Option<String>,
}

impl CompletedScope {
    fn finish(self, user: LocalIamUser) -> CompletedOAuthPhoneBinding {
        CompletedOAuthPhoneBinding {
            user,
            tenant_id: self.tenant_id,
            runtime_app_id: self.runtime_app_id,
            provider: self.provider,
            device_id: self.device_id,
        }
    }
}

async fn verify_binding_code(
    pg: &PgPool,
    config: &LocalIamConfig,
    binding: &PendingOAuthPhoneBinding,
    phone: &str,
    code: &str,
) -> Result<(), OAuthPhoneBindingError> {
    if messaging_verification_enabled() {
        return verify_and_consume_messaging_challenge(
            pg,
            &MessagingVerificationRequest {
                tenant_id: &binding.tenant_id,
                organization_id: "0",
                scene_code: MESSAGING_VERIFICATION_SCENE_OAUTH_PHONE_BINDING,
                channel: "sms",
                target: phone,
                code,
            },
        )
        .await
        .map_err(|error| {
            if error.contains("verification code") {
                OAuthPhoneBindingError::CodeInvalid
            } else {
                OAuthPhoneBindingError::Storage(error)
            }
        });
    }

    if fixed_verification_code_allowed(config) {
        let Some(expected) = config.dev_fixed_verify_code.as_deref() else {
            return Err(OAuthPhoneBindingError::VerificationUnavailable);
        };
        if code != expected {
            return Err(OAuthPhoneBindingError::CodeInvalid);
        }
        // The staged dev code is also compared, so a code requested for a
        // different pending ticket cannot be replayed here.
        if let Some(staged) = binding.dev_code.as_deref() {
            if !staged.is_empty() && !constant_time_eq(staged, code) {
                return Err(OAuthPhoneBindingError::CodeInvalid);
            }
        }
        return Ok(());
    }

    Err(OAuthPhoneBindingError::VerificationUnavailable)
}

async fn load_ticket(
    pg: &PgPool,
    token: &str,
) -> Result<Option<PendingOAuthPhoneBinding>, OAuthPhoneBindingError> {
    let Some(payload) = crate::ephemeral::get_oauth_phone_binding(pg, LOCAL_BINDING_SCOPE, token)
        .await
        .map_err(OAuthPhoneBindingError::Storage)?
    else {
        return Ok(None);
    };
    Ok(PendingOAuthPhoneBinding::from_payload(&payload))
}

async fn take_ticket(
    pg: &PgPool,
    token: &str,
) -> Result<Option<PendingOAuthPhoneBinding>, OAuthPhoneBindingError> {
    let Some(payload) = crate::ephemeral::take_oauth_phone_binding(pg, LOCAL_BINDING_SCOPE, token)
        .await
        .map_err(OAuthPhoneBindingError::Storage)?
    else {
        return Ok(None);
    };
    Ok(PendingOAuthPhoneBinding::from_payload(&payload))
}

/// Pending-binding tickets live in the shared pre-session ephemeral namespace,
/// like the OAuth authorization `state`: the caller has no session yet, so no
/// per-tenant artifact scope exists. The token is a 32-byte opaque value, the
/// payload carries the authoritative `tenantId`, and every redemption is
/// checked against the tenant presenting it.
const LOCAL_BINDING_SCOPE: &str = crate::utils::LOCAL_EPHEMERAL_SCOPE;

/// The ticket must belong to the tenant presenting it: the shared ephemeral
/// namespace makes the token globally addressable, and a token minted for one
/// tenant must never be redeemable in another.
fn ticket_belongs_to_tenant(binding: &PendingOAuthPhoneBinding, expected_tenant_id: &str) -> bool {
    let expected = expected_tenant_id.trim();
    // A ticket is always minted with a resolved tenant; tolerate a blank
    // caller scope only when the ticket also carries none.
    binding.tenant_id.trim() == expected
}

fn generate_verification_code() -> String {
    crate::utils::generate_verification_code()
}

fn constant_time_eq(expected: &str, actual: &str) -> bool {
    let expected = expected.as_bytes();
    let actual = actual.as_bytes();
    if expected.len() != actual.len() {
        return false;
    }
    let mut diff = 0u8;
    for (left, right) in expected.iter().zip(actual.iter()) {
        diff |= left ^ right;
    }
    diff == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    fn profile() -> LocalOAuthProviderProfile {
        LocalOAuthProviderProfile {
            provider: "wechat_mini_program".to_string(),
            subject: "openid-1".to_string(),
            open_id: Some("openid-1".to_string()),
            union_id: None,
            union_scope_id: None,
            email: None,
            phone: None,
            phone_verified: false,
            name: None,
            avatar: None,
        }
    }

    #[test]
    fn pending_binding_round_trips_through_its_payload() {
        let binding = PendingOAuthPhoneBinding::new(
            "1001",
            "app-1",
            &profile(),
            "integration-1",
            "missing_phone",
            None,
            60_000,
            Some("web.pc-1"),
        );
        let decoded = PendingOAuthPhoneBinding::from_payload(&binding.to_payload())
            .expect("payload round trip");
        assert_eq!(decoded.tenant_id, "1001");
        assert_eq!(decoded.runtime_app_id, "app-1");
        assert_eq!(decoded.provider, "wechat_mini_program");
        assert_eq!(decoded.integration_id, "integration-1");
        assert_eq!(decoded.reason, "missing_phone");
        assert!(decoded.masked_phone.is_none());
        assert_eq!(decoded.profile.subject, "openid-1");
        // The device binding must survive the challenge: the session issued
        // after the ownership proof replaces that device's previous session.
        assert_eq!(decoded.device_id.as_deref(), Some("web.pc-1"));
    }

    #[test]
    fn challenge_body_never_contains_a_session() {
        let binding = PendingOAuthPhoneBinding::new(
            "1001",
            "app-1",
            &profile(),
            "integration-1",
            "existing_account",
            Some("138****8000".to_string()),
            60_000,
            None,
        );
        let body = challenge_json("ticket-1", &binding);
        assert_eq!(
            body["challengeType"],
            json!(OAUTH_PHONE_BINDING_CHALLENGE_TYPE)
        );
        assert_eq!(body["continuationToken"], json!("ticket-1"));
        assert!(body["accessToken"].is_null());
        assert!(body["authToken"].is_null());
        assert!(body["refreshToken"].is_null());
        assert_eq!(
            body["phoneAssociation"]["maskedPhone"],
            json!("138****8000")
        );
        assert_eq!(
            body["phoneAssociation"]["reason"],
            json!("existing_account")
        );
    }

    #[test]
    fn constant_time_comparison_matches_only_equal_strings() {
        assert!(constant_time_eq("123456", "123456"));
        assert!(!constant_time_eq("123456", "123457"));
        assert!(!constant_time_eq("123456", "12345"));
    }
}
