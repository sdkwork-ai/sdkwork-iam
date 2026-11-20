//! Authorizer message handling for a WeChat component.
//!
//! After a customer authorizes a mini program or official account, WeChat pushes
//! that account's messages and events to the component's message URL in secure
//! mode: a `msg_signature` over the encrypted `Encrypt` element, AES-256-CBC, and
//! an appid trailer. The handler proves the payload belongs to the authorizer in
//! the URL, then decides what the component must do:
//!
//! - The full-release verification probes (`TESTCOMPONENT_MSG_TYPE_TEXT`,
//!   `QUERY_AUTH_CODE:$code`) must be answered exactly, or WeChat fails the
//!   component's release review.
//! - Ordinary traffic is acknowledged and recorded; business routing is a later
//!   milestone and must not be invented here.
//!
//! A passive reply in secure mode is itself encrypted. The builder below emits
//! the `Encrypt/MsgSignature/TimeStamp/Nonce` envelope so a plaintext reply is
//! never sent to a secure-mode URL.
use base64::{engine::general_purpose::STANDARD as BASE64_STANDARD, Engine as _};
use rand_core::{OsRng, RngCore};
use sha1::{Digest as Sha1Digest, Sha1};

use crate::official_account_notify::{decode_encoding_aes_key, extract_tag, WechatNotifyError};
use crate::wechat_component::{component_full_release_action, WechatComponentTestAction};

/// Upper bound for a message field.
const MAX_FIELD_BYTES: usize = 8 * 1024;

/// One decrypted message or event pushed for an authorizer.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct AuthorizerMessage {
    /// Official account or mini program that sent the message.
    pub to_user: String,
    /// End user openid.
    pub from_user: String,
    /// Provider creation time.
    pub create_time: i64,
    /// `text`, `event`, `image`, and so on.
    pub msg_type: String,
    /// Text content when the message is a text message.
    pub content: Option<String>,
    /// Provider message id when present.
    pub msg_id: Option<String>,
    /// Event name for `event` messages.
    pub event: Option<String>,
    /// Event key for subscribe/scan events.
    pub event_key: Option<String>,
}

/// A message parsing failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentMessageError {
    /// A required element is missing.
    InvalidMessage(&'static str),
    /// A numeric element is malformed.
    InvalidNumber(&'static str),
    /// Encryption of a reply failed.
    Crypto(String),
}

impl std::fmt::Display for WechatComponentMessageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidMessage(field) => write!(f, "authorizer message is missing {field}"),
            Self::InvalidNumber(field) => write!(f, "authorizer message {field} is not a number"),
            Self::Crypto(detail) => write!(f, "authorizer reply encryption failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentMessageError {}

impl From<WechatNotifyError> for WechatComponentMessageError {
    fn from(error: WechatNotifyError) -> Self {
        Self::Crypto(error.to_string())
    }
}

/// What the callback must do with one message.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuthorizerMessageAction {
    /// Reply with this text (encrypted in secure mode).
    ReplyText(String),
    /// Exchange the authorization code and follow up asynchronously.
    QueryAuthCode(String),
    /// Acknowledge without a passive reply.
    Acknowledge,
}

/// Parses the decrypted message XML.
pub fn parse_authorizer_message(
    xml: &str,
) -> Result<AuthorizerMessage, WechatComponentMessageError> {
    let to_user = required(xml, "ToUserName")?;
    let from_user = required(xml, "FromUserName")?;
    let create_time = required(xml, "CreateTime")?
        .parse::<i64>()
        .map_err(|_| WechatComponentMessageError::InvalidNumber("CreateTime"))?;
    let msg_type = required(xml, "MsgType")?;
    Ok(AuthorizerMessage {
        to_user,
        from_user,
        create_time,
        msg_type,
        content: optional(xml, "Content")?,
        msg_id: optional(xml, "MsgId")?,
        event: optional(xml, "Event")?,
        event_key: optional(xml, "EventKey")?,
    })
}

/// The idempotency key for one message.
pub fn message_dedupe_key(message: &AuthorizerMessage) -> String {
    match message.msg_id.as_deref().filter(|value| !value.is_empty()) {
        Some(msg_id) => format!("msg:{msg_id}"),
        None => format!(
            "event:{}:{}:{}:{}",
            message.event.as_deref().unwrap_or("-"),
            message.from_user,
            message.event_key.as_deref().unwrap_or("-"),
            message.create_time
        ),
    }
}

/// Decides the reply for one message.
pub fn decide_message_action(message: &AuthorizerMessage) -> AuthorizerMessageAction {
    let Some(content) = message.content.as_deref() else {
        return AuthorizerMessageAction::Acknowledge;
    };
    match component_full_release_action(content) {
        Some(WechatComponentTestAction::ReplyText(text)) => {
            AuthorizerMessageAction::ReplyText(text)
        }
        Some(WechatComponentTestAction::QueryAuthCode(code)) => {
            AuthorizerMessageAction::QueryAuthCode(code)
        }
        None => AuthorizerMessageAction::Acknowledge,
    }
}

/// Builds the plaintext text reply for one message.
pub fn build_text_reply(message: &AuthorizerMessage, content: &str, create_time: i64) -> String {
    format!(
        "<xml><ToUserName><![CDATA[{to}]]></ToUserName>\
         <FromUserName><![CDATA[{from}]]></FromUserName>\
         <CreateTime>{create_time}</CreateTime>\
         <MsgType><![CDATA[text]]></MsgType>\
         <Content><![CDATA[{content}]]></Content></xml>",
        to = message.from_user,
        from = message.to_user,
    )
}

/// Encrypts a plaintext reply into the secure-mode response envelope.
pub fn encrypt_reply_envelope(
    encoding_aes_key: &str,
    callback_token: &str,
    app_id: &str,
    plain_xml: &str,
    timestamp: i64,
    nonce: &str,
) -> Result<String, WechatComponentMessageError> {
    let encrypt = encrypt_blob(encoding_aes_key, app_id, plain_xml)?;
    let signature = reply_signature(callback_token, timestamp, nonce, &encrypt);
    Ok(format!(
        "<xml><Encrypt><![CDATA[{encrypt}]]></Encrypt>\
         <MsgSignature><![CDATA[{signature}]]></MsgSignature>\
         <TimeStamp>{timestamp}</TimeStamp>\
         <Nonce><![CDATA[{nonce}]]></Nonce></xml>"
    ))
}

fn encrypt_blob(
    encoding_aes_key: &str,
    app_id: &str,
    plain_xml: &str,
) -> Result<String, WechatComponentMessageError> {
    use aes::Aes256;
    use cbc::cipher::{block_padding::Pkcs7, BlockEncryptMut, KeyIvInit};
    let key = decode_encoding_aes_key(encoding_aes_key)?;
    let mut payload = vec![0u8; 16];
    OsRng.fill_bytes(&mut payload);
    let message = plain_xml.as_bytes();
    let length = u32::try_from(message.len())
        .map_err(|_| WechatComponentMessageError::Crypto("reply is too long".to_string()))?;
    payload.extend_from_slice(&length.to_be_bytes());
    payload.extend_from_slice(message);
    payload.extend_from_slice(app_id.as_bytes());
    let mut buffer = vec![0u8; payload.len() + 16];
    buffer[..payload.len()].copy_from_slice(&payload);
    let encryptor = cbc::Encryptor::<Aes256>::new_from_slices(&key, &key[..16])
        .map_err(|_| WechatComponentMessageError::Crypto("AES key or IV is invalid".to_string()))?;
    let ciphertext = encryptor
        .encrypt_padded_mut::<Pkcs7>(&mut buffer, payload.len())
        .map_err(|_| WechatComponentMessageError::Crypto("AES encryption failed".to_string()))?;
    Ok(BASE64_STANDARD.encode(ciphertext))
}

fn reply_signature(token: &str, timestamp: i64, nonce: &str, encrypt: &str) -> String {
    let mut parts = [
        token.to_string(),
        timestamp.to_string(),
        nonce.to_string(),
        encrypt.to_string(),
    ];
    parts.sort_unstable();
    let digest = Sha1::digest(parts.concat().as_bytes());
    let mut hex = String::with_capacity(40);
    for byte in digest {
        hex.push_str(&format!("{byte:02x}"));
    }
    hex
}

fn required(xml: &str, tag: &'static str) -> Result<String, WechatComponentMessageError> {
    optional(xml, tag)?.ok_or(WechatComponentMessageError::InvalidMessage(tag))
}

fn optional(xml: &str, tag: &str) -> Result<Option<String>, WechatComponentMessageError> {
    let value = extract_tag(xml, tag, MAX_FIELD_BYTES)
        .map_err(|_| WechatComponentMessageError::InvalidMessage("well-formed xml"))?;
    Ok(value.filter(|item| !item.trim().is_empty()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::official_account_notify::decrypt_wechat_blob;
    use crate::wechat_component::{COMPONENT_TEST_TEXT, COMPONENT_TEST_TEXT_REPLY};

    const AES_KEY: &str = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    const TOKEN: &str = "callback-token";

    fn text_message(content: &str) -> String {
        format!(
            "<xml><ToUserName><![CDATA[gh_authorizer]]></ToUserName>\
             <FromUserName><![CDATA[openid-1]]></FromUserName>\
             <CreateTime>1700000000</CreateTime>\
             <MsgType><![CDATA[text]]></MsgType>\
             <Content><![CDATA[{content}]]></Content>\
             <MsgId>1000000001</MsgId></xml>"
        )
    }

    #[test]
    fn parses_a_text_message() {
        let message = parse_authorizer_message(&text_message("hello")).expect("message");
        assert_eq!(message.to_user, "gh_authorizer");
        assert_eq!(message.from_user, "openid-1");
        assert_eq!(message.create_time, 1_700_000_000);
        assert_eq!(message.msg_type, "text");
        assert_eq!(message.content.as_deref(), Some("hello"));
        assert_eq!(message.msg_id.as_deref(), Some("1000000001"));
        assert_eq!(message_dedupe_key(&message), "msg:1000000001");
    }

    #[test]
    fn deduplicates_events_without_a_message_id() {
        let xml = "<xml><ToUserName><![CDATA[gh]]></ToUserName>\
                   <FromUserName><![CDATA[openid]]></FromUserName>\
                   <CreateTime>1700000000</CreateTime>\
                   <MsgType><![CDATA[event]]></MsgType>\
                   <Event><![CDATA[subscribe]]></Event>\
                   <EventKey><![CDATA[qrscene_1]]></EventKey></xml>";
        let message = parse_authorizer_message(xml).expect("message");
        assert_eq!(
            message_dedupe_key(&message),
            "event:subscribe:openid:qrscene_1:1700000000"
        );
    }

    #[test]
    fn answers_the_full_release_probes() {
        let probe = parse_authorizer_message(&text_message(COMPONENT_TEST_TEXT)).expect("message");
        assert_eq!(
            decide_message_action(&probe),
            AuthorizerMessageAction::ReplyText(COMPONENT_TEST_TEXT_REPLY.to_string())
        );
        let query = parse_authorizer_message(&text_message("QUERY_AUTH_CODE:auth-code-1"))
            .expect("message");
        assert_eq!(
            decide_message_action(&query),
            AuthorizerMessageAction::QueryAuthCode("auth-code-1".to_string())
        );
        let normal = parse_authorizer_message(&text_message("hi")).expect("message");
        assert_eq!(
            decide_message_action(&normal),
            AuthorizerMessageAction::Acknowledge
        );
    }

    #[test]
    fn rejects_a_message_without_a_type() {
        let error = parse_authorizer_message("<xml></xml>").expect_err("missing type");
        assert!(matches!(
            error,
            WechatComponentMessageError::InvalidMessage("ToUserName")
        ));
    }

    #[test]
    fn encrypted_reply_round_trips() {
        let message =
            parse_authorizer_message(&text_message(COMPONENT_TEST_TEXT)).expect("message");
        let reply = build_text_reply(&message, COMPONENT_TEST_TEXT_REPLY, 1_700_000_100);
        let envelope = encrypt_reply_envelope(
            AES_KEY,
            TOKEN,
            "wxcomponent",
            &reply,
            1_700_000_100,
            "nonce-1",
        )
        .expect("envelope");
        assert!(envelope.contains("<Encrypt>"));
        let encrypted = extract_tag(&envelope, "Encrypt", 96 * 1024)
            .expect("extract")
            .expect("encrypt");
        let (plain, app_id) = decrypt_wechat_blob(AES_KEY, &encrypted).expect("decrypt");
        assert_eq!(app_id, "wxcomponent");
        let plain = String::from_utf8(plain).expect("utf-8");
        assert!(plain.contains(COMPONENT_TEST_TEXT_REPLY));
        let signature = extract_tag(&envelope, "MsgSignature", 256)
            .expect("extract")
            .expect("signature");
        assert_eq!(
            signature,
            reply_signature(TOKEN, 1_700_000_100, "nonce-1", &encrypted)
        );
    }
}
