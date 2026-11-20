//! WeChat Open Platform third-party-platform (component) callback engine.
//!
//! A third-party platform must serve one public authorization-event receiver.
//! WeChat calls it with a URL-verification GET and then pushes an encrypted XML
//! message at least every ten minutes (`component_verify_ticket`) plus
//! authorization-change events (`authorized`, `unauthorized`,
//! `updateauthorized`). The wire is the same AES/SHA-1 envelope as an official
//! account callback, so this engine reuses the signature and decryption
//! primitives owned by [`crate::official_account_notify`] and adds only the
//! component-specific shape: a component AppID receive id, the component event
//! fields, and the full-release auto-reply contract.
//!
//! The engine is stateless. Ticket persistence, token refresh, deduplication,
//! and event dispatch belong to the calling service, which stores the event and
//! acknowledges `success` before any slow work happens.
use crate::official_account_notify::{
    callback_signature, decrypt_wechat_blob, ensure_query_bounds, ensure_timestamp_fresh,
    extract_encrypted_payload, extract_tag, verify_callback_signature, WechatNotifyError,
};

/// A pushed `component_verify_ticket` is valid for twelve hours; WeChat refreshes
/// it every ten minutes. Callers use this as an alerting threshold, not as a
/// substitute for the value WeChat actually sent.
pub const COMPONENT_VERIFY_TICKET_TTL_SECONDS: i64 = 12 * 60 * 60;

/// Content WeChat sends to probe a component's message handling during the
/// full-release verification.
pub const COMPONENT_TEST_TEXT: &str = "TESTCOMPONENT_MSG_TYPE_TEXT";

/// Exact text a component must return for [`COMPONENT_TEST_TEXT`].
pub const COMPONENT_TEST_TEXT_REPLY: &str = "TESTCOMPONENT_MSG_TYPE_TEXT_callback";

/// Prefix WeChat uses to ask a component to exchange an authorization code.
pub const COMPONENT_QUERY_AUTH_CODE_PREFIX: &str = "QUERY_AUTH_CODE:";

/// Upper bound for a component event field; the ticket is roughly one hundred
/// base64 characters and authorization codes are shorter, so this leaves ample
/// room without allowing an unbounded body.
const MAX_COMPONENT_FIELD_BYTES: usize = 8 * 1024;

/// The four info types a component authorization receiver must understand.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum WechatComponentInfoType {
    /// Periodic verification ticket push.
    VerifyTicket,
    /// A customer authorized (or re-authorized) the component.
    Authorized,
    /// A customer removed the authorization.
    Unauthorized,
    /// The granted permission set changed.
    UpdateAuthorized,
    /// An info type this build does not model yet.
    Unknown,
}

impl WechatComponentInfoType {
    /// Maps the wire `InfoType` to the typed variant.
    pub fn from_wire(value: &str) -> Self {
        match value.trim() {
            "component_verify_ticket" => Self::VerifyTicket,
            "authorized" => Self::Authorized,
            "unauthorized" => Self::Unauthorized,
            "updateauthorized" => Self::UpdateAuthorized,
            _ => Self::Unknown,
        }
    }

    /// Stable slug used in persistence and diagnostics.
    pub fn as_str(self) -> &'static str {
        match self {
            Self::VerifyTicket => "component_verify_ticket",
            Self::Authorized => "authorized",
            Self::Unauthorized => "unauthorized",
            Self::UpdateAuthorized => "updateauthorized",
            Self::Unknown => "unknown",
        }
    }

    /// True when the event changes an authorization lifecycle.
    pub fn is_authorization_change(self) -> bool {
        matches!(
            self,
            Self::Authorized | Self::Unauthorized | Self::UpdateAuthorized
        )
    }
}

/// One decrypted and verified component callback event.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WechatComponentEvent {
    /// Component AppID carried in the inner `AppId` element.
    pub component_app_id: String,
    /// Unix seconds when WeChat created the event.
    pub create_time: i64,
    /// Typed info type.
    pub info_type: WechatComponentInfoType,
    /// Raw wire value, retained for forward compatibility.
    pub raw_info_type: String,
    /// Authorizer AppID for authorization events.
    pub authorizer_app_id: Option<String>,
    /// One-time authorization code for `authorized` events.
    pub authorization_code: Option<String>,
    /// Expiry of [`Self::authorization_code`], when WeChat sent one.
    pub authorization_code_expired_time: Option<i64>,
    /// Pre-authorization code bound to the event, when present.
    pub pre_auth_code: Option<String>,
    /// Verification ticket for `component_verify_ticket` events.
    pub component_verify_ticket: Option<String>,
}

impl WechatComponentEvent {
    /// True when the event changes an authorization lifecycle.
    pub fn is_authorization_change(&self) -> bool {
        self.info_type.is_authorization_change()
    }

    /// Expiry of the verification ticket using the documented twelve-hour TTL.
    ///
    /// @returns the Unix second at which the pushed ticket stops being valid.
    pub fn ticket_expires_at(&self) -> i64 {
        self.create_time + COMPONENT_VERIFY_TICKET_TTL_SECONDS
    }
}

/// A component callback failure.
///
/// Messages are stable and safe to log; secrets, tickets, and tokens never
/// appear in an error value.
#[derive(Debug, PartialEq, Eq)]
pub enum WechatComponentError {
    /// Signature, timestamp, or receive-id verification failed.
    VerificationFailed,
    /// The encrypted payload could not be decoded or split.
    Crypto(String),
    /// The request is malformed or incomplete.
    InvalidRequest(String),
    /// The configured component AppID is missing.
    NotConfigured(String),
    /// The decrypted receive id or inner `AppId` is not the configured component.
    ReceiverAppIdMismatch {
        /// Configured component AppID.
        expected: String,
        /// AppID actually found in the payload.
        actual: String,
    },
}

impl std::fmt::Display for WechatComponentError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::VerificationFailed => {
                f.write_str("wechat component callback verification failed")
            }
            Self::Crypto(detail) => write!(f, "wechat component payload is invalid: {detail}"),
            Self::InvalidRequest(detail) => {
                write!(f, "invalid wechat component request: {detail}")
            }
            Self::NotConfigured(detail) => {
                write!(f, "wechat component is not configured: {detail}")
            }
            Self::ReceiverAppIdMismatch { expected, actual } => write!(
                f,
                "wechat component payload belongs to {actual}, expected {expected}"
            ),
        }
    }
}

impl std::error::Error for WechatComponentError {}

impl From<WechatNotifyError> for WechatComponentError {
    fn from(error: WechatNotifyError) -> Self {
        match error {
            WechatNotifyError::VerificationFailed => Self::VerificationFailed,
            WechatNotifyError::Crypto(detail) => Self::Crypto(detail),
            WechatNotifyError::InvalidRequest(detail) => Self::InvalidRequest(detail),
            WechatNotifyError::NotConfigured(detail) => Self::NotConfigured(detail),
        }
    }
}

/// Everything one POSTed component callback carries.
///
/// The fields mirror the query string plus the raw XML body so a handler can
/// pass the request through without re-parsing it.
#[derive(Clone, Copy, Debug)]
pub struct WechatComponentCallbackRequest<'a> {
    /// Callback token configured on the third-party platform.
    pub token: &'a str,
    /// 43-character EncodingAESKey configured on the third-party platform.
    pub encoding_aes_key: &'a str,
    /// The component's own AppID.
    pub component_app_id: &'a str,
    /// Query `timestamp`.
    pub timestamp: &'a str,
    /// Query `nonce`.
    pub nonce: &'a str,
    /// Query `msg_signature`, the four-value signature over `Encrypt`.
    pub msg_signature: &'a str,
    /// Raw XML body containing `<Encrypt>`.
    pub body: &'a str,
}

/// Everything one URL-verification GET carries.
#[derive(Clone, Copy, Debug)]
pub struct WechatComponentUrlVerificationRequest<'a> {
    /// Callback token configured on the third-party platform.
    pub token: &'a str,
    /// 43-character EncodingAESKey configured on the third-party platform.
    pub encoding_aes_key: &'a str,
    /// The component's own AppID.
    pub component_app_id: &'a str,
    /// Query `timestamp`.
    pub timestamp: &'a str,
    /// Query `nonce`.
    pub nonce: &'a str,
    /// Query `signature`, the three-value signature.
    pub signature: &'a str,
    /// Query `echostr`, an encrypted echo value.
    pub echostr: &'a str,
}

/// The action a component must take for one full-release probe message.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentTestAction {
    /// Reply with this exact text.
    ReplyText(String),
    /// Exchange the authorization code, then send `code_from_api` through the
    /// customer-service message API and return an empty body.
    QueryAuthCode(String),
}

/// Verifies and decrypts one component callback POST.
///
/// @param request - signature inputs, configured secrets, and the XML body.
/// @returns the typed event after signature, timestamp, receive-id, and inner
/// `AppId` verification.
pub fn parse_component_callback(
    request: &WechatComponentCallbackRequest<'_>,
) -> Result<WechatComponentEvent, WechatComponentError> {
    ensure_query_bounds(request.nonce, request.timestamp)?;
    ensure_timestamp_fresh(request.timestamp)?;
    let encrypted = extract_encrypted_payload(request.body)?;
    if !verify_callback_signature(
        request.token,
        request.timestamp,
        request.nonce,
        Some(&encrypted),
        request.msg_signature,
    ) {
        return Err(WechatComponentError::VerificationFailed);
    }
    let (plain, receive_id) = decrypt_wechat_blob(request.encoding_aes_key, &encrypted)?;
    ensure_receiver_app_id(&receive_id, request.component_app_id)?;
    let xml = String::from_utf8_lossy(&plain);
    parse_component_event(&xml, request.component_app_id)
}

/// Verifies a component URL-verification GET and returns the echo value.
///
/// @param request - query values and configured secrets.
/// @returns the decrypted plaintext the receiver must write back verbatim.
pub fn verify_component_url(
    request: &WechatComponentUrlVerificationRequest<'_>,
) -> Result<String, WechatComponentError> {
    ensure_query_bounds(request.nonce, request.timestamp)?;
    ensure_timestamp_fresh(request.timestamp)?;
    if !verify_callback_signature(
        request.token,
        request.timestamp,
        request.nonce,
        None,
        request.signature,
    ) {
        return Err(WechatComponentError::VerificationFailed);
    }
    let (plain, receive_id) = decrypt_wechat_blob(request.encoding_aes_key, request.echostr)?;
    ensure_receiver_app_id(&receive_id, request.component_app_id)?;
    String::from_utf8(plain)
        .map_err(|_| WechatComponentError::Crypto("echo value is not valid utf-8".to_string()))
}

/// Builds the signature a caller submits for a component callback.
///
/// Exposed so tests and callback replayers can reproduce WeChat's digest without
/// duplicating the sorting rule.
///
/// @param token - configured callback token.
/// @param timestamp - query timestamp.
/// @param nonce - query nonce.
/// @param encrypt - base64 `Encrypt` payload, or `None` for URL verification.
/// @returns the lowercase hex SHA-1 digest.
pub fn component_signature(
    token: &str,
    timestamp: &str,
    nonce: &str,
    encrypt: Option<&str>,
) -> String {
    match encrypt {
        Some(payload) => callback_signature(&[token, timestamp, nonce, payload]),
        None => callback_signature(&[token, timestamp, nonce]),
    }
}

/// Maps a message body to the full-release probe action WeChat expects.
///
/// @param content - the plaintext message content.
/// @returns `None` when the message is ordinary traffic the caller must route.
pub fn component_full_release_action(content: &str) -> Option<WechatComponentTestAction> {
    let trimmed = content.trim();
    if trimmed == COMPONENT_TEST_TEXT {
        return Some(WechatComponentTestAction::ReplyText(
            COMPONENT_TEST_TEXT_REPLY.to_string(),
        ));
    }
    trimmed
        .strip_prefix(COMPONENT_QUERY_AUTH_CODE_PREFIX)
        .map(|code| WechatComponentTestAction::QueryAuthCode(code.trim().to_string()))
}

fn ensure_receiver_app_id(
    receive_id: &str,
    component_app_id: &str,
) -> Result<(), WechatComponentError> {
    let expected = component_app_id.trim();
    if expected.is_empty() {
        return Err(WechatComponentError::NotConfigured(
            "component AppID is empty".to_string(),
        ));
    }
    let actual = receive_id.trim();
    if actual.is_empty() {
        return Err(WechatComponentError::Crypto(
            "decrypted receive id is empty".to_string(),
        ));
    }
    if actual != expected {
        return Err(WechatComponentError::ReceiverAppIdMismatch {
            expected: expected.to_string(),
            actual: actual.to_string(),
        });
    }
    Ok(())
}

fn parse_component_event(
    xml: &str,
    configured_app_id: &str,
) -> Result<WechatComponentEvent, WechatComponentError> {
    let component_app_id = required_tag(xml, "AppId")?;
    if component_app_id != configured_app_id.trim() {
        return Err(WechatComponentError::ReceiverAppIdMismatch {
            expected: configured_app_id.trim().to_string(),
            actual: component_app_id,
        });
    }
    let raw_info_type = required_tag(xml, "InfoType")?;
    let create_time = required_i64_tag(xml, "CreateTime")?;
    Ok(WechatComponentEvent {
        component_app_id,
        create_time,
        info_type: WechatComponentInfoType::from_wire(&raw_info_type),
        raw_info_type,
        authorizer_app_id: optional_tag(xml, "AuthorizerAppid")?,
        authorization_code: optional_tag(xml, "AuthorizationCode")?,
        authorization_code_expired_time: optional_i64_tag(xml, "AuthorizationCodeExpiredTime")?,
        pre_auth_code: optional_tag(xml, "PreAuthCode")?,
        component_verify_ticket: optional_tag(xml, "ComponentVerifyTicket")?,
    })
}

fn required_tag(xml: &str, tag: &str) -> Result<String, WechatComponentError> {
    optional_tag(xml, tag)?
        .ok_or_else(|| WechatComponentError::InvalidRequest(format!("{tag} element is missing")))
}

fn required_i64_tag(xml: &str, tag: &str) -> Result<i64, WechatComponentError> {
    let raw = required_tag(xml, tag)?;
    raw.parse::<i64>()
        .map_err(|_| WechatComponentError::InvalidRequest(format!("{tag} is not an integer")))
}

fn optional_i64_tag(xml: &str, tag: &str) -> Result<Option<i64>, WechatComponentError> {
    match optional_tag(xml, tag)? {
        Some(raw) => raw
            .parse::<i64>()
            .map(Some)
            .map_err(|_| WechatComponentError::InvalidRequest(format!("{tag} is not an integer"))),
        None => Ok(None),
    }
}

fn optional_tag(xml: &str, tag: &str) -> Result<Option<String>, WechatComponentError> {
    let value = extract_tag(xml, tag, MAX_COMPONENT_FIELD_BYTES)?;
    Ok(value.filter(|item| !item.trim().is_empty()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use aes::Aes256;
    use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
    use cbc::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};

    const TOKEN: &str = "component-token";
    const AES_KEY: &str = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const COMPONENT_APP_ID: &str = "wxcomponent0123456789";
    const AUTHORIZER_APP_ID: &str = "wxauthorizer0123456";

    fn now() -> i64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|duration| duration.as_secs() as i64)
            .expect("system clock")
    }

    fn encrypt_blob(xml: &str, receive_id: &str) -> String {
        let key = BASE64_STANDARD
            .decode(format!("{AES_KEY}="))
            .expect("decode aes key");
        let mut plain = vec![7u8; 16];
        plain.extend_from_slice(&(xml.len() as u32).to_be_bytes());
        plain.extend_from_slice(xml.as_bytes());
        plain.extend_from_slice(receive_id.as_bytes());
        let mut buffer = vec![0u8; plain.len() + 16];
        buffer[..plain.len()].copy_from_slice(&plain);
        let encryptor =
            cbc::Encryptor::<Aes256>::new_from_slices(&key, &key[..16]).expect("cipher");
        let ciphertext = encryptor
            .encrypt_padded_mut::<Pkcs7>(&mut buffer, plain.len())
            .expect("encrypt");
        BASE64_STANDARD.encode(ciphertext)
    }

    fn callback(xml: &str, receive_id: &str) -> (String, String, String) {
        let encrypted = encrypt_blob(xml, receive_id);
        let timestamp = now().to_string();
        let nonce = "nonce-1";
        let signature = component_signature(TOKEN, &timestamp, nonce, Some(&encrypted));
        (encrypted, timestamp, signature)
    }

    fn post_request<'a>(
        body: &'a str,
        timestamp: &'a str,
        signature: &'a str,
    ) -> WechatComponentCallbackRequest<'a> {
        WechatComponentCallbackRequest {
            token: TOKEN,
            encoding_aes_key: AES_KEY,
            component_app_id: COMPONENT_APP_ID,
            timestamp,
            nonce: "nonce-1",
            msg_signature: signature,
            body,
        }
    }

    fn ticket_xml() -> String {
        format!(
            "<xml><AppId>{COMPONENT_APP_ID}</AppId><CreateTime>{}</CreateTime>\
             <InfoType>component_verify_ticket</InfoType>\
             <ComponentVerifyTicket>ticket-abc</ComponentVerifyTicket></xml>",
            now()
        )
    }

    #[test]
    fn parses_verification_ticket_event() {
        let xml = ticket_xml();
        let (encrypted, timestamp, signature) = callback(&xml, COMPONENT_APP_ID);
        let body = format!("<xml><Encrypt><![CDATA[{encrypted}]]></Encrypt></xml>");
        let event = parse_component_callback(&post_request(&body, &timestamp, &signature))
            .expect("event parses");
        assert_eq!(event.component_app_id, COMPONENT_APP_ID);
        assert_eq!(event.info_type, WechatComponentInfoType::VerifyTicket);
        assert_eq!(event.component_verify_ticket.as_deref(), Some("ticket-abc"));
        assert!(!event.is_authorization_change());
    }

    #[test]
    fn parses_authorization_change_event() {
        let xml = format!(
            "<xml><AppId>{COMPONENT_APP_ID}</AppId><CreateTime>1700000000</CreateTime>\
             <InfoType>authorized</InfoType><AuthorizerAppid>{AUTHORIZER_APP_ID}</AuthorizerAppid>\
             <AuthorizationCode>auth-code-1</AuthorizationCode>\
             <AuthorizationCodeExpiredTime>1700000600</AuthorizationCodeExpiredTime>\
             <PreAuthCode>pre-auth-1</PreAuthCode></xml>"
        );
        let (encrypted, timestamp, signature) = callback(&xml, COMPONENT_APP_ID);
        let body = format!("<xml><Encrypt><![CDATA[{encrypted}]]></Encrypt></xml>");
        let event = parse_component_callback(&post_request(&body, &timestamp, &signature))
            .expect("event parses");
        assert_eq!(event.info_type, WechatComponentInfoType::Authorized);
        assert_eq!(event.authorizer_app_id.as_deref(), Some(AUTHORIZER_APP_ID));
        assert_eq!(event.authorization_code.as_deref(), Some("auth-code-1"));
        assert_eq!(event.authorization_code_expired_time, Some(1_700_000_600));
        assert_eq!(event.pre_auth_code.as_deref(), Some("pre-auth-1"));
        assert!(event.is_authorization_change());
    }

    #[test]
    fn rejects_tampered_payload() {
        let xml = ticket_xml();
        let (encrypted, timestamp, signature) = callback(&xml, COMPONENT_APP_ID);
        let tampered = format!("{}A", &encrypted[..encrypted.len() - 1]);
        let body = format!("<xml><Encrypt><![CDATA[{tampered}]]></Encrypt></xml>");
        let error = parse_component_callback(&post_request(&body, &timestamp, &signature))
            .expect_err("tampered payload must fail");
        assert_eq!(error, WechatComponentError::VerificationFailed);
    }

    #[test]
    fn rejects_stale_timestamp() {
        let xml = ticket_xml();
        let (encrypted, _timestamp, _signature) = callback(&xml, COMPONENT_APP_ID);
        let stale = (now() - 3_600).to_string();
        let signature = component_signature(TOKEN, &stale, "nonce-1", Some(&encrypted));
        let body = format!("<xml><Encrypt><![CDATA[{encrypted}]]></Encrypt></xml>");
        let error = parse_component_callback(&post_request(&body, &stale, &signature))
            .expect_err("stale timestamp must fail");
        assert_eq!(error, WechatComponentError::VerificationFailed);
    }

    #[test]
    fn rejects_other_components_payload() {
        let xml = ticket_xml();
        let (encrypted, timestamp, signature) = callback(&xml, "wxsomeoneelse");
        let body = format!("<xml><Encrypt><![CDATA[{encrypted}]]></Encrypt></xml>");
        let error = parse_component_callback(&post_request(&body, &timestamp, &signature))
            .expect_err("another component must fail");
        assert!(matches!(
            error,
            WechatComponentError::ReceiverAppIdMismatch { .. }
        ));
    }

    #[test]
    fn verifies_url_and_returns_echo() {
        let timestamp = now().to_string();
        let echo = encrypt_blob("echo-plaintext", COMPONENT_APP_ID);
        let signature = component_signature(TOKEN, &timestamp, "nonce-1", None);
        let request = WechatComponentUrlVerificationRequest {
            token: TOKEN,
            encoding_aes_key: AES_KEY,
            component_app_id: COMPONENT_APP_ID,
            timestamp: &timestamp,
            nonce: "nonce-1",
            signature: &signature,
            echostr: &echo,
        };
        assert_eq!(
            verify_component_url(&request).expect("url verifies"),
            "echo-plaintext"
        );
    }

    #[test]
    fn maps_full_release_probe_actions() {
        assert_eq!(
            component_full_release_action(COMPONENT_TEST_TEXT),
            Some(WechatComponentTestAction::ReplyText(
                COMPONENT_TEST_TEXT_REPLY.to_string()
            ))
        );
        assert_eq!(
            component_full_release_action("QUERY_AUTH_CODE:auth-code-9"),
            Some(WechatComponentTestAction::QueryAuthCode(
                "auth-code-9".to_string()
            ))
        );
        assert_eq!(
            component_full_release_action("normal customer message"),
            None
        );
    }
}
