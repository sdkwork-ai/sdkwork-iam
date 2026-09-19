//! In-process session scope cache (read-through framework hook).
//!
//! Decision: the `data_scope` / `permission_scope` arrays are no longer
//! embedded in the local dual-token JWTs; the authoritative copy lives in the
//! `iam_session` row and is (re)loaded at request time on every context
//! resolution. The DB fetch always happens anyway to validate session
//! expiry/revocation, so routing scope reads through this cache would add
//! staleness risk with no real DB read savings. This module therefore stays a
//! thin hook: a bounded, TTL'd in-process map that the scope-changing write
//! paths call `invalidate` on, keeping scope reads reading the session row.

use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const SCOPE_CACHE_TTL: Duration = Duration::from_secs(5);
const SCOPE_CACHE_MAX_ENTRIES: usize = 4096;

type ScopeKey = (String, String);

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SessionScopes {
    pub data_scope: Vec<String>,
    pub permission_scope: Vec<String>,
}

struct Entry {
    scopes: SessionScopes,
    inserted_at: Instant,
}

struct SessionScopeCache {
    entries: Mutex<HashMap<ScopeKey, Entry>>,
}

impl SessionScopeCache {
    fn new() -> Self {
        SessionScopeCache {
            entries: Mutex::new(HashMap::new()),
        }
    }

    fn get(&self, tenant_id: &str, session_id: &str) -> Option<SessionScopes> {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let now = Instant::now();
        let key = (tenant_id.to_owned(), session_id.to_owned());
        if let Some(entry) = entries.get(&key) {
            if now.duration_since(entry.inserted_at) > SCOPE_CACHE_TTL {
                entries.remove(&key);
                return None;
            }
            return Some(entry.scopes.clone());
        }
        None
    }

    fn insert(&self, tenant_id: &str, session_id: &str, scopes: SessionScopes) {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let key = (tenant_id.to_owned(), session_id.to_owned());
        if !entries.contains_key(&key) && entries.len() >= SCOPE_CACHE_MAX_ENTRIES {
            // Bounded capacity: on overflow drop the whole cache. Correctness
            // beats clever eviction here; the cache is only a best-effort hook
            // and scope reads fall back to the session row.
            entries.clear();
        }
        entries.insert(
            key,
            Entry {
                scopes,
                inserted_at: Instant::now(),
            },
        );
    }

    fn invalidate(&self, tenant_id: &str, session_id: &str) {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        entries.remove(&(tenant_id.to_owned(), session_id.to_owned()));
    }
}

fn shared_cache() -> &'static SessionScopeCache {
    static CACHE: OnceLock<SessionScopeCache> = OnceLock::new();
    CACHE.get_or_init(SessionScopeCache::new)
}

pub fn get_session_scopes(tenant_id: &str, session_id: &str) -> Option<SessionScopes> {
    shared_cache().get(tenant_id, session_id)
}

pub fn insert_session_scopes(tenant_id: &str, session_id: &str, scopes: SessionScopes) {
    shared_cache().insert(tenant_id, session_id, scopes);
}

pub fn invalidate_session_scopes(tenant_id: &str, session_id: &str) {
    shared_cache().invalidate(tenant_id, session_id);
}
