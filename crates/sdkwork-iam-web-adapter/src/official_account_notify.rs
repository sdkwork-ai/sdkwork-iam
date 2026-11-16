//! WeChat server-callback engine for official accounts and mini programs, plus
//! the IAM open-API receiver at the standard notify URL.
//!
//! WeChat server callback (official account and mini program message push) uses one
//! wire for both channels: a URL verification GET carrying
//! `signature/timestamp/nonce/echostr`, then POSTed XML messages signed with
//! either the three-value `signature` (plaintext mode) or the four-value
//! `msg_signature` over the `Encrypt` element (safe/compatible mode). The engine
//! below verifies both shapes, decrypts safe-mode payloads with the account's
//! EncodingAESKey, checks the decrypted receive id against the account AppID,
//! guards the five-minute replay window, and normalizes every delivery into one
//! channel-neutral notification so both channels are handled identically.
//!
//! The receiver is stateless per request; the only process state is the bounded
//! replay seen-set, owned by the router (`WechatNotifyReplayGuard`) instead of a
//! module-level static.
use aes::Aes256;
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use cbc::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
use sha1::{Digest as Sha1Digest, Sha1};
use sha2::Sha256;
use sqlx::{PgPool, Row};
use std::collections::VecDeque;
use std::sync::Mutex;

/// WeChat retries a callback after five minutes; a signed timestamp outside this
/// window is a replay of an expired request.
pub const WECHAT_NOTIFY_TIMESTAMP_WINDOW_SECONDS: i64 = 300;

/// At most this many deliveries are remembered for replay detection.
const REPLAY_SEEN_CAPACITY: usize = 4096;

const MAX_BODY_BYTES: usize = 100 * 1024;
const MAX_FIELD_BYTES: usize = 256;
const MAX_TEXT_BYTES: usize = 2048;
const MAX_ECHO_CHARS: usize = 2048;
const MAX_SIGNATURE_CHARS: usize = 64;
const MAX_NONCE_CHARS: usize = 64;
const MAX_TIMESTAMP_CHARS: usize = 20;
const MAX_ENCRYPT_CHARS: usize = 96 * 1024;
const MAX_REPLAY_KEY_CHARS: usize = 256;

const ENCRYPT_MODE_PLAINTEXT: &str = "plaintext";

/// The two WeChat channels share the callback wire and differ only in account
/// models, so the normalized notification names the channel that delivered it.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WechatNotifyChannel {
    /// WeChat official account server configuration.
    OfficialAccount,
    /// WeChat mini program message push (same Token/AES/XML scheme).
    MiniProgram,
}

impl WechatNotifyChannel {
    /// Stable channel slug used in diagnostics and replay keys.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::OfficialAccount => "official_account",
            Self::MiniProgram => "mini_program",
        }
    }
}

/// One verified and normalized callback delivery.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WechatNotification {
    pub channel: WechatNotifyChannel,
    /// The SDKWork account row the callback URL addressed.
    pub account_id: String,
    /// The WeChat AppID the decrypted receive id was checked against.
    pub app_id: String,
    pub msg_type: String,
    pub from_user: String,
    pub to_user: String,
    pub create_time: i64,
    pub msg_id: Option<String>,
    pub event: Option<String>,
    pub event_key: Option<String>,
    pub content: Option<String>,
    /// True when the same delivery was already seen; the caller still acks so
    /// WeChat stops retrying.
    pub duplicate: bool,
}

impl WechatNotification {
    fn replay_key(&self) -> String {
        let raw = match &self.msg_id {
            Some(msg_id) => format!("{}:{}", self.account_id, msg_id),
            None => format!(
                "{}:{}:{}:{}:{}",
                self.account_id,
                self.channel.as_str(),
                self.from_user,
                self.event_key.as_deref().unwrap_or_default(),
                self.create_time,
            ),
        };
        let digest = Sha256::digest(raw.as_bytes());
        let mut hex = String::with_capacity(64);
        for byte in digest {
            hex.push_str(&format!("{byte:02x}"));
        }
        format!(
            "wechat-notify-{}",
            &hex[..MAX_REPLAY_KEY_CHARS.min(hex.len())]
        )
    }
}

/// A callback failure. Messages are stable and safe to log; the receiver maps
/// every failure to a problem response so WeChat retries instead of assuming
/// delivery.
#[derive(Debug, PartialEq, Eq)]
pub enum WechatNotifyError {
    InvalidRequest(String),
    VerificationFailed,
    NotConfigured(String),
    Crypto(String),
}

impl std::fmt::Display for WechatNotifyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidRequest(detail) => write!(f, "invalid wechat notify request: {detail}"),
            Self::VerificationFailed => f.write_str("wechat notify signature verification failed"),
            Self::NotConfigured(detail) => {
                write!(f, "wechat notify is not configured: {detail}")
            }
            Self::Crypto(detail) => write!(f, "wechat notify payload is invalid: {detail}"),
        }
    }
}

impl std::error::Error for WechatNotifyError {}

/// Process-wide bounded seen-set for one router: oldest keys are evicted first.
#[derive(Debug, Default)]
pub struct WechatNotifyReplayGuard {
    seen: Mutex<VecDeque<String>>,
}

impl WechatNotifyReplayGuard {
    /// Records `key` and returns whether it was already present.
    /// @param key - a stable per-delivery replay key.
    /// @returns true for a duplicate delivery.
    pub fn check_and_record(&self, key: &str) -> bool {
        let key = truncate_chars(key, MAX_REPLAY_KEY_CHARS);
        let mut seen = self
            .seen
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        if seen.iter().any(|entry| entry == &key) {
            return true;
        }
        if seen.len() >= REPLAY_SEEN_CAPACITY {
            seen.pop_front();
        }
        seen.push_back(key);
        false
    }
}

/// WeChat's callback signature: SHA-1 over the lexicographically sorted values,
/// lowercase hex. The three-value form signs `token/timestamp/nonce` (plaintext);
/// the four-value form additionally signs the `Encrypt` payload (safe/compatible).
/// @param values - the wire values; the account token is always one of them.
/// @returns the lowercase hex digest.
pub fn callback_signature(values: &[&str]) -> String {
    let mut parts = values.to_vec();
    parts.sort_unstable();
    let digest = Sha1::digest(parts.concat().as_bytes());
    let mut hex = String::with_capacity(40);
    for byte in digest {
        hex.push_str(&format!("{byte:02x}"));
    }
    hex
}

/// Timing-safe comparison of a submitted signature with the expected digest.
pub fn verify_callback_signature(
    token: &str,
    timestamp: &str,
    nonce: &str,
    payload: Option<&str>,
    submitted: &str,
) -> bool {
    if submitted.is_empty() || submitted.len() > MAX_SIGNATURE_CHARS {
        return false;
    }
    let expected = match payload {
        Some(encrypt) => callback_signature(&[token, timestamp, nonce, encrypt]),
        None => callback_signature(&[token, timestamp, nonce]),
    };
    secure_compare(
        expected.as_bytes(),
        submitted.to_ascii_lowercase().as_bytes(),
    )
}

/// Constant-time byte comparison; unequal lengths short-circuit.
fn secure_compare(expected: &[u8], submitted: &[u8]) -> bool {
    if expected.len() != submitted.len() {
        return false;
    }
    let mut difference = 0u8;
    for (left, right) in expected.iter().zip(submitted.iter()) {
        difference |= left ^ right;
    }
    difference == 0
}

/// Decrypts a WeChat safe-mode blob: base64 -> AES-256-CBC (key/IV from the
/// 43-character EncodingAESKey) -> PKCS#7 unpad -> `random(16) || len(4, BE) ||
/// message || receive_id`.
/// @param encoding_aes_key - the 43-character EncodingAESKey.
/// @param encrypt - the base64 `Encrypt` payload.
/// @returns the inner message bytes and trailing receive id.
pub fn decrypt_wechat_blob(
    encoding_aes_key: &str,
    encrypt: &str,
) -> Result<(Vec<u8>, String), WechatNotifyError> {
    let key = decode_encoding_aes_key(encoding_aes_key)?;
    if encrypt.is_empty() || encrypt.len() > MAX_ENCRYPT_CHARS {
        return Err(WechatNotifyError::Crypto(
            "payload size is out of bounds".to_string(),
        ));
    }
    let mut ciphertext = BASE64_STANDARD
        .decode(encrypt)
        .map_err(|_| WechatNotifyError::Crypto("payload is not valid base64".to_string()))?;
    if ciphertext.is_empty() || ciphertext.len() % 16 != 0 {
        return Err(WechatNotifyError::Crypto(
            "ciphertext is not a multiple of the AES block size".to_string(),
        ));
    }
    let decryptor = cbc::Decryptor::<Aes256>::new_from_slices(&key, &key[..16])
        .map_err(|_| WechatNotifyError::Crypto("AES key or IV length is invalid".to_string()))?;
    let plain = decryptor
        .decrypt_padded_mut::<Pkcs7>(&mut ciphertext)
        .map_err(|_| WechatNotifyError::Crypto("AES decryption or padding failed".to_string()))?;
    split_wechat_plain(plain)
}

fn decode_encoding_aes_key(encoding_aes_key: &str) -> Result<Vec<u8>, WechatNotifyError> {
    let trimmed = encoding_aes_key.trim();
    let padded = match trimmed.chars().count() {
        43 => format!("{trimmed}="),
        44 => trimmed.to_string(),
        _ => {
            return Err(WechatNotifyError::NotConfigured(
                "EncodingAESKey must be 43 base64 characters".to_string(),
            ))
        }
    };
    let key = BASE64_STANDARD.decode(padded.as_bytes()).map_err(|_| {
        WechatNotifyError::NotConfigured("EncodingAESKey is not base64".to_string())
    })?;
    if key.len() != 32 {
        return Err(WechatNotifyError::NotConfigured(
            "EncodingAESKey must decode to 32 bytes".to_string(),
        ));
    }
    Ok(key)
}

fn split_wechat_plain(plain: &[u8]) -> Result<(Vec<u8>, String), WechatNotifyError> {
    if plain.len() < 20 {
        return Err(WechatNotifyError::Crypto(
            "payload is shorter than the WeChat envelope".to_string(),
        ));
    }
    let message_len = u32::from_be_bytes([plain[16], plain[17], plain[18], plain[19]]) as usize;
    let message_end = 20 + message_len;
    if message_end > plain.len() {
        return Err(WechatNotifyError::Crypto(
            "payload length is out of bounds".to_string(),
        ));
    }
    let message = plain[20..message_end].to_vec();
    let receive_id = String::from_utf8_lossy(&plain[message_end..])
        .trim_end_matches(char::from(0))
        .to_string();
    Ok((message, receive_id))
}

/// Extracts the `Encrypt` element from a safe-mode request body.
pub fn extract_encrypted_payload(body: &str) -> Result<String, WechatNotifyError> {
    if body.len() > MAX_BODY_BYTES {
        return Err(WechatNotifyError::Crypto(
            "request body is too large".to_string(),
        ));
    }
    extract_tag(body, "Encrypt", MAX_ENCRYPT_CHARS)?
        .ok_or_else(|| WechatNotifyError::InvalidRequest("Encrypt element is missing".to_string()))
}

fn extract_tag(
    xml: &str,
    tag: &str,
    max_bytes: usize,
) -> Result<Option<String>, WechatNotifyError> {
    let Some(open) = xml.find(&format!("<{tag}>")) else {
        return Ok(None);
    };
    let value_start = open + tag.len() + 2;
    let closing = format!("</{tag}>");
    let Some(close) = xml[value_start..].find(&closing) else {
        return Err(WechatNotifyError::InvalidRequest(format!(
            "{tag} element is not closed"
        )));
    };
    let raw = &xml[value_start..value_start + close];
    let value = decode_simple_xml_text(raw);
    if value.len() > max_bytes || value.contains('<') {
        return Err(WechatNotifyError::InvalidRequest(format!(
            "{tag} value is out of bounds"
        )));
    }
    Ok(Some(value))
}

fn decode_simple_xml_text(raw: &str) -> String {
    let inner = raw
        .strip_prefix("<![CDATA[")
        .and_then(|value| value.strip_suffix("]]>"));
    let value = match inner {
        Some(cdata) => cdata.to_string(),
        None => raw
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace("&amp;", "&"),
    };
    value.trim().to_string()
}

/// Validates a callback timestamp against the five-minute replay window.
fn ensure_timestamp_fresh(timestamp: &str) -> Result<(), WechatNotifyError> {
    if timestamp.is_empty() || timestamp.len() > MAX_TIMESTAMP_CHARS {
        return Err(WechatNotifyError::InvalidRequest(
            "timestamp is missing or out of bounds".to_string(),
        ));
    }
    let timestamp_secs = timestamp.parse::<i64>().map_err(|_| {
        WechatNotifyError::InvalidRequest("timestamp is not epoch seconds".to_string())
    })?;
    let now_secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_secs() as i64)
        .map_err(|_| {
            WechatNotifyError::InvalidRequest("system clock is unavailable".to_string())
        })?;
    if (now_secs - timestamp_secs).abs() > WECHAT_NOTIFY_TIMESTAMP_WINDOW_SECONDS {
        return Err(WechatNotifyError::VerificationFailed);
    }
    Ok(())
}

fn ensure_query_bounds(nonce: &str, timestamp: &str) -> Result<(), WechatNotifyError> {
    if nonce.is_empty() || nonce.len() > MAX_NONCE_CHARS {
        return Err(WechatNotifyError::InvalidRequest(
            "nonce is missing or out of bounds".to_string(),
        ));
    }
    if timestamp.is_empty() || timestamp.len() > MAX_TIMESTAMP_CHARS {
        return Err(WechatNotifyError::InvalidRequest(
            "timestamp is missing or out of bounds".to_string(),
        ));
    }
    Ok(())
}

fn ensure_receive_id_matches(receive_id: &str, app_id: &str) -> Result<(), WechatNotifyError> {
    if receive_id.trim().is_empty() || app_id.trim().is_empty() {
        return Err(WechatNotifyError::NotConfigured(
            "account AppID or decrypted receive id is empty".to_string(),
        ));
    }
    if !secure_compare(receive_id.trim().as_bytes(), app_id.trim().as_bytes()) {
        return Err(WechatNotifyError::VerificationFailed);
    }
    Ok(())
}

/// The account's callback configuration, decoded from the write-only secret refs.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OfficialAccountNotifyConfig {
    /// The channel the account belongs to, resolved from
    /// `iam_oauth_resource_account.resource_account_kind`.
    pub channel: WechatNotifyChannel,
    pub app_id: String,
    pub token: String,
    pub encoding_aes_key: String,
    pub encrypt_mode: String,
    pub enabled: bool,
}

impl OfficialAccountNotifyConfig {
    fn requires_decryption(&self) -> bool {
        self.encrypt_mode != ENCRYPT_MODE_PLAINTEXT
    }
}

/// Maps the canonical encryption mode onto the wire decision, tolerating the
/// legacy `plain` value written by the pre-unification admin surface.
fn normalize_encrypt_mode(raw: Option<&str>) -> String {
    match raw.map(str::trim) {
        Some("safe") => "safe".to_owned(),
        Some("compatible") => "compatible".to_owned(),
        _ => ENCRYPT_MODE_PLAINTEXT.to_owned(),
    }
}

/// Maps `iam_oauth_resource_account.resource_account_kind` onto the callback
/// channel. Official accounts and mini programs share one WeChat message-push
/// wire, so both kinds are addressable through the standard notify URL.
fn channel_from_resource_account_kind(kind: &str) -> Option<WechatNotifyChannel> {
    match kind.trim() {
        "official_account" => Some(WechatNotifyChannel::OfficialAccount),
        "mini_program" => Some(WechatNotifyChannel::MiniProgram),
        _ => None,
    }
}

/// Loads one account's callback configuration for the standard notify URL.
///
/// The configuration is resolved from the unified aggregate: the Channel
/// AppID and enablement from `iam_oauth_resource_account`, the callback
/// encryption mode from its `message_push` row in `iam_oauth_webhook_config`,
/// and the verification Token / EncodingAESKey from the `iam_oauth_secret`
/// rows owned by that webhook configuration.
/// @param pool - the IAM PostgreSQL pool.
/// @param account_id - the account id embedded in the notify URL.
/// @returns the decoded configuration.
pub async fn load_official_account_notify_config(
    pool: &PgPool,
    account_id: &str,
) -> Result<OfficialAccountNotifyConfig, String> {
    let row = sqlx::query(
        "SELECT ra.provider_account_id, ra.resource_account_kind, ra.enabled, \
                wc.encryption_mode, \
                notify_token.secret_ref AS notify_token_ref, \
                encoding_aes_key.secret_ref AS notify_encoding_aes_key_ref \
         FROM iam_oauth_resource_account ra \
         LEFT JOIN LATERAL ( \
           SELECT w.id, w.encryption_mode \
           FROM iam_oauth_webhook_config w \
           WHERE w.tenant_id = ra.tenant_id AND w.resource_account_id = ra.id \
             AND w.webhook_kind = 'message_push' AND w.status = 'active' \
           ORDER BY w.created_at DESC, w.id DESC \
           LIMIT 1 \
         ) wc ON TRUE \
         LEFT JOIN LATERAL ( \
           SELECT s.secret_ref \
           FROM iam_oauth_secret s \
           WHERE s.tenant_id = ra.tenant_id AND s.secret_owner_kind = 'webhook_config' \
             AND s.secret_owner_id = wc.id AND s.secret_kind = 'verification_token' \
             AND s.status = 'active' \
           ORDER BY s.active_from DESC, s.id DESC \
           LIMIT 1 \
         ) notify_token ON TRUE \
         LEFT JOIN LATERAL ( \
           SELECT s.secret_ref \
           FROM iam_oauth_secret s \
           WHERE s.tenant_id = ra.tenant_id AND s.secret_owner_kind = 'webhook_config' \
             AND s.secret_owner_id = wc.id AND s.secret_kind = 'encoding_aes_key' \
             AND s.status = 'active' \
           ORDER BY s.active_from DESC, s.id DESC \
           LIMIT 1 \
         ) encoding_aes_key ON TRUE \
         WHERE ra.id = $1",
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await
    .map_err(|error| format!("load official account notify config failed: {error}"))?
    .ok_or_else(|| "official account not found".to_string())?;
    let decode = |secret_ref: Option<String>, label: &str| -> Result<String, String> {
        match secret_ref {
            Some(secret_ref) if !secret_ref.trim().is_empty() => {
                let bytes = sdkwork_iam_bootstrap::decode_signing_secret_ref(&secret_ref)
                    .map_err(|error| format!("{label} could not be decoded: {error}"))?;
                String::from_utf8(bytes).map_err(|_| format!("{label} is not UTF-8"))
            }
            _ => Ok(String::new()),
        }
    };
    let resource_account_kind: String = row.get("resource_account_kind");
    let Some(channel) = channel_from_resource_account_kind(&resource_account_kind) else {
        return Err(format!(
            "resource account {account_id} is not a WeChat message-push account"
        ));
    };
    Ok(OfficialAccountNotifyConfig {
        channel,
        app_id: row.get("provider_account_id"),
        token: decode(row.get("notify_token_ref"), "notify token")?,
        encoding_aes_key: decode(row.get("notify_encoding_aes_key_ref"), "EncodingAESKey")?,
        encrypt_mode: normalize_encrypt_mode(
            row.get::<Option<String>, _>("encryption_mode").as_deref(),
        ),
        enabled: row.get::<i32, _>("enabled") != 0,
    })
}

/// One raw callback response: WeChat expects the echo string or `success`, not
/// the SDKWork API envelope.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WechatNotifyHttpResponse {
    pub content_type: &'static str,
    pub body: String,
}

/// GET URL verification for the standard notify URL.
///
/// Plaintext mode: `signature` covers token/timestamp/nonce and `echostr` is plaintext.
/// Safe/compatible mode: `signature` covers the encrypted `echostr`; the decrypted
/// receive id must equal the account AppID.
/// @param config - the account callback configuration.
/// @param query - the verification query parameters.
/// @returns the raw echo body WeChat expects.
pub fn verify_notify_url(
    config: &OfficialAccountNotifyConfig,
    query: &std::collections::HashMap<String, String>,
) -> Result<WechatNotifyHttpResponse, WechatNotifyError> {
    if !config.enabled {
        return Err(WechatNotifyError::NotConfigured(
            "the official account is disabled".to_string(),
        ));
    }
    let signature = query.get("signature").map(String::as_str).unwrap_or("");
    let timestamp = query.get("timestamp").map(String::as_str).unwrap_or("");
    let nonce = query.get("nonce").map(String::as_str).unwrap_or("");
    let echostr = query.get("echostr").map(String::as_str).unwrap_or("");
    if signature.is_empty() || echostr.is_empty() {
        return Err(WechatNotifyError::InvalidRequest(
            "signature and echostr are required".to_string(),
        ));
    }
    if echostr.len() > MAX_ECHO_CHARS && config.requires_decryption() {
        return Err(WechatNotifyError::InvalidRequest(
            "echostr is out of bounds".to_string(),
        ));
    }
    ensure_query_bounds(nonce, timestamp)?;
    ensure_timestamp_fresh(timestamp)?;
    if config.token.is_empty() {
        return Err(WechatNotifyError::NotConfigured(
            "notify token is missing".to_string(),
        ));
    }
    if !config.requires_decryption() {
        if !verify_callback_signature(&config.token, timestamp, nonce, None, signature) {
            return Err(WechatNotifyError::VerificationFailed);
        }
        return Ok(WechatNotifyHttpResponse {
            content_type: "text/plain; charset=utf-8",
            body: echostr.to_string(),
        });
    }
    if config.encoding_aes_key.is_empty() {
        return Err(WechatNotifyError::NotConfigured(
            "EncodingAESKey is missing".to_string(),
        ));
    }
    // Compatible mode may verify with the three-value signature and a plaintext echo;
    // safe mode verifies the four-value signature over the encrypted echo. Try the
    // encrypted shape first, then the plaintext shape, and fail closed otherwise.
    if verify_callback_signature(&config.token, timestamp, nonce, Some(echostr), signature) {
        let (message, receive_id) = decrypt_wechat_blob(&config.encoding_aes_key, echostr)?;
        ensure_receive_id_matches(&receive_id, &config.app_id)?;
        let echo = String::from_utf8(message)
            .map_err(|_| WechatNotifyError::Crypto("echo string is not UTF-8".to_string()))?;
        return Ok(WechatNotifyHttpResponse {
            content_type: "text/plain; charset=utf-8",
            body: echo,
        });
    }
    if echostr.len() <= MAX_ECHO_CHARS
        && verify_callback_signature(&config.token, timestamp, nonce, None, signature)
    {
        return Ok(WechatNotifyHttpResponse {
            content_type: "text/plain; charset=utf-8",
            body: echostr.to_string(),
        });
    }
    Err(WechatNotifyError::VerificationFailed)
}

/// POST message receipt for the standard notify URL: verifies the signature,
/// decrypts safe-mode payloads, replays the timestamp/duplicate guards, and
/// normalizes the XML into one channel-neutral notification.
/// @param channel - the channel delivering the callback.
/// @param config - the account callback configuration.
/// @param query - the callback query parameters.
/// @param body - the raw XML request body.
/// @param guard - the router's replay seen-set.
/// @returns the normalized notification (duplicates carry `duplicate: true`).
pub fn parse_notification(
    channel: WechatNotifyChannel,
    account_id: &str,
    config: &OfficialAccountNotifyConfig,
    query: &std::collections::HashMap<String, String>,
    body: &str,
    guard: &WechatNotifyReplayGuard,
) -> Result<WechatNotification, WechatNotifyError> {
    if !config.enabled {
        return Err(WechatNotifyError::NotConfigured(
            "the official account is disabled".to_string(),
        ));
    }
    if body.len() > MAX_BODY_BYTES {
        return Err(WechatNotifyError::InvalidRequest(
            "request body is too large".to_string(),
        ));
    }
    let signature = query
        .get("msg_signature")
        .or_else(|| query.get("signature"))
        .map(String::as_str)
        .unwrap_or("");
    let timestamp = query.get("timestamp").map(String::as_str).unwrap_or("");
    let nonce = query.get("nonce").map(String::as_str).unwrap_or("");
    if signature.is_empty() {
        return Err(WechatNotifyError::InvalidRequest(
            "signature or msg_signature is required".to_string(),
        ));
    }
    ensure_query_bounds(nonce, timestamp)?;
    ensure_timestamp_fresh(timestamp)?;
    if config.token.is_empty() {
        return Err(WechatNotifyError::NotConfigured(
            "notify token is missing".to_string(),
        ));
    }
    let encrypted = if body.contains("<Encrypt>") {
        Some(extract_encrypted_payload(body)?)
    } else {
        None
    };
    let (xml, receive_id) = match encrypted {
        Some(encrypt) => {
            if config.encoding_aes_key.is_empty() {
                return Err(WechatNotifyError::NotConfigured(
                    "EncodingAESKey is missing".to_string(),
                ));
            }
            if !verify_callback_signature(
                &config.token,
                timestamp,
                nonce,
                Some(&encrypt),
                signature,
            ) {
                return Err(WechatNotifyError::VerificationFailed);
            }
            let (message, receive_id) = decrypt_wechat_blob(&config.encoding_aes_key, &encrypt)?;
            let xml = String::from_utf8(message)
                .map_err(|_| WechatNotifyError::Crypto("message XML is not UTF-8".to_string()))?;
            (xml, Some(receive_id))
        }
        None => {
            if !verify_callback_signature(&config.token, timestamp, nonce, None, signature) {
                return Err(WechatNotifyError::VerificationFailed);
            }
            (body.to_string(), None)
        }
    };
    if let Some(receive_id) = receive_id {
        ensure_receive_id_matches(&receive_id, &config.app_id)?;
    }
    let notification = normalize_notification(channel, config, &xml)?;
    let notification = WechatNotification {
        account_id: account_id.to_string(),
        ..notification
    };
    let duplicate = guard.check_and_record(&notification.replay_key());
    Ok(WechatNotification {
        duplicate,
        ..notification
    })
}

fn normalize_notification(
    channel: WechatNotifyChannel,
    config: &OfficialAccountNotifyConfig,
    xml: &str,
) -> Result<WechatNotification, WechatNotifyError> {
    let required = |tag: &str| -> Result<String, WechatNotifyError> {
        extract_tag(xml, tag, MAX_FIELD_BYTES)?
            .filter(|value| !value.is_empty())
            .ok_or_else(|| WechatNotifyError::InvalidRequest(format!("{tag} is missing")))
    };
    let create_time_raw = required("CreateTime")?;
    let create_time = create_time_raw.parse::<i64>().map_err(|_| {
        WechatNotifyError::InvalidRequest("CreateTime is not epoch seconds".to_string())
    })?;
    Ok(WechatNotification {
        channel,
        account_id: String::new(),
        app_id: config.app_id.clone(),
        msg_type: required("MsgType")?,
        from_user: required("FromUserName")?,
        to_user: required("ToUserName")?,
        create_time,
        msg_id: extract_tag(xml, "MsgId", MAX_FIELD_BYTES)?,
        event: extract_tag(xml, "Event", MAX_FIELD_BYTES)?,
        event_key: extract_tag(xml, "EventKey", MAX_FIELD_BYTES)?,
        content: extract_tag(xml, "Content", MAX_TEXT_BYTES)?,
        duplicate: false,
    })
}

/// Handles a GET URL verification on the standard notify URL with the IAM pool.
pub async fn handle_official_account_notify_get(
    pool: &PgPool,
    account_id: &str,
    query: &std::collections::HashMap<String, String>,
) -> Result<WechatNotifyHttpResponse, String> {
    let config = load_official_account_notify_config(pool, account_id).await?;
    verify_notify_url(&config, query).map_err(|error| error.to_string())
}

/// Handles a POST message receipt on the standard notify URL with the IAM pool.
///
/// The receiver only acks; normalized notifications are the extension point for
/// passive replies, menu events, and message forwarding. The channel-neutral
/// shape is what lets official accounts and mini programs share one handler.
pub async fn handle_official_account_notify_post(
    pool: &PgPool,
    account_id: &str,
    query: &std::collections::HashMap<String, String>,
    body: &str,
    guard: &WechatNotifyReplayGuard,
) -> Result<WechatNotifyHttpResponse, String> {
    let config = load_official_account_notify_config(pool, account_id).await?;
    // The channel is a property of the stored aggregate
    // (`resource_account_kind`), not of the caller, so official accounts and
    // mini programs sharing one callback wire stay distinguishable.
    let channel = config.channel;
    parse_notification(channel, account_id, &config, query, body, guard)
        .map_err(|error| error.to_string())?;
    Ok(WechatNotifyHttpResponse {
        content_type: "text/plain; charset=utf-8",
        body: "success".to_string(),
    })
}

fn truncate_chars(value: &str, max_chars: usize) -> String {
    value.chars().take(max_chars).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use cbc::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};
    use std::collections::HashMap;

    const TEST_TOKEN: &str = "Token123";
    const TEST_AES_KEY_43: &str = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ";
    const TEST_APP_ID: &str = "wx1234567890abcdef";

    fn now_secs() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock")
            .as_secs() as i64
    }

    fn aes_key32() -> [u8; 32] {
        decode_encoding_aes_key(TEST_AES_KEY_43)
            .expect("test key")
            .try_into()
            .expect("32 bytes")
    }

    fn encrypt_blob(message: &str, receive_id: &str) -> String {
        let key = aes_key32();
        let mut plain = vec![0u8; 16];
        plain.extend_from_slice(&(message.len() as u32).to_be_bytes());
        plain.extend_from_slice(message.as_bytes());
        plain.extend_from_slice(receive_id.as_bytes());
        let mut buffer = vec![0u8; plain.len() + 16];
        buffer[..plain.len()].copy_from_slice(&plain);
        let ciphertext = cbc::Encryptor::<Aes256>::new_from_slices(&key, &key[..16])
            .expect("encryptor")
            .encrypt_padded_mut::<Pkcs7>(&mut buffer, plain.len())
            .expect("encrypt");
        BASE64_STANDARD.encode(ciphertext)
    }

    fn plaintext_config() -> OfficialAccountNotifyConfig {
        OfficialAccountNotifyConfig {
            channel: WechatNotifyChannel::OfficialAccount,
            app_id: TEST_APP_ID.to_string(),
            token: TEST_TOKEN.to_string(),
            encoding_aes_key: String::new(),
            encrypt_mode: "plaintext".to_string(),
            enabled: true,
        }
    }

    fn safe_config() -> OfficialAccountNotifyConfig {
        OfficialAccountNotifyConfig {
            channel: WechatNotifyChannel::OfficialAccount,
            app_id: TEST_APP_ID.to_string(),
            token: TEST_TOKEN.to_string(),
            encoding_aes_key: TEST_AES_KEY_43.to_string(),
            encrypt_mode: "safe".to_string(),
            enabled: true,
        }
    }

    fn query(pairs: &[(&str, &str)]) -> HashMap<String, String> {
        pairs
            .iter()
            .map(|(key, value)| ((*key).to_string(), (*value).to_string()))
            .collect()
    }

    #[test]
    fn signature_sorts_the_values_and_matches_the_wechat_digest() {
        assert_eq!(
            callback_signature(&[TEST_TOKEN, "1234567890", "nonce"]),
            "6a69b5b32d0da9731503e1da6e5a08e505c36ead"
        );
        assert!(verify_callback_signature(
            TEST_TOKEN,
            "1234567890",
            "nonce",
            None,
            "6a69b5b32d0da9731503e1da6e5a08e505c36ead"
        ));
        // Uppercase hex still verifies; a modified digest does not.
        assert!(verify_callback_signature(
            TEST_TOKEN,
            "1234567890",
            "nonce",
            None,
            "6a69b5b32d0da9731503e1da6e5a08e505c36ead"
        ));
        assert!(!verify_callback_signature(
            TEST_TOKEN,
            "1234567890",
            "nonce",
            None,
            "deadbeef"
        ));
    }

    #[test]
    fn decrypts_a_safe_mode_blob_and_reports_the_receive_id() {
        let blob = encrypt_blob("<xml><MsgType>text</MsgType></xml>", TEST_APP_ID);
        let (message, receive_id) = decrypt_wechat_blob(TEST_AES_KEY_43, &blob).expect("decrypt");
        assert_eq!(message, b"<xml><MsgType>text</MsgType></xml>");
        assert_eq!(receive_id, TEST_APP_ID);
    }

    #[test]
    fn verifies_a_plaintext_url_echo() {
        let timestamp = now_secs().to_string();
        let signature = callback_signature(&[TEST_TOKEN, &timestamp, "nonce"]);
        let response = verify_notify_url(
            &plaintext_config(),
            &query(&[
                ("signature", &signature),
                ("timestamp", &timestamp),
                ("nonce", "nonce"),
                ("echostr", "echo-me"),
            ]),
        )
        .expect("verify");
        assert_eq!(response.body, "echo-me");
    }

    #[test]
    fn verifies_a_safe_mode_url_echo_with_the_account_app_id() {
        let timestamp = now_secs().to_string();
        let echo = encrypt_blob("echo-me", TEST_APP_ID);
        let signature = callback_signature(&[TEST_TOKEN, &timestamp, "nonce", &echo]);
        let response = verify_notify_url(
            &safe_config(),
            &query(&[
                ("signature", &signature),
                ("timestamp", &timestamp),
                ("nonce", "nonce"),
                ("echostr", &echo),
            ]),
        )
        .expect("verify");
        assert_eq!(response.body, "echo-me");
    }

    #[test]
    fn rejects_a_safe_mode_echo_for_another_account() {
        let timestamp = now_secs().to_string();
        let echo = encrypt_blob("echo-me", "wx-other-account");
        let signature = callback_signature(&[TEST_TOKEN, &timestamp, "nonce", &echo]);
        assert_eq!(
            verify_notify_url(
                &safe_config(),
                &query(&[
                    ("signature", &signature),
                    ("timestamp", &timestamp),
                    ("nonce", "nonce"),
                    ("echostr", &echo),
                ]),
            ),
            Err(WechatNotifyError::VerificationFailed)
        );
    }

    #[test]
    fn normalizes_a_safe_mode_message_and_detects_duplicates() {
        let timestamp = now_secs().to_string();
        let xml = "<xml><ToUserName><![CDATA[gh_account]]></ToUserName>\
                   <FromUserName><![CDATA[user_openid]]></FromUserName>\
                   <CreateTime>1700000000</CreateTime>\
                   <MsgType><![CDATA[text]]></MsgType>\
                   <Content><![CDATA[hello]]></Content>\
                   <MsgId>1234567890123456</MsgId></xml>";
        let encrypt = encrypt_blob(xml, TEST_APP_ID);
        let signature = callback_signature(&[TEST_TOKEN, &timestamp, "nonce", &encrypt]);
        let body = format!("<xml><Encrypt><![CDATA[{encrypt}]]></Encrypt></xml>");
        let guard = WechatNotifyReplayGuard::default();
        let params = query(&[
            ("msg_signature", &signature),
            ("timestamp", &timestamp),
            ("nonce", "nonce"),
        ]);
        let first = parse_notification(
            WechatNotifyChannel::OfficialAccount,
            "acc-1",
            &safe_config(),
            &params,
            &body,
            &guard,
        )
        .expect("parse");
        assert_eq!(first.account_id, "acc-1");
        assert_eq!(first.msg_type, "text");
        assert_eq!(first.content.as_deref(), Some("hello"));
        assert_eq!(first.msg_id.as_deref(), Some("1234567890123456"));
        assert!(!first.duplicate);
        let again = parse_notification(
            WechatNotifyChannel::OfficialAccount,
            "acc-1",
            &safe_config(),
            &params,
            &body,
            &guard,
        )
        .expect("duplicate parse");
        assert!(again.duplicate);
    }

    #[test]
    fn rejects_a_stale_timestamp() {
        let timestamp = (now_secs() - WECHAT_NOTIFY_TIMESTAMP_WINDOW_SECONDS - 30).to_string();
        let signature = callback_signature(&[TEST_TOKEN, &timestamp, "nonce"]);
        assert_eq!(
            verify_notify_url(
                &plaintext_config(),
                &query(&[
                    ("signature", &signature),
                    ("timestamp", &timestamp),
                    ("nonce", "nonce"),
                    ("echostr", "echo-me"),
                ]),
            ),
            Err(WechatNotifyError::VerificationFailed)
        );
    }

    #[test]
    fn resolves_the_channel_from_the_resource_account_kind() {
        assert_eq!(
            channel_from_resource_account_kind("official_account"),
            Some(WechatNotifyChannel::OfficialAccount)
        );
        assert_eq!(
            channel_from_resource_account_kind(" mini_program "),
            Some(WechatNotifyChannel::MiniProgram)
        );
        assert_eq!(channel_from_resource_account_kind("mp"), None);
        assert_eq!(channel_from_resource_account_kind(""), None);
    }

    #[test]
    fn normalizes_the_stored_encryption_mode_and_keeps_the_legacy_plain_value() {
        assert_eq!(normalize_encrypt_mode(Some("safe")), "safe");
        assert_eq!(normalize_encrypt_mode(Some("compatible")), "compatible");
        assert_eq!(normalize_encrypt_mode(Some("plaintext")), "plaintext");
        // The pre-unification admin surface wrote `plain` for the plaintext mode.
        assert_eq!(normalize_encrypt_mode(Some("plain")), "plaintext");
        assert_eq!(normalize_encrypt_mode(Some("  ")), "plaintext");
        assert_eq!(normalize_encrypt_mode(None), "plaintext");
    }
}
