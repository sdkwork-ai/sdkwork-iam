//! PostgreSQL verification-ticket store for a WeChat component.
//!
//! The ticket value is a credential: it is accepted by
//! `api_component_token`, so it lives in `iam_oauth_secret` under
//! `secret_owner_kind = 'operator_platform'` and
//! `secret_kind = 'component_verify_ticket'`, encrypted with the same
//! `encode_signing_secret_ref` used by every other IAM secret. The
//! `iam_oauth_operator_platform` row carries only operational freshness
//! markers, never the ticket itself.
//!
//! `save` runs in one transaction: it locks the component row, re-checks the
//! stored `ticket_create_time` so an out-of-order push that lost a race is still
//! rejected, rotates the secret row in place (a ticket is ephemeral, so keeping
//! one active row is the correct history), and updates the freshness markers.
//! Rejecting inside the lock is what makes two replicas process the same push
//! safely.
use async_trait::async_trait;
use chrono::Utc;
use sqlx::{PgPool, Row};

use sdkwork_iam_bootstrap::{
    decode_signing_secret_ref, encode_signing_secret_ref, hash_secret_ref,
};

use crate::wechat_component_ticket::{
    ComponentTicketStore, WechatComponentTicket, WechatComponentTicketError,
};

/// The component AppID is not configured on any operator platform.
const PLATFORM_NOT_FOUND: &str = "operator platform for component appid not found";

/// The shared ticket store.
pub struct PgComponentTicketStore {
    pool: PgPool,
}

impl PgComponentTicketStore {
    /// Builds the store over the IAM database pool.
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ComponentTicketStore for PgComponentTicketStore {
    async fn latest(
        &self,
        component_app_id: &str,
    ) -> Result<Option<WechatComponentTicket>, WechatComponentTicketError> {
        let row = sqlx::query(
            "SELECT op.ticket_create_time, op.ticket_received_at, op.ticket_expires_at, \
                    secret.secret_ref \
             FROM iam_oauth_operator_platform op \
             LEFT JOIN LATERAL ( \
                SELECT secret_ref FROM iam_oauth_secret \
                WHERE operator_platform_id = op.id \
                  AND secret_kind = 'component_verify_ticket' \
                  AND status = 'active' \
                ORDER BY active_from DESC, updated_at DESC, id DESC \
                LIMIT 1 \
             ) secret ON TRUE \
             WHERE op.component_appid = $1",
        )
        .bind(component_app_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(store_error)?;
        let Some(row) = row else {
            return Ok(None);
        };
        let secret_ref: Option<String> = row.try_get("secret_ref").map_err(store_error)?;
        let Some(secret_ref) = secret_ref else {
            return Ok(None);
        };
        let ticket = decode_signing_secret_ref(&secret_ref)
            .map_err(|error| WechatComponentTicketError::Store(error.to_string()))?;
        let ticket = String::from_utf8(ticket)
            .map_err(|_| WechatComponentTicketError::Store("stored ticket is not utf-8".into()))?;
        let create_time = parse_epoch(
            row.try_get::<Option<String>, _>("ticket_create_time")
                .map_err(store_error)?,
        )
        .ok_or_else(|| WechatComponentTicketError::Store("ticket_create_time is missing".into()))?;
        let received_at = parse_epoch(
            row.try_get::<Option<String>, _>("ticket_received_at")
                .map_err(store_error)?,
        )
        .ok_or_else(|| WechatComponentTicketError::Store("ticket_received_at is missing".into()))?;
        let expires_at = parse_epoch(
            row.try_get::<Option<String>, _>("ticket_expires_at")
                .map_err(store_error)?,
        )
        .ok_or_else(|| WechatComponentTicketError::Store("ticket_expires_at is missing".into()))?;
        Ok(Some(WechatComponentTicket {
            component_app_id: component_app_id.to_string(),
            ticket,
            create_time,
            received_at,
            expires_at,
        }))
    }

    async fn save(&self, ticket: &WechatComponentTicket) -> Result<(), WechatComponentTicketError> {
        let mut transaction = self.pool.begin().await.map_err(store_error)?;
        let row = sqlx::query(
            "SELECT id, tenant_id, organization_id, ticket_create_time \
             FROM iam_oauth_operator_platform WHERE component_appid = $1 FOR UPDATE",
        )
        .bind(&ticket.component_app_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(store_error)?;
        let Some(row) = row else {
            return Err(WechatComponentTicketError::Store(
                PLATFORM_NOT_FOUND.to_string(),
            ));
        };
        let current_create_time =
            parse_epoch(row.try_get("ticket_create_time").map_err(store_error)?);
        if current_create_time.is_some_and(|current| current >= ticket.create_time) {
            transaction.commit().await.map_err(store_error)?;
            return Ok(());
        }
        let platform_id: String = row.try_get("id").map_err(store_error)?;
        let tenant_id: String = row.try_get("tenant_id").map_err(store_error)?;
        let now = Utc::now().to_rfc3339();
        let secret_ref = encode_signing_secret_ref(ticket.ticket.as_bytes());
        let secret_hash = hash_secret_ref(&secret_ref);
        let active_secret_id = sqlx::query_scalar::<_, String>(
            "SELECT id FROM iam_oauth_secret \
             WHERE operator_platform_id = $1 AND secret_kind = 'component_verify_ticket' \
               AND status = 'active' \
             ORDER BY active_from DESC, updated_at DESC, id DESC \
             LIMIT 1 FOR UPDATE",
        )
        .bind(&platform_id)
        .fetch_optional(&mut *transaction)
        .await
        .map_err(store_error)?;
        match active_secret_id {
            Some(secret_id) => {
                sqlx::query(
                    "UPDATE iam_oauth_secret SET secret_ref = $1, secret_hash = $2, \
                            version = version + 1, updated_at = $3 \
                     WHERE tenant_id = $4 AND id = $5",
                )
                .bind(&secret_ref)
                .bind(&secret_hash)
                .bind(&now)
                .bind(&tenant_id)
                .bind(&secret_id)
                .execute(&mut *transaction)
                .await
                .map_err(store_error)?;
            }
            None => {
                sqlx::query(
                    "INSERT INTO iam_oauth_secret \
                        (id, uuid, tenant_id, secret_owner_kind, secret_owner_id, \
                         operator_platform_id, secret_kind, secret_ref, secret_hash, \
                         active_from, status, created_at, updated_at) \
                     VALUES ($1, $2, $3, 'operator_platform', $4, $4, \
                             'component_verify_ticket', $5, $6, $7, 'active', $7, $7)",
                )
                .bind(format!("iamos-{}", uuid::Uuid::now_v7()))
                .bind(uuid::Uuid::now_v7().to_string())
                .bind(&tenant_id)
                .bind(&platform_id)
                .bind(&secret_ref)
                .bind(&secret_hash)
                .bind(&now)
                .execute(&mut *transaction)
                .await
                .map_err(store_error)?;
            }
        }
        sqlx::query(
            "UPDATE iam_oauth_operator_platform SET \
                ticket_status = 'configured', \
                ticket_create_time = $2, \
                ticket_received_at = $3, \
                ticket_expires_at = $4, \
                updated_at = $5, \
                version = version + 1 \
             WHERE id = $1",
        )
        .bind(&platform_id)
        .bind(ticket.create_time.to_string())
        .bind(ticket.received_at.to_string())
        .bind(ticket.expires_at.to_string())
        .bind(&now)
        .execute(&mut *transaction)
        .await
        .map_err(store_error)?;
        transaction.commit().await.map_err(store_error)?;
        Ok(())
    }
}

fn parse_epoch(value: Option<String>) -> Option<i64> {
    value.and_then(|raw| raw.trim().parse::<i64>().ok())
}

fn store_error(error: sqlx::Error) -> WechatComponentTicketError {
    WechatComponentTicketError::Store(error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_epoch_columns_and_rejects_garbage() {
        assert_eq!(
            parse_epoch(Some("1700000000".to_string())),
            Some(1_700_000_000)
        );
        assert_eq!(
            parse_epoch(Some(" 1700000000 ".to_string())),
            Some(1_700_000_000)
        );
        assert_eq!(parse_epoch(Some("not-a-number".to_string())), None);
        assert_eq!(parse_epoch(None), None);
    }
}
