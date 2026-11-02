//! Relying-party (SDKWork OAuth client) registration for tenant applications.
//!
//! The SDKWork authorization server resolves an OAuth client from an enabled
//! `iam_tenant_application` row and its `runtime_config_json.oauth.relyingParty`
//! document (`IAM_OAUTH_SPEC.md` section 4.2). Nothing else registers a client:
//! an application that never writes that document answers `invalid_client` at
//! `/iam/v3/oauth/authorize`, which is the failure this module removes.
//!
//! This module owns the one normalization path used by application
//! self-registration (embedded bootstrap from `agent.app.config.json`), admin
//! provisioning, and admin updates, so the three entry points cannot drift:
//!
//! - `clientId` defaults to the tenant application `app_id` and may name a
//!   brand-level client id instead (`birdcoder` for `sdkwork-birdcoder`).
//! - Redirect URIs are absolute, fragment-free, and never wildcarded; a
//!   loopback `http://127.0.0.1/...` matches any port per RFC 8252.
//! - Allowed scopes are a subset of the standard scope set and always include
//!   `openid`.
//! - A confidential registration stores an Argon2id hash only; a plaintext
//!   secret is hashed here and never persisted.
//!
//! Auto-registration from an application manifest is policy-controlled and
//! fails closed (`IAM_OAUTH_SPEC.md` section 3): the
//! `SDKWORK_IAM_OAUTH_AUTO_REGISTRATION` variable decides, with development
//! and test lifecycles defaulting to enabled so a source checkout can sign in.

use argon2::password_hash::{rand_core::OsRng, PasswordHash, SaltString};
use argon2::{Argon2, PasswordHasher};
use serde_json::{json, Value};

/// Standard scopes advertised by the SDKWork authorization server.
pub const OAUTH_SUPPORTED_SCOPES: &[&str] = &[
    "openid",
    "profile",
    "email",
    "phone",
    "tenant",
    "organization",
    "offline_access",
];

/// Policy variable for manifest-driven relying-party auto-registration.
pub const OAUTH_AUTO_REGISTRATION_ENV: &str = "SDKWORK_IAM_OAUTH_AUTO_REGISTRATION";

/// Alias kept for deployments that already spell the switch as a boolean.
pub const OAUTH_AUTO_REGISTRATION_ENABLED_ENV: &str =
    "SDKWORK_IAM_OAUTH_AUTO_REGISTRATION_ENABLED";

const MAX_CLIENT_ID_LEN: usize = 64;
const MAX_REDIRECT_URI_LEN: usize = 2048;
const MAX_REDIRECT_URIS: usize = 20;
const MAX_ALLOWED_SCOPES: usize = 16;
const MIN_CLIENT_SECRET_LEN: usize = 16;
const MAX_CLIENT_SECRET_LEN: usize = 256;

/// Raw relying-party registration as supplied by a manifest or an admin caller.
///
/// Optional fields distinguish "not supplied" from an explicit value so an
/// update can preserve an existing secret and keep the previous `enabled` flag.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RelyingPartyRegistration {
    pub enabled: Option<bool>,
    pub client_id: Option<String>,
    pub redirect_uris: Vec<String>,
    pub allowed_scopes: Vec<String>,
    pub confidential: Option<bool>,
    /// Plaintext secret supplied by an operator. Hashed before persistence.
    pub client_secret: Option<String>,
    /// Precomputed Argon2id PHC hash supplied by an operator or a migration.
    pub client_secret_hash: Option<String>,
}

/// Parses a `runtimeConfig.oauth.relyingParty` document.
///
/// Both camelCase (wire) and snake_case (database-adjacent) spellings are
/// accepted so a hand-written manifest or an exported config round-trips.
/// Unknown keys are ignored to keep additive evolution non-breaking.
/// @param value - the candidate document; must be a JSON object.
/// @returns the parsed registration with only explicitly supplied fields set.
/// @throws `Err` when a field has the wrong JSON type.
pub fn parse_relying_party_registration(value: &Value) -> Result<RelyingPartyRegistration, String> {
    let Some(object) = value.as_object() else {
        return Err("OAuth relyingParty must be an object".to_string());
    };

    let enabled = read_optional_bool(object, &["enabled"])?;
    let confidential = read_optional_bool(object, &["confidential", "isConfidential"])?;
    let client_id = read_optional_text(object, &["clientId", "client_id"])?;
    let client_secret = read_optional_text(object, &["clientSecret", "client_secret"])?;
    let client_secret_hash =
        read_optional_text(object, &["clientSecretHash", "client_secret_hash"])?;
    let redirect_uris = read_text_list(object, &["redirectUris", "redirect_uris"])?;
    let allowed_scopes = read_text_list(
        object,
        &["allowedScopes", "allowed_scopes", "scopes"],
    )?;

    Ok(RelyingPartyRegistration {
        enabled,
        client_id,
        redirect_uris,
        allowed_scopes,
        confidential,
        client_secret,
        client_secret_hash,
    })
}

/// Normalizes a registration into the persisted relying-party document.
///
/// @param registration - parsed operator or manifest input.
/// @param app_id - the owning tenant application runtime `app_id`; the default
///   OAuth client id.
/// @param existing - the currently persisted relying party, when updating.
///   Used only to preserve an already hashed secret.
/// @returns the canonical `{enabled, clientId, redirectUris, allowedScopes,
///   confidential, clientSecretHash?}` document.
/// @throws `Err` when the client id, a redirect URI, the scope set, or the
///   secret is invalid. Callers surface the message as a 400.
pub fn normalize_relying_party_registration(
    registration: &RelyingPartyRegistration,
    app_id: &str,
    existing: Option<&Value>,
) -> Result<Value, String> {
    let client_id = registration
        .client_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(app_id)
        .to_owned();
    validate_oauth_client_id(&client_id)?;

    let enabled = registration.enabled.unwrap_or(false);
    let confidential = registration.confidential.unwrap_or(false);

    let redirect_uris = normalize_redirect_uris(&registration.redirect_uris)?;
    let allowed_scopes = normalize_allowed_scopes(&registration.allowed_scopes)?;

    let client_secret_hash =
        resolve_client_secret_hash(registration, confidential, existing)?;

    let mut document = json!({
        "enabled": enabled,
        "clientId": client_id,
        "redirectUris": redirect_uris,
        "allowedScopes": allowed_scopes,
        "confidential": confidential,
    });
    if let Some(hash) = client_secret_hash {
        document["clientSecretHash"] = Value::String(hash);
    } else {
        // An explicit null removes a stored hash when a registration moves
        // from confidential to public; the merge treats null as removal.
        document["clientSecretHash"] = Value::Null;
    }
    Ok(document)
}

/// Merges a normalized registration into a tenant application runtime config.
///
/// Deep-merges through `oauth.relyingParty` so `auth.*`, other `oauth.*`
/// entries, and unrelated runtime config survive an update.
/// @param runtime_config - the current runtime config (`{}` when absent).
/// @param relying_party - a document produced by
///   [`normalize_relying_party_registration`].
/// @returns the updated runtime config.
pub fn merge_relying_party_registration(runtime_config: &Value, relying_party: &Value) -> Value {
    crate::application_registry::merge_runtime_config_patch(
        runtime_config,
        &json!({ "oauth": { "relyingParty": relying_party } }),
    )
}

/// Builds the admin-facing summary of a relying party stored in runtime config.
///
/// The hash itself never leaves the server; `hasClientSecret` is all an admin
/// list needs to show that a secret is configured.
/// @param runtime_config - the tenant application runtime config.
/// @returns the summary, or `None` when no relying party is registered.
#[must_use]
pub fn oauth_relying_party_summary(runtime_config: &Value) -> Option<Value> {
    let relying_party = runtime_config.pointer("/oauth/relyingParty")?;
    if !relying_party.is_object() {
        return None;
    }
    let config = crate::oauth_authorization_server::parse_relying_party_config(runtime_config);
    Some(json!({
        "enabled": config.enabled,
        "clientId": config.client_id,
        "redirectUris": config.redirect_uris,
        "allowedScopes": config.allowed_scopes,
        "confidential": config.confidential,
        "hasClientSecret": config
            .client_secret_hash
            .as_deref()
            .is_some_and(|value| !value.trim().is_empty()),
    }))
}

/// Whether manifest-driven auto-registration may run for this lifecycle.
///
/// Explicit environment configuration wins in both directions. Without it,
/// development and test lifecycles default to enabled so a source checkout can
/// complete its own sign-in, and every other lifecycle fails closed.
/// @param environment - the bootstrap lifecycle (`development`, `test`, ...).
/// @returns `true` when a manifest may register its relying party.
#[must_use]
pub fn auto_registration_enabled(environment: &str) -> bool {
    for key in [OAUTH_AUTO_REGISTRATION_ENV, OAUTH_AUTO_REGISTRATION_ENABLED_ENV] {
        let Ok(raw) = std::env::var(key) else {
            continue;
        };
        let normalized = raw.trim().to_ascii_lowercase();
        if normalized.is_empty() {
            continue;
        }
        return matches!(
            normalized.as_str(),
            "enabled" | "enable" | "true" | "1" | "yes" | "on"
        );
    }

    let lifecycle = environment.trim().to_ascii_lowercase();
    matches!(lifecycle.as_str(), "dev" | "local")
        || lifecycle.contains("development")
        || lifecycle.contains("test")
}

/// Hashes a plaintext client secret with Argon2id and a random salt.
///
/// @param secret - the plaintext secret, 16 to 256 characters.
/// @returns the PHC string persisted as `clientSecretHash`.
/// @throws `Err` when the secret is too short, too long, or hashing fails.
pub fn hash_oauth_client_secret(secret: &str) -> Result<String, String> {
    let secret = secret.trim();
    let length = secret.chars().count();
    if length < MIN_CLIENT_SECRET_LEN {
        return Err(format!(
            "OAuth client secret must be at least {MIN_CLIENT_SECRET_LEN} characters"
        ));
    }
    if length > MAX_CLIENT_SECRET_LEN {
        return Err(format!(
            "OAuth client secret must be at most {MAX_CLIENT_SECRET_LEN} characters"
        ));
    }
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| format!("hash OAuth client secret failed: {error}"))
}

/// Validates an OAuth client id.
///
/// Client ids appear in URLs and storage keys, so the accepted alphabet is the
/// RFC 7636 unreserved subset rather than arbitrary text.
/// @param client_id - the candidate id.
/// @returns `Ok(())` when acceptable.
/// @throws `Err` describing the violated rule.
pub fn validate_oauth_client_id(client_id: &str) -> Result<(), String> {
    let length = client_id.chars().count();
    if length == 0 || length > MAX_CLIENT_ID_LEN {
        return Err(format!(
            "OAuth clientId must be 1-{MAX_CLIENT_ID_LEN} characters"
        ));
    }
    let mut chars = client_id.chars();
    let Some(first) = chars.next() else {
        return Err("OAuth clientId must not be empty".to_string());
    };
    if !first.is_ascii_lowercase() && !first.is_ascii_digit() {
        return Err(
            "OAuth clientId must start with a lowercase letter or digit".to_string(),
        );
    }
    if !client_id
        .chars()
        .all(|value| value.is_ascii_lowercase() || value.is_ascii_digit() || matches!(value, '-' | '_' | '.'))
    {
        return Err(
            "OAuth clientId may only contain lowercase letters, digits, '-', '_', and '.'"
                .to_string(),
        );
    }
    Ok(())
}

/// Validates one registered redirect URI.
///
/// Accepts `http`/`https` URLs with a host and custom-scheme native callbacks
/// such as `birdcoder://auth/callback`. Rejects wildcards, fragments, embedded
/// userinfo, and executable schemes.
/// @param redirect_uri - the candidate URI.
/// @returns `Ok(())` when acceptable.
/// @throws `Err` describing the violated rule.
pub fn validate_redirect_uri(redirect_uri: &str) -> Result<(), String> {
    let uri = redirect_uri.trim();
    if uri.is_empty() {
        return Err("OAuth redirectUris must not contain empty values".to_string());
    }
    if uri.chars().count() > MAX_REDIRECT_URI_LEN {
        return Err(format!(
            "OAuth redirect URI must be at most {MAX_REDIRECT_URI_LEN} characters"
        ));
    }
    if uri
        .chars()
        .any(|value| value.is_whitespace() || value.is_control())
    {
        return Err(format!("OAuth redirect URI {uri} must not contain whitespace"));
    }
    if uri.contains('#') {
        return Err(format!(
            "OAuth redirect URI {uri} must not contain a fragment"
        ));
    }
    if uri.contains('*') {
        return Err(format!(
            "OAuth redirect URI {uri} must not contain a wildcard"
        ));
    }
    // Native callbacks are absolute URIs whose path may follow a single slash
    // (`com.example.app:/oauth2redirect`, the RFC 8252 iOS convention) as well
    // as the `scheme://host` form. Only http(s) requires an authority.
    let (scheme, rest, absolute_authority) = if let Some((scheme, rest)) = uri.split_once("://") {
        (scheme, rest, true)
    } else if let Some((scheme, _)) = uri.split_once(":/") {
        (scheme, &uri[scheme.len() + 1..], false)
    } else {
        return Err(format!(
            "OAuth redirect URI {uri} must be absolute and include a scheme"
        ));
    };
    if scheme.is_empty() || scheme.len() > 32 {
        return Err(format!("OAuth redirect URI {uri} has an invalid scheme"));
    }
    let normalized_scheme = scheme.to_ascii_lowercase();
    if !normalized_scheme
        .chars()
        .enumerate()
        .all(|(index, value)| {
            if index == 0 {
                value.is_ascii_lowercase()
            } else {
                value.is_ascii_lowercase()
                    || value.is_ascii_digit()
                    || matches!(value, '+' | '-' | '.')
            }
        })
    {
        return Err(format!("OAuth redirect URI {uri} has an invalid scheme"));
    }
    if matches!(
        normalized_scheme.as_str(),
        "javascript" | "data" | "file" | "about" | "blob" | "vbscript" | "chrome" | "chrome-extension"
    ) {
        return Err(format!(
            "OAuth redirect URI {uri} uses a forbidden scheme"
        ));
    }
    if rest.is_empty() {
        return Err(format!(
            "OAuth redirect URI {uri} must name a host or callback path"
        ));
    }

    if matches!(normalized_scheme.as_str(), "http" | "https") {
        if !absolute_authority {
            return Err(format!(
                "OAuth redirect URI {uri} must use the http(s)://host form"
            ));
        }
        let authority_end = rest.find(['/', '?']).unwrap_or(rest.len());
        if authority_end == 0 {
            return Err(format!("OAuth redirect URI {uri} must include a host"));
        }
        let authority = &rest[..authority_end];
        if authority.is_empty() {
            return Err(format!("OAuth redirect URI {uri} must include a host"));
        }
        if authority.contains('@') {
            return Err(format!(
                "OAuth redirect URI {uri} must not embed userinfo"
            ));
        }
        let (host, port) = if let Some(stripped) = authority.strip_prefix('[') {
            // IPv6 literal: the colons inside the brackets are not a port
            // separator, so the port (if any) follows the closing bracket.
            let Some(end) = stripped.find(']') else {
                return Err(format!(
                    "OAuth redirect URI {uri} has an invalid IPv6 host"
                ));
            };
            let host = &stripped[..end];
            let suffix = &stripped[end + 1..];
            let port = match suffix.strip_prefix(':') {
                Some(port) => Some(port),
                None if suffix.is_empty() => None,
                None => {
                    return Err(format!(
                        "OAuth redirect URI {uri} has an invalid host suffix"
                    ))
                }
            };
            (host, port)
        } else if let Some((host, port)) = authority.rsplit_once(':') {
            (host, Some(port))
        } else {
            (authority, None)
        };
        if host.is_empty() {
            return Err(format!("OAuth redirect URI {uri} must include a host"));
        }
        if let Some(port) = port {
            if !port.is_empty()
                && (!port.chars().all(|value| value.is_ascii_digit())
                    || port.parse::<u16>().is_err())
            {
                return Err(format!(
                    "OAuth redirect URI {uri} has an invalid port"
                ));
            }
        }
    }

    Ok(())
}

fn resolve_client_secret_hash(
    registration: &RelyingPartyRegistration,
    confidential: bool,
    existing: Option<&Value>,
) -> Result<Option<String>, String> {
    if !confidential {
        if registration
            .client_secret
            .as_deref()
            .is_some_and(|value| !value.trim().is_empty())
            || registration
                .client_secret_hash
                .as_deref()
                .is_some_and(|value| !value.trim().is_empty())
        {
            return Err(
                "OAuth public relying party must not declare a client secret".to_string(),
            );
        }
        return Ok(None);
    }

    if let Some(secret) = registration
        .client_secret
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        return hash_oauth_client_secret(secret).map(Some);
    }
    if let Some(hash) = registration
        .client_secret_hash
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        PasswordHash::new(hash)
            .map_err(|_| "OAuth clientSecretHash must be an Argon2id password hash".to_string())?;
        return Ok(Some(hash.to_owned()));
    }

    let preserved = existing
        .and_then(|value| value.get("clientSecretHash"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if let Some(hash) = preserved {
        PasswordHash::new(hash)
            .map_err(|_| "stored OAuth clientSecretHash is not a valid password hash".to_string())?;
        return Ok(Some(hash.to_owned()));
    }

    Err(
        "OAuth confidential relying party requires a client secret (16+ characters) or a precomputed clientSecretHash"
            .to_string(),
    )
}

fn normalize_redirect_uris(raw: &[String]) -> Result<Vec<String>, String> {
    if raw.is_empty() {
        return Err("OAuth relyingParty redirectUris must not be empty".to_string());
    }
    let mut normalized = Vec::new();
    for uri in raw {
        let uri = uri.trim();
        if uri.is_empty() {
            return Err("OAuth redirectUris must not contain empty values".to_string());
        }
        validate_redirect_uri(uri)?;
        if !normalized.iter().any(|existing| existing == uri) {
            normalized.push(uri.to_owned());
        }
    }
    if normalized.len() > MAX_REDIRECT_URIS {
        return Err(format!(
            "OAuth relyingParty may register at most {MAX_REDIRECT_URIS} redirect URIs"
        ));
    }
    Ok(normalized)
}

fn normalize_allowed_scopes(raw: &[String]) -> Result<Vec<String>, String> {
    let mut scopes = Vec::new();
    for scope in raw {
        let scope = scope.trim();
        if scope.is_empty() {
            continue;
        }
        if !OAUTH_SUPPORTED_SCOPES.contains(&scope) {
            return Err(format!("OAuth scope {scope} is not a supported scope"));
        }
        if !scopes.iter().any(|existing| existing == scope) {
            scopes.push(scope.to_owned());
        }
    }
    if scopes.is_empty() {
        return Err("OAuth relyingParty allowedScopes must not be empty".to_string());
    }
    if !scopes.iter().any(|scope| scope == "openid") {
        return Err("OAuth relyingParty allowedScopes must include openid".to_string());
    }
    if scopes.len() > MAX_ALLOWED_SCOPES {
        return Err(format!(
            "OAuth relyingParty may allow at most {MAX_ALLOWED_SCOPES} scopes"
        ));
    }
    Ok(scopes)
}

fn read_optional_text(
    object: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Result<Option<String>, String> {
    for key in keys {
        let Some(value) = object.get(*key) else {
            continue;
        };
        if value.is_null() {
            return Ok(None);
        }
        let Some(text) = value.as_str() else {
            return Err(format!("OAuth relyingParty {key} must be a string"));
        };
        let text = text.trim();
        return Ok((!text.is_empty()).then(|| text.to_owned()));
    }
    Ok(None)
}

fn read_optional_bool(
    object: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Result<Option<bool>, String> {
    for key in keys {
        let Some(value) = object.get(*key) else {
            continue;
        };
        if value.is_null() {
            return Ok(None);
        }
        let Some(flag) = value.as_bool() else {
            return Err(format!("OAuth relyingParty {key} must be a boolean"));
        };
        return Ok(Some(flag));
    }
    Ok(None)
}

fn read_text_list(
    object: &serde_json::Map<String, Value>,
    keys: &[&str],
) -> Result<Vec<String>, String> {
    for key in keys {
        let Some(value) = object.get(*key) else {
            continue;
        };
        if value.is_null() {
            return Ok(Vec::new());
        }
        let Some(items) = value.as_array() else {
            return Err(format!(
                "OAuth relyingParty {key} must be an array of strings"
            ));
        };
        let mut texts = Vec::with_capacity(items.len());
        for item in items {
            let Some(text) = item.as_str() else {
                return Err(format!(
                    "OAuth relyingParty {key} must be an array of strings"
                ));
            };
            texts.push(text.to_owned());
        }
        return Ok(texts);
    }
    Ok(Vec::new())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn registration(value: Value) -> RelyingPartyRegistration {
        parse_relying_party_registration(&value).expect("parse registration")
    }

    #[test]
    fn client_id_defaults_to_the_tenant_application_app_id() {
        let value = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/auth/oauth/callback"],
            "allowedScopes": ["openid", "profile"],
            "confidential": false
        });
        let normalized =
            normalize_relying_party_registration(&registration(value), "sdkwork-birdcoder", None)
                .expect("normalize");
        assert_eq!(normalized["clientId"], json!("sdkwork-birdcoder"));
        assert_eq!(normalized["enabled"], json!(true));
        assert!(normalized["clientSecretHash"].is_null());
    }

    #[test]
    fn client_id_override_allows_a_brand_level_client_id() {
        let value = json!({
            "enabled": true,
            "clientId": "birdcoder",
            "redirectUris": ["birdcoder://auth/callback"],
            "allowedScopes": ["openid", "profile", "offline_access"],
            "confidential": false
        });
        let normalized =
            normalize_relying_party_registration(&registration(value), "sdkwork-birdcoder", None)
                .expect("normalize");
        assert_eq!(normalized["clientId"], json!("birdcoder"));
        assert_eq!(normalized["redirectUris"], json!(["birdcoder://auth/callback"]));
    }

    #[test]
    fn invalid_client_ids_are_rejected() {
        let long_client_id = "a".repeat(65);
        for client_id in ["", "Birdcoder", "bird coder", "a/b", long_client_id.as_str()] {
            assert!(
                validate_oauth_client_id(client_id).is_err(),
                "client id {client_id:?} must be rejected"
            );
        }
        assert!(validate_oauth_client_id("sdkwork-birdcoder").is_ok());
        assert!(validate_oauth_client_id("birdcoder_2").is_ok());
    }

    #[test]
    fn redirect_uri_validation_accepts_web_loopback_and_native_surfaces() {
        for uri in [
            "https://forum.example.com/auth/oauth/callback",
            "http://127.0.0.1/oauth/callback",
            "http://localhost:5173/oauth/callback",
            "http://[::1]:41017/oauth/callback",
            "birdcoder://auth/callback",
            "com.sdkwork.birdcoder:/oauth/callback",
        ] {
            assert!(validate_redirect_uri(uri).is_ok(), "{uri} must be accepted");
        }
    }

    #[test]
    fn redirect_uri_validation_rejects_wildcards_fragments_and_relative_values() {
        for uri in [
            "https://*.example.com/callback",
            "https://forum.example.com/callback#fragment",
            "/oauth/callback",
            "javascript://alert(1)",
            "https://user:pass@forum.example.com/callback",
            "https://forum.example.com:not-a-port/callback",
            "https:///callback",
            "http://[::1/callback",
        ] {
            assert!(validate_redirect_uri(uri).is_err(), "{uri} must be rejected");
        }
    }

    #[test]
    fn allowed_scopes_must_be_supported_and_include_openid() {
        let missing_openid = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["profile"]
        });
        assert!(normalize_relying_party_registration(
            &registration(missing_openid),
            "sdkwork-forum",
            None
        )
        .is_err());

        let unknown_scope = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid", "admin"]
        });
        assert!(normalize_relying_party_registration(
            &registration(unknown_scope),
            "sdkwork-forum",
            None
        )
        .is_err());
    }

    #[test]
    fn confidential_registration_hashes_a_plaintext_secret() {
        let value = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": true,
            "clientSecret": "correct horse battery staple"
        });
        let normalized =
            normalize_relying_party_registration(&registration(value), "sdkwork-forum", None)
                .expect("normalize");
        let hash = normalized["clientSecretHash"].as_str().expect("hash");
        assert!(hash.starts_with("$argon2"));
        assert!(!hash.contains("correct horse battery staple"));
    }

    #[test]
    fn confidential_update_without_a_secret_preserves_the_stored_hash() {
        let stored = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": true,
            "clientSecretHash": "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$Zm9vYmFyYmF6cXV4"
        });
        let value = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": true
        });
        let normalized =
            normalize_relying_party_registration(&registration(value), "sdkwork-forum", Some(&stored))
                .expect("normalize");
        assert_eq!(
            normalized["clientSecretHash"],
            stored["clientSecretHash"]
        );
    }

    #[test]
    fn confidential_registration_requires_a_secret() {
        let value = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": true
        });
        assert!(
            normalize_relying_party_registration(&registration(value), "sdkwork-forum", None)
                .is_err()
        );
    }

    #[test]
    fn public_registration_drops_a_stored_secret() {
        let stored = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": true,
            "clientSecretHash": "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$Zm9vYmFyYmF6cXV4"
        });
        let value = json!({
            "enabled": true,
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": false
        });
        let normalized =
            normalize_relying_party_registration(&registration(value), "sdkwork-forum", Some(&stored))
                .expect("normalize");
        assert!(normalized["clientSecretHash"].is_null());
    }

    #[test]
    fn merge_removes_a_secret_hash_when_the_registration_becomes_public() {
        let runtime_config = json!({
            "auth": { "supportsLocalCredentials": true },
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "clientId": "sdkwork-forum",
                    "redirectUris": ["https://forum.example.com/callback"],
                    "allowedScopes": ["openid"],
                    "confidential": true,
                    "clientSecretHash": "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$Zm9vYmFyYmF6cXV4"
                }
            }
        });
        let normalized = json!({
            "enabled": true,
            "clientId": "sdkwork-forum",
            "redirectUris": ["https://forum.example.com/callback"],
            "allowedScopes": ["openid"],
            "confidential": false,
            "clientSecretHash": Value::Null
        });
        let merged = merge_relying_party_registration(&runtime_config, &normalized);
        assert_eq!(merged["oauth"]["relyingParty"]["confidential"], json!(false));
        assert!(
            merged["oauth"]["relyingParty"].get("clientSecretHash").is_none(),
            "a public registration must not keep a stored hash: {merged}"
        );
        assert_eq!(
            merged["auth"]["supportsLocalCredentials"],
            json!(true),
            "sibling runtime config must survive"
        );
    }

    #[test]
    fn merge_clears_a_client_id_override_on_null() {
        let runtime_config = json!({
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "clientId": "birdcoder",
                    "redirectUris": ["birdcoder://auth/callback"],
                    "allowedScopes": ["openid"],
                    "confidential": false
                }
            }
        });
        let normalized = json!({
            "enabled": true,
            "clientId": Value::Null,
            "redirectUris": ["birdcoder://auth/callback"],
            "allowedScopes": ["openid"],
            "confidential": false,
            "clientSecretHash": Value::Null
        });
        let merged = merge_relying_party_registration(&runtime_config, &normalized);
        assert!(
            merged["oauth"]["relyingParty"].get("clientId").is_none(),
            "a cleared override must fall back to the app id: {merged}"
        );
    }

    #[test]
    fn summary_never_exposes_the_secret_hash() {
        let runtime_config = json!({
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "clientId": "birdcoder",
                    "redirectUris": ["birdcoder://auth/callback"],
                    "allowedScopes": ["openid"],
                    "confidential": true,
                    "clientSecretHash": "$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHQ$Zm9vYmFyYmF6cXV4"
                }
            }
        });
        let summary = oauth_relying_party_summary(&runtime_config).expect("summary");
        assert_eq!(summary["clientId"], json!("birdcoder"));
        assert_eq!(summary["hasClientSecret"], json!(true));
        assert!(summary.get("clientSecretHash").is_none());
    }

    #[test]
    fn auto_registration_policy_fails_closed_outside_development() {
        for key in [OAUTH_AUTO_REGISTRATION_ENV, OAUTH_AUTO_REGISTRATION_ENABLED_ENV] {
            std::env::remove_var(key);
        }
        assert!(auto_registration_enabled("development"));
        assert!(auto_registration_enabled("test"));
        assert!(!auto_registration_enabled("production"));
        assert!(!auto_registration_enabled("staging"));

        std::env::set_var(OAUTH_AUTO_REGISTRATION_ENV, "disabled");
        assert!(!auto_registration_enabled("development"));
        std::env::set_var(OAUTH_AUTO_REGISTRATION_ENV, "enabled");
        assert!(auto_registration_enabled("production"));
        std::env::remove_var(OAUTH_AUTO_REGISTRATION_ENV);
    }
}
