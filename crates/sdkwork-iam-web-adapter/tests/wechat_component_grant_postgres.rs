//! Authorization-code exchange against a real PostgreSQL instance.
//!
//! Proves the persistence contract: the resource account is created in
//! `operator_authorized_account` mode, exactly one active authorization row is
//! kept per platform/account, the refresh token is stored encrypted, and a
//! re-authorization updates the same rows instead of duplicating them.
//!
//! Run with a database that has migration 0046 applied:
//!
//! ```text
//! SDKWORK_DATABASE_URL=postgresql://user:pass@127.0.0.1:5432/db \
//!   cargo test -p sdkwork-iam-web-adapter --test wechat_component_grant_postgres -- --ignored
//! ```
use async_trait::async_trait;
use chrono::Utc;
use sdkwork_iam_bootstrap::{encode_signing_secret_ref, hash_secret_ref};
use sdkwork_iam_web_adapter::{
    complete_authorization, component_token_cache_key, now_epoch_seconds,
    AuthorizationCompletionRequest, PgAuthorizerGrantStore, PgComponentPlatformConfigReader,
    PgComponentTokenCache, ResourceAccountKind, WechatComponentApi, WechatComponentApiError,
    WechatComponentTokenService, WechatComponentTransport,
};
use serde_json::Value;
use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

fn database_url() -> Option<String> {
    std::env::var("SDKWORK_DATABASE_URL")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
}

async fn connect() -> Option<PgPool> {
    let url = database_url()?;
    let schema = std::env::var("SDKWORK_DATABASE_SCHEMA")
        .ok()
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty());
    let mut options = PgPoolOptions::new().max_connections(4);
    if let Some(schema) = schema {
        options = options.after_connect(move |connection, _meta| {
            let schema = schema.clone();
            Box::pin(async move {
                sqlx::query("SELECT set_config('search_path', $1, false)")
                    .bind(&schema)
                    .execute(&mut *connection)
                    .await?;
                Ok(())
            })
        });
    }
    let pool = options.connect(&url).await.ok()?;
    let migrated: bool = sqlx::query_scalar(
        "SELECT COUNT(*) > 0 FROM information_schema.columns \
         WHERE table_schema = current_schema() \
           AND table_name = 'iam_oauth_operator_platform' \
           AND column_name = 'ticket_create_time'",
    )
    .fetch_one(&pool)
    .await
    .ok()?;
    if !migrated {
        eprintln!("skipping: migration 0046 has not been applied");
        return None;
    }
    Some(pool)
}

struct SeededPlatform {
    id: String,
    component_appid: String,
    app_secret: String,
}

async fn seed_platform(pool: &PgPool) -> SeededPlatform {
    let suffix = uuid::Uuid::now_v7().simple().to_string();
    let id = format!("itgrantplatform{suffix}");
    let tenant_id = format!("itgranttenant{suffix}");
    let integration_id = format!("itgrantintegration{suffix}");
    let component_appid = format!("wxgrantit{suffix}");
    let app_secret = format!("grantsecret{suffix}");
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_operator_platform \
            (id, uuid, tenant_id, integration_id, provider_code, platform_code, display_name, \
             operator_mode, provider_platform_id, component_appid, platform_type, \
             authorization_status, webhook_verify_status, ticket_secret_status, \
             token_secret_status, status, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, 'wechat', $1, 'Grant IT platform', \
                 'platform_component', $5, $5, 'platform', 'pending_authorization', \
                 'unknown', 'missing', 'missing', 'active', $6, $6)",
    )
    .bind(&id)
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(&tenant_id)
    .bind(&integration_id)
    .bind(&component_appid)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed operator platform");
    seed_secret(pool, &id, &tenant_id, "component_app_secret", &app_secret).await;
    seed_secret(
        pool,
        &id,
        &tenant_id,
        "component_verify_ticket",
        "ticket-it",
    )
    .await;
    SeededPlatform {
        id,
        component_appid,
        app_secret,
    }
}

async fn seed_secret(pool: &PgPool, platform_id: &str, tenant_id: &str, kind: &str, value: &str) {
    let secret_ref = encode_signing_secret_ref(value.as_bytes());
    let secret_hash = hash_secret_ref(&secret_ref);
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO iam_oauth_secret \
            (id, uuid, tenant_id, secret_owner_kind, secret_owner_id, operator_platform_id, \
             secret_kind, secret_ref, secret_hash, active_from, status, created_at, updated_at) \
         VALUES ($1, $2, $3, 'operator_platform', $4, $4, $5, $6, $7, $8, 'active', $8, $8)",
    )
    .bind(format!("iamos-{}", uuid::Uuid::now_v7()))
    .bind(uuid::Uuid::now_v7().to_string())
    .bind(tenant_id)
    .bind(platform_id)
    .bind(kind)
    .bind(&secret_ref)
    .bind(&secret_hash)
    .bind(&now)
    .execute(pool)
    .await
    .expect("seed secret");
}

async fn cleanup(pool: &PgPool, platform: &SeededPlatform) {
    let _ =
        sqlx::query("DELETE FROM iam_oauth_resource_authorization WHERE operator_platform_id = $1")
            .bind(&platform.id)
            .execute(pool)
            .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_resource_account WHERE operator_platform_id = $1")
        .bind(&platform.id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_secret WHERE operator_platform_id = $1")
        .bind(&platform.id)
        .execute(pool)
        .await;
    let _ = sqlx::query("DELETE FROM iam_oauth_operator_platform WHERE id = $1")
        .bind(&platform.id)
        .execute(pool)
        .await;
    let key = component_token_cache_key(&platform.component_appid, &platform.app_secret);
    let _ = sqlx::query("DELETE FROM iam_ephemeral_artifact WHERE artifact_key = $1")
        .bind(key)
        .execute(pool)
        .await;
}

#[derive(Clone)]
struct QueueTransport {
    responses: Arc<Mutex<VecDeque<String>>>,
}

#[async_trait]
impl WechatComponentTransport for QueueTransport {
    async fn post_json(
        &self,
        _url: &str,
        _body: &Value,
    ) -> Result<String, WechatComponentApiError> {
        self.responses
            .lock()
            .expect("responses")
            .pop_front()
            .ok_or_else(|| WechatComponentApiError::Transport("no queued response".to_string()))
    }
}

fn query_auth_response(access_token: &str, refresh_token: Option<&str>) -> String {
    let refresh = refresh_token.unwrap_or("");
    format!(
        r#"{{"authorization_info":{{"authorizer_appid":"wxauthorizedit","authorizer_access_token":"{access_token}","expires_in":7200,"authorizer_refresh_token":"{refresh}","func_info":[{{"funcscope_category":{{"id":18}}}},{{"funcscope_category":{{"id":30}}}}]}}}}"#
    )
}

#[tokio::test]
#[ignore = "requires PostgreSQL with migration 0046 (SDKWORK_DATABASE_URL)"]
async fn stores_one_active_grant_and_updates_it_on_reauthorization() {
    let Some(pool) = connect().await else {
        return;
    };
    let platform = seed_platform(&pool).await;
    let transport = QueueTransport {
        responses: Arc::new(Mutex::new(VecDeque::from([
            r#"{"component_access_token":"component-token","expires_in":7200}"#.to_string(),
            query_auth_response("access-token-1", Some("refresh-token-1")),
            query_auth_response("access-token-2", Some("refresh-token-2")),
        ]))),
    };
    // The second exchange reuses the cached component token, so only the
    // query_auth response is consumed after the first token call.
    let token_api = WechatComponentApi::with_base_url(transport.clone(), "http://127.0.0.1:9");
    let api = WechatComponentApi::with_base_url(transport, "http://127.0.0.1:9");
    let tokens =
        WechatComponentTokenService::new(PgComponentTokenCache::new(pool.clone()), token_api);
    let reader = PgComponentPlatformConfigReader::new(pool.clone());
    let store = PgAuthorizerGrantStore::new(pool.clone());

    let first = complete_authorization(
        &reader,
        &tokens,
        &api,
        &store,
        &AuthorizationCompletionRequest {
            platform_id: &platform.id,
            authorization_code: "auth-code-1",
            resource_account_kind: ResourceAccountKind::MiniProgram.as_str(),
            display_name: Some("Test Mini Program"),
            now: now_epoch_seconds(),
        },
    )
    .await
    .expect("first authorization");
    assert!(first.refresh_token_present);
    assert_eq!(first.func_category_ids, vec![18, 30]);
    assert_eq!(first.authorizer_app_id, "wxauthorizedit");

    let second = complete_authorization(
        &reader,
        &tokens,
        &api,
        &store,
        &AuthorizationCompletionRequest {
            platform_id: &platform.id,
            authorization_code: "auth-code-2",
            resource_account_kind: ResourceAccountKind::MiniProgram.as_str(),
            display_name: None,
            now: now_epoch_seconds() + 60,
        },
    )
    .await
    .expect("second authorization");
    assert_eq!(second.resource_account_id, first.resource_account_id);
    assert_eq!(second.authorization_id, first.authorization_id);

    let access_mode: String =
        sqlx::query_scalar("SELECT access_mode FROM iam_oauth_resource_account WHERE id = $1")
            .bind(&first.resource_account_id)
            .fetch_one(&pool)
            .await
            .expect("read access mode");
    assert_eq!(access_mode, "operator_authorized_account");
    let active_rows: i64 = sqlx::query_scalar(
        "SELECT COUNT(*)::BIGINT FROM iam_oauth_resource_authorization \
         WHERE operator_platform_id = $1 AND resource_account_id = $2 AND status = 'active'",
    )
    .bind(&platform.id)
    .bind(&first.resource_account_id)
    .fetch_one(&pool)
    .await
    .expect("count active grants");
    assert_eq!(active_rows, 1);
    let refresh_ref: String = sqlx::query_scalar(
        "SELECT authorizer_refresh_token_secret_ref FROM iam_oauth_resource_authorization \
         WHERE id = $1",
    )
    .bind(&first.authorization_id)
    .fetch_one(&pool)
    .await
    .expect("read refresh ref");
    assert!(!refresh_ref.is_empty());
    assert!(!refresh_ref.contains("refresh-token-2"));
    let func_info: String = sqlx::query_scalar(
        "SELECT func_info_json FROM iam_oauth_resource_authorization WHERE id = $1",
    )
    .bind(&first.authorization_id)
    .fetch_one(&pool)
    .await
    .expect("read func info");
    assert!(func_info.contains("18") && func_info.contains("30"));

    cleanup(&pool, &platform).await;
}
