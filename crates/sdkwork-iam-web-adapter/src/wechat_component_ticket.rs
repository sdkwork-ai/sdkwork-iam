//! Verification-ticket ingestion policy for a WeChat component.
//!
//! WeChat pushes `component_verify_ticket` at least every ten minutes, and the
//! ticket is what the component token exchange needs. Two failure modes matter
//! more than the happy path:
//!
//! - **Reordering.** WeChat retries and can deliver an older push after a newer
//!   one. Overwriting a fresh ticket with a stale one silently breaks the next
//!   component-token refresh, so the store only accepts a strictly newer
//!   `CreateTime`.
//! - **Push stall.** A stopped push is not visible as an error: the ticket just
//!   ages out. The service exposes alert thresholds so an operator sees the
//!   stall before the twelve-hour validity ends.
//!
//! The service owns no transport and no SQL. It maps a verified
//! [`WechatComponentEvent`] to a stored ticket through a store port, which keeps
//! the ordering rules unit-testable and lets the PostgreSQL store add the
//! transaction and secret encryption.
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Mutex;

use crate::wechat_component::{
    WechatComponentEvent, WechatComponentInfoType, COMPONENT_VERIFY_TICKET_TTL_SECONDS,
};

/// Warn when no ticket has arrived for this long (the documented cadence is ten
/// minutes).
pub const TICKET_STALE_ALERT_SECONDS: i64 = 15 * 60;

/// Ask WeChat to restart the push when no ticket has arrived for this long.
pub const TICKET_RESTART_PUSH_SECONDS: i64 = 30 * 60;

/// One accepted verification ticket.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct WechatComponentTicket {
    /// Component AppID the ticket belongs to.
    pub component_app_id: String,
    /// Ticket value used by the component-token exchange.
    pub ticket: String,
    /// Provider `CreateTime`, used for ordering.
    pub create_time: i64,
    /// Local receive time, used for the stall alarm.
    pub received_at: i64,
    /// Unix second after which the ticket is no longer valid.
    pub expires_at: i64,
}

/// What happened to a pushed ticket.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ComponentTicketAcceptance {
    /// A strictly newer ticket replaced the stored one.
    Stored,
    /// The same or an older `CreateTime`; the stored ticket is unchanged.
    Duplicate,
    /// The event was not a verification-ticket push.
    NotAVerificationTicket,
    /// The push carried an empty ticket value.
    EmptyTicket,
}

/// The operator signal derived from the last receive time.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ComponentTicketAlert {
    /// A ticket arrived recently.
    Healthy,
    /// No ticket for [`TICKET_STALE_ALERT_SECONDS`].
    Stale,
    /// No ticket for [`TICKET_RESTART_PUSH_SECONDS`]; restart the push.
    PushStalled,
}

/// A ticket store failure.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum WechatComponentTicketError {
    /// The store backend failed.
    Store(String),
}

impl std::fmt::Display for WechatComponentTicketError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Store(detail) => write!(f, "component ticket store failed: {detail}"),
        }
    }
}

impl std::error::Error for WechatComponentTicketError {}

/// The ticket persistence port.
#[async_trait]
pub trait ComponentTicketStore: Send + Sync {
    /// Returns the newest accepted ticket for a component.
    async fn latest(
        &self,
        component_app_id: &str,
    ) -> Result<Option<WechatComponentTicket>, WechatComponentTicketError>;
    /// Stores a ticket that passed the ordering rule.
    async fn save(&self, ticket: &WechatComponentTicket) -> Result<(), WechatComponentTicketError>;
}

/// Process-local ticket store for tests and single-process deployments.
///
/// The mutex is held only for a synchronous map operation; no guard crosses an
/// `.await` boundary.
#[derive(Debug, Default)]
pub struct InMemoryComponentTicketStore {
    tickets: Mutex<HashMap<String, WechatComponentTicket>>,
}

impl InMemoryComponentTicketStore {
    /// Creates an empty store.
    pub fn new() -> Self {
        Self::default()
    }
}

#[async_trait]
impl ComponentTicketStore for InMemoryComponentTicketStore {
    async fn latest(
        &self,
        component_app_id: &str,
    ) -> Result<Option<WechatComponentTicket>, WechatComponentTicketError> {
        let tickets = self
            .tickets
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner());
        Ok(tickets.get(component_app_id).cloned())
    }

    async fn save(&self, ticket: &WechatComponentTicket) -> Result<(), WechatComponentTicketError> {
        self.tickets
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
            .insert(ticket.component_app_id.clone(), ticket.clone());
        Ok(())
    }
}

/// Applies ordering and freshness rules to pushed tickets.
pub struct WechatComponentTicketService<S: ComponentTicketStore> {
    store: S,
}

impl<S: ComponentTicketStore> WechatComponentTicketService<S> {
    /// Builds the service over a store.
    pub fn new(store: S) -> Self {
        Self { store }
    }

    /// Records one verified component event.
    ///
    /// @param event - the verified callback event.
    /// @param received_at - local Unix second when the push arrived.
    /// @returns whether a ticket was stored, ignored as duplicate, or rejected.
    pub async fn record(
        &self,
        event: &WechatComponentEvent,
        received_at: i64,
    ) -> Result<ComponentTicketAcceptance, WechatComponentTicketError> {
        if event.info_type != WechatComponentInfoType::VerifyTicket {
            return Ok(ComponentTicketAcceptance::NotAVerificationTicket);
        }
        let Some(ticket) = event
            .component_verify_ticket
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
        else {
            return Ok(ComponentTicketAcceptance::EmptyTicket);
        };
        let current = self.store.latest(&event.component_app_id).await?;
        if !should_replace_ticket(
            current.as_ref().map(|item| item.create_time),
            event.create_time,
        ) {
            return Ok(ComponentTicketAcceptance::Duplicate);
        }
        let stored = WechatComponentTicket {
            component_app_id: event.component_app_id.clone(),
            ticket: ticket.to_string(),
            create_time: event.create_time,
            received_at,
            expires_at: event.ticket_expires_at(),
        };
        self.store.save(&stored).await?;
        Ok(ComponentTicketAcceptance::Stored)
    }

    /// Returns the newest stored ticket.
    pub async fn latest(
        &self,
        component_app_id: &str,
    ) -> Result<Option<WechatComponentTicket>, WechatComponentTicketError> {
        self.store.latest(component_app_id).await
    }

    /// Derives the operator alert from the last receive time.
    pub async fn alert(
        &self,
        component_app_id: &str,
        now: i64,
    ) -> Result<ComponentTicketAlert, WechatComponentTicketError> {
        let latest = self.store.latest(component_app_id).await?;
        Ok(ticket_alert(
            latest.as_ref().map(|item| item.received_at),
            now,
        ))
    }
}

/// True when an incoming `CreateTime` is strictly newer than the stored one.
///
/// @param current_create_time - stored ticket `CreateTime`, if any.
/// @param incoming_create_time - pushed ticket `CreateTime`.
pub fn should_replace_ticket(current_create_time: Option<i64>, incoming_create_time: i64) -> bool {
    match current_create_time {
        None => true,
        Some(current) => incoming_create_time > current,
    }
}

/// Maps the last receive time to the operator alert level.
///
/// @param last_received_at - local Unix second of the newest ticket.
/// @param now - current Unix second.
pub fn ticket_alert(last_received_at: Option<i64>, now: i64) -> ComponentTicketAlert {
    let Some(last_received_at) = last_received_at else {
        return ComponentTicketAlert::PushStalled;
    };
    let age = now.saturating_sub(last_received_at);
    if age >= TICKET_RESTART_PUSH_SECONDS {
        ComponentTicketAlert::PushStalled
    } else if age >= TICKET_STALE_ALERT_SECONDS {
        ComponentTicketAlert::Stale
    } else {
        ComponentTicketAlert::Healthy
    }
}

/// The documented validity of a pushed ticket, exposed for callers that render
/// the remaining lifetime.
pub fn ticket_validity_seconds() -> i64 {
    COMPONENT_VERIFY_TICKET_TTL_SECONDS
}

#[cfg(test)]
mod tests {
    use super::*;

    const NOW: i64 = 1_700_000_000;

    fn event(create_time: i64, ticket: &str) -> WechatComponentEvent {
        WechatComponentEvent {
            component_app_id: "wxcomponent".to_string(),
            create_time,
            info_type: WechatComponentInfoType::VerifyTicket,
            raw_info_type: "component_verify_ticket".to_string(),
            authorizer_app_id: None,
            authorization_code: None,
            authorization_code_expired_time: None,
            pre_auth_code: None,
            component_verify_ticket: Some(ticket.to_string()),
        }
    }

    #[tokio::test]
    async fn stores_the_first_ticket() {
        let service = WechatComponentTicketService::new(InMemoryComponentTicketStore::new());
        let outcome = service
            .record(&event(NOW, "ticket-a"), NOW)
            .await
            .expect("record");
        assert_eq!(outcome, ComponentTicketAcceptance::Stored);
        let stored = service
            .latest("wxcomponent")
            .await
            .expect("latest")
            .expect("ticket");
        assert_eq!(stored.ticket, "ticket-a");
        assert_eq!(stored.expires_at, NOW + ticket_validity_seconds());
    }

    #[tokio::test]
    async fn ignores_duplicate_and_out_of_order_pushes() {
        let service = WechatComponentTicketService::new(InMemoryComponentTicketStore::new());
        service
            .record(&event(NOW + 600, "newer"), NOW)
            .await
            .expect("record");
        assert_eq!(
            service
                .record(&event(NOW + 600, "same"), NOW)
                .await
                .expect("record"),
            ComponentTicketAcceptance::Duplicate
        );
        assert_eq!(
            service
                .record(&event(NOW, "older"), NOW)
                .await
                .expect("record"),
            ComponentTicketAcceptance::Duplicate
        );
        let stored = service
            .latest("wxcomponent")
            .await
            .expect("latest")
            .expect("ticket");
        assert_eq!(stored.ticket, "newer");
    }

    #[tokio::test]
    async fn replaces_a_strictly_newer_ticket() {
        let service = WechatComponentTicketService::new(InMemoryComponentTicketStore::new());
        service
            .record(&event(NOW, "first"), NOW)
            .await
            .expect("record");
        service
            .record(&event(NOW + 600, "second"), NOW + 600)
            .await
            .expect("record");
        let stored = service
            .latest("wxcomponent")
            .await
            .expect("latest")
            .expect("ticket");
        assert_eq!(stored.ticket, "second");
    }

    #[tokio::test]
    async fn ignores_non_ticket_events_and_empty_values() {
        let service = WechatComponentTicketService::new(InMemoryComponentTicketStore::new());
        let mut authorized = event(NOW, "ticket");
        authorized.info_type = WechatComponentInfoType::Authorized;
        assert_eq!(
            service.record(&authorized, NOW).await.expect("record"),
            ComponentTicketAcceptance::NotAVerificationTicket
        );
        assert_eq!(
            service
                .record(&event(NOW, "   "), NOW)
                .await
                .expect("record"),
            ComponentTicketAcceptance::EmptyTicket
        );
        assert!(service
            .latest("wxcomponent")
            .await
            .expect("latest")
            .is_none());
    }

    #[tokio::test]
    async fn reports_stall_before_the_ticket_expires() {
        let service = WechatComponentTicketService::new(InMemoryComponentTicketStore::new());
        assert_eq!(
            service.alert("wxcomponent", NOW).await.expect("alert"),
            ComponentTicketAlert::PushStalled
        );
        service
            .record(&event(NOW, "ticket"), NOW)
            .await
            .expect("record");
        assert_eq!(
            service.alert("wxcomponent", NOW + 60).await.expect("alert"),
            ComponentTicketAlert::Healthy
        );
        assert_eq!(
            service
                .alert("wxcomponent", NOW + TICKET_STALE_ALERT_SECONDS)
                .await
                .expect("alert"),
            ComponentTicketAlert::Stale
        );
        assert_eq!(
            service
                .alert("wxcomponent", NOW + TICKET_RESTART_PUSH_SECONDS)
                .await
                .expect("alert"),
            ComponentTicketAlert::PushStalled
        );
    }

    #[test]
    fn ordering_requires_a_strictly_newer_create_time() {
        assert!(should_replace_ticket(None, 10));
        assert!(should_replace_ticket(Some(10), 11));
        assert!(!should_replace_ticket(Some(10), 10));
        assert!(!should_replace_ticket(Some(10), 9));
    }
}
