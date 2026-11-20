//! Callback configuration for a component's public authorization receiver.
//!
//! WeChat is given one opaque URL per component. That URL must not carry the
//! component AppID, the tenant id, or any secret: it is pasted into the WeChat
//! console and appears in logs. `callback_public_id` is the only identifier the
//! request carries, and this reader resolves it to the component AppID plus the
//! two decrypted secrets the signature and decryption need.
use async_trait::async_trait;
use sqlx::{PgPool, Row};

use sdkwork_iam_bootstrap::decode_signing_secret_ref;

/// The callback token secret kind.
pub const SECRET_KIND_CALLBACK_TOKEN: &str = "component_callback_token";

/// The encoding AES key secret kind.
pub const SECRET_KIND_ENCODING_AES_KEY: &str = "encoding_aes_key";

/// Everything a component callback needs to verify and decrypt.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ComponentCallbackConfig {
    /// Operator platform row id.
    pub platform_id: String,
    /// Owning tenant, used for the idempotency ledger.
    pub tenant_id: String,
    /// Component AppID the decrypted receive id must equal.
    pub component_app_id: String,
    /// Decrypted callback token.
    pub callback_token: String,
    /// Decrypted EncodingAESKey.
    pub encoding_aes_key: String,
}

/// A callback configuration failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ComponentCallbackConfigError {
    /// The store failed.
    Store(String),
    /// A required secret is missing.
    MissingSecret(&'static str),
    /// A stored secret could not be decoded.
    Decode(&'static str),
}

impl std::fmt::Display for ComponentCallbackConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Store(detail) => write!(f, "callback configuration store failed: {detail}"),
            Self::MissingSecret(kind) => write!(f, "callback configuration is missing {kind}"),
            Self::Decode(kind) => write!(f, "callback secret {kind} could not be decoded"),
        }
    }
}

impl std::error::Error for ComponentCallbackConfigError {}

/// Reads callback configuration by opaque public id.
#[async_trait]
pub trait ComponentCallbackConfigReader: Send + Sync {
    /// Returns `None` when the callback id is unknown.
    async fn load(
        &self,
        callback_public_id: &str,
    ) -> Result<Option<ComponentCallbackConfig>, ComponentCallbackConfigError>;
}

/// PostgreSQL reader.
pub struct PgComponentCallbackConfigReader {
    pool: PgPool,
}

impl PgComponentCallbackConfigReader {
    /// Builds the reader over the IAM database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ComponentCallbackConfigReader for PgComponentCallbackConfigReader {
    async fn load(
        &self,
        callback_public_id: &str,
    ) -> Result<Option<ComponentCallbackConfig>, ComponentCallbackConfigError> {
        let callback_public_id = callback_public_id.trim();
        if callback_public_id.is_empty() {
            return Ok(None);
        }
        let row = sqlx::query(
            "SELECT op.id, op.tenant_id, op.component_appid, \
                    callback_token.secret_ref AS callback_token_ref, \
                    aes_key.secret_ref AS encoding_aes_key_ref \
             FROM iam_oauth_operator_platform op \
             LEFT JOIN LATERAL ( \
                SELECT secret_ref FROM iam_oauth_secret \
                WHERE operator_platform_id = op.id AND secret_kind = $2 AND status = 'active' \
                ORDER BY active_from DESC, updated_at DESC, id DESC LIMIT 1 \
             ) callback_token ON TRUE \
             LEFT JOIN LATERAL ( \
                SELECT secret_ref FROM iam_oauth_secret \
                WHERE operator_platform_id = op.id AND secret_kind = $3 AND status = 'active' \
                ORDER BY active_from DESC, updated_at DESC, id DESC LIMIT 1 \
             ) aes_key ON TRUE \
             WHERE op.callback_public_id = $1",
        )
        .bind(callback_public_id)
        .bind(SECRET_KIND_CALLBACK_TOKEN)
        .bind(SECRET_KIND_ENCODING_AES_KEY)
        .fetch_optional(&self.pool)
        .await
        .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?;
        let Some(row) = row else {
            return Ok(None);
        };
        let callback_token_ref: Option<String> = row
            .try_get("callback_token_ref")
            .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?;
        let encoding_aes_key_ref: Option<String> = row
            .try_get("encoding_aes_key_ref")
            .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?;
        let callback_token = callback_token_ref.ok_or(
            ComponentCallbackConfigError::MissingSecret(SECRET_KIND_CALLBACK_TOKEN),
        )?;
        let encoding_aes_key = encoding_aes_key_ref.ok_or(
            ComponentCallbackConfigError::MissingSecret(SECRET_KIND_ENCODING_AES_KEY),
        )?;
        Ok(Some(ComponentCallbackConfig {
            platform_id: row
                .try_get("id")
                .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?,
            tenant_id: row
                .try_get("tenant_id")
                .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?,
            component_app_id: row
                .try_get("component_appid")
                .map_err(|error| ComponentCallbackConfigError::Store(error.to_string()))?,
            callback_token: decode_secret(&callback_token, SECRET_KIND_CALLBACK_TOKEN)?,
            encoding_aes_key: decode_secret(&encoding_aes_key, SECRET_KIND_ENCODING_AES_KEY)?,
        }))
    }
}

fn decode_secret(
    secret_ref: &str,
    kind: &'static str,
) -> Result<String, ComponentCallbackConfigError> {
    let plaintext = decode_signing_secret_ref(secret_ref)
        .map_err(|_| ComponentCallbackConfigError::Decode(kind))?;
    String::from_utf8(plaintext).map_err(|_| ComponentCallbackConfigError::Decode(kind))
}

/// Builds the idempotency key for one callback delivery.
///
/// WeChat retries a signed delivery; the same key must identify the same logical
/// event so the ledger can collapse duplicates.
pub fn callback_dedupe_key(
    info_type: &str,
    authorizer_app_id: Option<&str>,
    create_time: i64,
) -> String {
    format!(
        "{}:{}:{}",
        info_type.trim(),
        authorizer_app_id.unwrap_or("-"),
        create_time
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupe_key_identifies_one_logical_delivery() {
        assert_eq!(
            callback_dedupe_key("authorized", Some("wxauthorizer"), 1_700_000_000),
            "authorized:wxauthorizer:1700000000"
        );
        assert_eq!(
            callback_dedupe_key("component_verify_ticket", None, 1_700_000_000),
            "component_verify_ticket:-:1700000000"
        );
        assert_ne!(
            callback_dedupe_key("authorized", Some("wxauthorizer"), 1),
            callback_dedupe_key("authorized", Some("wxauthorizer"), 2)
        );
    }
}
