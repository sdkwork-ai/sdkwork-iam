//! Fail-closed AES-256-GCM envelope for provider credential material.
//!
//! The IAM signing-key helper (`sdkwork-iam-bootstrap`) falls back to bare
//! base64 when no master secret is configured. Credential material must not do
//! that: sealing without a master secret is an error, so a misconfigured
//! deployment fails loudly instead of writing recoverable plaintext into the
//! database.

use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use rand_core::OsRng;
use sha2::{Digest, Sha256};

use crate::model::ProviderAccountError;

/// Prefix written in front of every sealed payload.
pub const ENVELOPE_PREFIX: &str = "pcenc:v1:";
/// Algorithm recorded next to the ciphertext.
pub const ENVELOPE_ALGORITHM: &str = "aes-256-gcm";
/// Key id recorded next to the ciphertext.
pub const PRIMARY_KEY_ID: &str = "local-aes256gcm:primary";
/// Master secret environment variable.
pub const MASTER_SECRET_ENV: &str = "SDKWORK_IAM_PROVIDER_CREDENTIAL_MASTER_SECRET";
/// Comma-separated historical master secrets, tried after the active one.
pub const LEGACY_MASTER_SECRETS_ENV: &str = "SDKWORK_IAM_PROVIDER_CREDENTIAL_LEGACY_MASTER_SECRETS";

/// Nonce length used by AES-256-GCM.
const NONCE_LENGTH: usize = 12;

fn env_value(name: &str) -> Option<String> {
    std::env::var(name)
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

/// The configured active master secret, if any.
pub fn active_master_secret() -> Option<String> {
    env_value(MASTER_SECRET_ENV)
}

/// Historical master secrets, in declaration order.
pub fn legacy_master_secrets() -> Vec<String> {
    env_value(LEGACY_MASTER_SECRETS_ENV)
        .map(|raw| {
            raw.split(',')
                .map(str::trim)
                .filter(|candidate| !candidate.is_empty())
                .map(str::to_owned)
                .collect()
        })
        .unwrap_or_default()
}

/// Whether credential sealing is possible in this process. Callers use this for
/// readiness checks so a missing master secret surfaces before a write attempt.
pub fn sealing_available() -> bool {
    resolve_active_master(active_master_secret()).is_ok()
}

/// Fail-closed resolution of the active master secret.
pub fn resolve_active_master(candidate: Option<String>) -> Result<String, ProviderAccountError> {
    candidate
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| {
            ProviderAccountError::Cipher(format!(
                "{MASTER_SECRET_ENV} must be configured before provider credentials can be stored"
            ))
        })
}

/// Seal `plaintext` with the process master secret.
pub fn seal(plaintext: &[u8]) -> Result<String, ProviderAccountError> {
    let master = resolve_active_master(active_master_secret())?;
    seal_with_master(plaintext, &master)
}

/// Seal `plaintext` with an explicit master secret. Blank masters are rejected.
pub fn seal_with_master(plaintext: &[u8], master: &str) -> Result<String, ProviderAccountError> {
    let key = derive_key(master)?;
    let cipher = Aes256Gcm::new(&key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let ciphertext = cipher.encrypt(&nonce, plaintext).map_err(|_| {
        ProviderAccountError::Cipher("failed to seal provider credential".to_owned())
    })?;
    let mut payload = nonce.to_vec();
    payload.extend(ciphertext);
    Ok(format!(
        "{ENVELOPE_PREFIX}{}",
        URL_SAFE_NO_PAD.encode(payload)
    ))
}

/// Open a sealed payload using the active master secret, then historical ones.
pub fn open(envelope: &str) -> Result<Vec<u8>, ProviderAccountError> {
    let mut candidates: Vec<String> = Vec::new();
    if let Some(active) = active_master_secret() {
        candidates.push(active);
    }
    candidates.extend(legacy_master_secrets());
    open_with_masters(envelope, &candidates)
}

/// Open a sealed payload against an explicit candidate key list.
pub fn open_with_masters(
    envelope: &str,
    masters: &[String],
) -> Result<Vec<u8>, ProviderAccountError> {
    let encoded = envelope.trim();
    let payload = encoded.strip_prefix(ENVELOPE_PREFIX).ok_or_else(|| {
        ProviderAccountError::Cipher(format!(
            "provider credential envelope must start with {ENVELOPE_PREFIX}"
        ))
    })?;
    let decoded = URL_SAFE_NO_PAD.decode(payload).map_err(|error| {
        ProviderAccountError::Cipher(format!(
            "provider credential envelope is not valid base64url: {error}"
        ))
    })?;
    if decoded.len() <= NONCE_LENGTH {
        return Err(ProviderAccountError::Cipher(
            "provider credential envelope is truncated".to_owned(),
        ));
    }
    if masters.is_empty() {
        return Err(ProviderAccountError::Cipher(format!(
            "{MASTER_SECRET_ENV} must be configured before provider credentials can be read"
        )));
    }

    let (nonce_bytes, ciphertext) = decoded.split_at(NONCE_LENGTH);
    let nonce = Nonce::from_slice(nonce_bytes);
    let mut last_error = None;
    for master in masters {
        let key = match derive_key(master) {
            Ok(key) => key,
            Err(error) => {
                last_error = Some(error);
                continue;
            }
        };
        match Aes256Gcm::new(&key).decrypt(nonce, ciphertext) {
            Ok(plaintext) => return Ok(plaintext),
            Err(_) => {
                last_error = Some(ProviderAccountError::Cipher(
                    "provider credential envelope could not be decrypted with any configured master secret"
                        .to_owned(),
                ));
            }
        }
    }
    Err(last_error.unwrap_or_else(|| {
        ProviderAccountError::Cipher(
            "provider credential envelope could not be decrypted".to_owned(),
        )
    }))
}

/// Stable, non-reversible fingerprint of a secret payload.
pub fn fingerprint(plaintext: &[u8]) -> String {
    format!("{:x}", Sha256::digest(plaintext))
}

/// Human-readable, non-reversible label for an access key id.
pub fn mask_secret_label(value: &str) -> String {
    let trimmed = value.trim();
    let characters: Vec<char> = trimmed.chars().collect();
    if characters.len() <= 8 {
        return "*".repeat(characters.len().max(3));
    }
    let head: String = characters.iter().take(4).collect();
    let tail: String = characters.iter().skip(characters.len() - 4).collect();
    format!("{head}****{tail}")
}

fn derive_key(master: &str) -> Result<Key<Aes256Gcm>, ProviderAccountError> {
    let trimmed = master.trim();
    if trimmed.is_empty() {
        return Err(ProviderAccountError::Cipher(
            "provider credential master secret must not be blank".to_owned(),
        ));
    }
    let digest = Sha256::digest(trimmed.as_bytes());
    Ok(*Key::<Aes256Gcm>::from_slice(&digest))
}

#[cfg(test)]
mod tests {
    use super::*;

    const MASTER: &str = "unit-test-master-secret";

    #[test]
    fn sealed_payload_roundtrips_and_is_prefixed() {
        let sealed = seal_with_master(b"{\"accessKeyId\":\"AKID\"}", MASTER).unwrap();
        assert!(sealed.starts_with(ENVELOPE_PREFIX));
        let opened = open_with_masters(&sealed, &[MASTER.to_owned()]).unwrap();
        assert_eq!(opened, b"{\"accessKeyId\":\"AKID\"}");
    }

    #[test]
    fn sealing_without_master_secret_fails_closed() {
        let error = resolve_active_master(None).expect_err("missing master must fail");
        assert_eq!(
            error.wire_code(),
            "iam_provider_credential_cipher_unavailable"
        );
        assert!(resolve_active_master(Some("   ".to_owned())).is_err());
        assert!(seal_with_master(b"secret", "").is_err());
        assert!(open_with_masters(&format!("{ENVELOPE_PREFIX}AAAA"), &[]).is_err());
    }

    #[test]
    fn tampered_ciphertext_is_rejected() {
        let sealed = seal_with_master(b"secret-payload", MASTER).unwrap();
        let mut bytes = URL_SAFE_NO_PAD
            .decode(sealed.strip_prefix(ENVELOPE_PREFIX).unwrap())
            .unwrap();
        let last = bytes.len() - 1;
        bytes[last] ^= 0x01;
        let tampered = format!("{ENVELOPE_PREFIX}{}", URL_SAFE_NO_PAD.encode(bytes));
        assert!(open_with_masters(&tampered, &[MASTER.to_owned()]).is_err());
    }

    #[test]
    fn legacy_master_secret_can_still_open_old_payloads() {
        let sealed = seal_with_master(b"legacy", "old-master").unwrap();
        let opened =
            open_with_masters(&sealed, &["new-master".to_owned(), "old-master".to_owned()])
                .unwrap();
        assert_eq!(opened, b"legacy");
    }

    #[test]
    fn envelope_without_prefix_is_rejected() {
        assert!(open_with_masters("bm90LWEtc2VhbGVk", &[MASTER.to_owned()]).is_err());
    }

    #[test]
    fn fingerprint_is_stable_and_distinguishes_payloads() {
        assert_eq!(fingerprint(b"a"), fingerprint(b"a"));
        assert_ne!(fingerprint(b"a"), fingerprint(b"b"));
        assert_eq!(fingerprint(b"a").len(), 64);
    }

    #[test]
    fn secret_labels_are_masked() {
        assert_eq!(mask_secret_label("AKIDEXAMPLEKEY"), "AKID****EKEY");
        assert_eq!(mask_secret_label("short"), "*****");
    }
}
