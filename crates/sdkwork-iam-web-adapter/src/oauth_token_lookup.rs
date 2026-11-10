//! IAM OAuth bearer lookup for open-api (`Authorization: Bearer`).

use async_trait::async_trait;
use sdkwork_web_core::{
    OAuthBearerCredential, OAuthPrincipalRecord, OAuthTokenLookupService, WebFrameworkError,
};
use std::sync::Arc;

use crate::iam_session::resolve_iam_app_context_from_oauth_bearer;
use crate::resolver::iam_principal_record_from_context;
use sqlx::PgPool;

#[derive(Clone)]
pub struct IamOAuthTokenLookupService {
    pool: Arc<PgPool>,
    expected_environment: Option<String>,
}

impl IamOAuthTokenLookupService {
    pub fn new(pool: Arc<PgPool>) -> Self {
        Self {
            pool,
            expected_environment: configured_environment(),
        }
    }

    pub fn with_expected_environment(
        pool: Arc<PgPool>,
        expected_environment: impl Into<String>,
    ) -> Self {
        Self {
            pool,
            expected_environment: Some(expected_environment.into()),
        }
    }
}

fn configured_environment() -> Option<String> {
    [
        "SDKWORK_ENVIRONMENT",
        "SDKWORK_LIFECYCLE_ENVIRONMENT",
        "SDKWORK_IM_ENVIRONMENT",
    ]
    .iter()
    .find_map(|key| std::env::var(key).ok())
    .map(|value| value.trim().to_owned())
    .filter(|value| !value.is_empty())
}

fn canonical_environment(value: &str) -> String {
    let normalized = value.trim().to_ascii_lowercase();
    match normalized.as_str() {
        "development" | "local" => "dev".to_owned(),
        "production" => "prod".to_owned(),
        "testing" => "test".to_owned(),
        other => other.to_owned(),
    }
}

fn context_environment_label(
    environment: &sdkwork_iam_context_service::Environment,
) -> &'static str {
    match environment {
        sdkwork_iam_context_service::Environment::Dev => "dev",
        sdkwork_iam_context_service::Environment::Test => "test",
        sdkwork_iam_context_service::Environment::Prod => "prod",
    }
}

#[async_trait]
impl OAuthTokenLookupService for IamOAuthTokenLookupService {
    async fn lookup_oauth_token(
        &self,
        credential: &OAuthBearerCredential,
    ) -> Result<OAuthPrincipalRecord, WebFrameworkError> {
        let context =
            resolve_iam_app_context_from_oauth_bearer(self.pool.as_ref(), &credential.raw_token)
                .await
                .ok_or_else(|| {
                    WebFrameworkError::invalid_credentials(
                        "invalid or expired IAM OAuth bearer token",
                    )
                })?;
        if let Some(expected_environment) = self.expected_environment.as_deref() {
            let expected = canonical_environment(expected_environment);
            // Staging is collapsed to `prod` in the session context, so the raw
            // staging/prod distinction cannot be enforced from the record.
            if expected != "staging"
                && canonical_environment(context_environment_label(&context.environment))
                    != expected
            {
                return Err(WebFrameworkError::invalid_credentials(
                    "IAM OAuth bearer token is not valid for this environment",
                ));
            }
        }
        Ok(iam_principal_record_from_context(&context, credential))
    }
}
