//! In-process cache of an installation's release scope.
//!
//! `APPLICATION_IDENTITY_SPEC.md` section 4.1 makes the release scope an
//! immutable property of one installation. The resolver has to attach it to the
//! principal of every authenticated request, and adding one indexed scalar read
//! to every request on the platform is a real cost for a value that cannot
//! change. This cache is the read-through store for it:
//!
//! - positive entries only: a miss (no installation for the anchor) is not
//!   cached, so a freshly provisioned installation becomes visible immediately;
//! - bounded TTL, so a repair applied directly in the database is picked up
//!   without a restart;
//! - explicit invalidation from the provisioning write path, so a
//!   re-provision of the same anchor never serves a stale level.

use crate::application_scope::ApplicationOwnershipScope;
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};
use std::time::{Duration, Instant};

const INSTALLATION_SCOPE_CACHE_TTL: Duration = Duration::from_secs(60);
const INSTALLATION_SCOPE_CACHE_MAX_ENTRIES: usize = 8192;

type ScopeKey = (String, String);

struct Entry {
    scope: ApplicationOwnershipScope,
    inserted_at: Instant,
}

struct InstallationScopeCache {
    entries: Mutex<HashMap<ScopeKey, Entry>>,
}

impl InstallationScopeCache {
    fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    fn get(&self, tenant_id: &str, app_id: &str) -> Option<ApplicationOwnershipScope> {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        let key = (tenant_id.to_owned(), app_id.to_owned());
        let now = Instant::now();
        match entries.get(&key) {
            Some(entry) if now.duration_since(entry.inserted_at) <= INSTALLATION_SCOPE_CACHE_TTL => {
                Some(entry.scope)
            }
            Some(_) => {
                entries.remove(&key);
                None
            }
            None => None,
        }
    }

    fn insert(&self, tenant_id: &str, app_id: &str, scope: ApplicationOwnershipScope) {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        if !entries.contains_key(&(tenant_id.to_owned(), app_id.to_owned()))
            && entries.len() >= INSTALLATION_SCOPE_CACHE_MAX_ENTRIES
        {
            // Bounded capacity: drop everything rather than evict cleverly. The
            // cache is an optimization; a cleared cache only costs DB reads.
            entries.clear();
        }
        entries.insert(
            (tenant_id.to_owned(), app_id.to_owned()),
            Entry {
                scope,
                inserted_at: Instant::now(),
            },
        );
    }

    fn invalidate(&self, tenant_id: &str, app_id: &str) {
        let mut entries = self
            .entries
            .lock()
            .unwrap_or_else(|poison| poison.into_inner());
        entries.remove(&(tenant_id.to_owned(), app_id.to_owned()));
    }
}

fn shared_cache() -> &'static InstallationScopeCache {
    static CACHE: OnceLock<InstallationScopeCache> = OnceLock::new();
    CACHE.get_or_init(InstallationScopeCache::new)
}

pub fn get_installation_scope(
    tenant_id: &str,
    app_id: &str,
) -> Option<ApplicationOwnershipScope> {
    shared_cache().get(tenant_id, app_id)
}

pub fn insert_installation_scope(
    tenant_id: &str,
    app_id: &str,
    scope: ApplicationOwnershipScope,
) {
    shared_cache().insert(tenant_id, app_id, scope);
}

pub fn invalidate_installation_scope(tenant_id: &str, app_id: &str) {
    shared_cache().invalidate(tenant_id, app_id)
}
