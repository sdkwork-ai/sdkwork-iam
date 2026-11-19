use axum::{
    http::{header, HeaderName, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use sdkwork_utils_rust::{SdkWorkApiResponse, SdkWorkProblemDetail, SdkWorkResultCode};
use sdkwork_web_core::new_request_id;
use serde_json::Value;

fn next_trace_id() -> String {
    new_request_id()
}

fn attach_trace_header(response: &mut Response, trace_id: &str) {
    if let Ok(value) = HeaderValue::from_str(trace_id) {
        response
            .headers_mut()
            .insert(HeaderName::from_static("x-sdkwork-trace-id"), value);
    }
}

pub fn iam_api_success(data: Value) -> Response {
    let trace_id = next_trace_id();
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (StatusCode::OK, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// `201 Created` with the SDKWork envelope (`API_SPEC.md` §15.4 create semantics).
///
/// Used by `create` operations that persist a new resource, for example the
/// application access credential session minted by `appAccessTokens.create`.
pub fn iam_api_created(data: Value) -> Response {
    let trace_id = next_trace_id();
    let envelope = SdkWorkApiResponse::success(data, trace_id.clone());
    let mut response = (StatusCode::CREATED, Json(envelope)).into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

/// Maps an HTTP status onto its platform result code (`API_SPEC.md` §15.3).
///
/// Every status a handler may deliberately return MUST have an arm here.
/// A missing arm silently collapses the response into `InternalError`, so an
/// upstream/provider failure (502) or a rejected payload (422) reaches the
/// client as an opaque `500 / 50001 / "An internal error occurred"` and the
/// real cause is lost. This mapping mirrors the canonical framework mapping in
/// `sdkwork_web_core::problem::result_code_from_status`.
fn result_code_from_status(status: StatusCode) -> SdkWorkResultCode {
    match status.as_u16() {
        400 => SdkWorkResultCode::ValidationError,
        401 => SdkWorkResultCode::AuthenticationRequired,
        402 => SdkWorkResultCode::InsufficientBalance,
        403 => SdkWorkResultCode::PermissionRequired,
        404 => SdkWorkResultCode::NotFound,
        405 => SdkWorkResultCode::MethodNotAllowed,
        408 => SdkWorkResultCode::RequestTimeout,
        409 => SdkWorkResultCode::Conflict,
        410 => SdkWorkResultCode::Gone,
        412 => SdkWorkResultCode::PreconditionFailed,
        413 => SdkWorkResultCode::PayloadTooLarge,
        415 => SdkWorkResultCode::UnsupportedMediaType,
        422 => SdkWorkResultCode::UnprocessableEntity,
        423 => SdkWorkResultCode::Locked,
        428 => SdkWorkResultCode::PreconditionRequired,
        429 => SdkWorkResultCode::RateLimitExceeded,
        500 => SdkWorkResultCode::InternalError,
        502 => SdkWorkResultCode::BadGateway,
        503 => SdkWorkResultCode::ServiceUnavailable,
        504 => SdkWorkResultCode::GatewayTimeout,
        _ => SdkWorkResultCode::InternalError,
    }
}

pub fn iam_wire_result_code(status: StatusCode, wire_code: &str) -> SdkWorkResultCode {
    match wire_code {
        "iam_session_required" | "iam_access_token_required" | "iam_runtime_app_id_required" => {
            SdkWorkResultCode::AuthenticationRequired
        }
        "iam_invalid_credentials" => SdkWorkResultCode::AuthenticationRequired,
        "iam_runtime_app_id_invalid"
        | "iam_invalid_password_reset_challenge"
        | "iam_refresh_token_invalid"
        | "iam_poll_secret_invalid"
        | "iam_current_password_invalid" => SdkWorkResultCode::InvalidToken,
        "iam_permission_forbidden" | "iam_login_credential_headers_forbidden" => {
            SdkWorkResultCode::PermissionRequired
        }
        "iam_tenant_access_denied" => SdkWorkResultCode::TenantAccessDenied,
        "iam_permission_catalog_forbidden" => SdkWorkResultCode::TenantAccessDenied,
        "iam_invalid_list_query" => SdkWorkResultCode::InvalidParameter,
        "iam_account_locked" => SdkWorkResultCode::Locked,
        "iam_password_policy_violation"
        | "iam_password_reused"
        | "iam_password_unchanged"
        | "iam_email_invalid"
        | "iam_phone_invalid"
        | "iam_unsupported_grant_type"
        | "iam_password_confirmation_mismatch"
        | "iam_registration_tenant_unavailable" => SdkWorkResultCode::ValidationError,
        "iam_password_confirmation_required"
        | "iam_login_account_required"
        | "iam_poll_secret_required"
        | "iam_invalid_login"
        | "iam_password_required" => SdkWorkResultCode::MissingRequiredField,
        "iam_refresh_token_required" => SdkWorkResultCode::AuthenticationRequired,
        "iam_oauth_login_disabled" => SdkWorkResultCode::PermissionRequired,
        "iam_oauth_unavailable" => SdkWorkResultCode::ServiceUnavailable,
        "iam_contact_already_bound" => SdkWorkResultCode::Conflict,
        "iam_contact_binding_unbind_disabled" => SdkWorkResultCode::PermissionRequired,
        "iam_contact_unbind_forbidden" => SdkWorkResultCode::ValidationError,
        "iam_current_password_required" => SdkWorkResultCode::MissingRequiredField,
        code if code.ends_with("_not_found") => SdkWorkResultCode::NotFound,
        code if code.contains("forbidden") => SdkWorkResultCode::PermissionRequired,
        code if code.contains("invalid") && !code.contains("token") => {
            SdkWorkResultCode::ValidationError
        }
        _ => result_code_from_status(status),
    }
}

pub fn iam_api_error(status: StatusCode, wire_code: &str, message: &str) -> Response {
    let trace_id = next_trace_id();
    let result_code = iam_wire_result_code(status, wire_code);
    let problem = SdkWorkProblemDetail::platform(result_code, message, trace_id.clone());
    let response_status =
        StatusCode::from_u16(problem.status).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);
    let mut response = (
        response_status,
        [(header::CONTENT_TYPE, "application/problem+json")],
        Json(problem),
    )
        .into_response();
    attach_trace_header(&mut response, &trace_id);
    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn provider_and_payload_statuses_keep_their_platform_code() {
        assert_eq!(
            SdkWorkResultCode::BadGateway,
            result_code_from_status(StatusCode::BAD_GATEWAY)
        );
        assert_eq!(
            SdkWorkResultCode::UnprocessableEntity,
            result_code_from_status(StatusCode::UNPROCESSABLE_ENTITY)
        );
        assert_eq!(
            SdkWorkResultCode::GatewayTimeout,
            result_code_from_status(StatusCode::GATEWAY_TIMEOUT)
        );
        assert_eq!(
            SdkWorkResultCode::PreconditionFailed,
            result_code_from_status(StatusCode::PRECONDITION_FAILED)
        );
    }

    /// Regression: a WeChat/provider rejection of the custom-menu import must
    /// surface as `502 / 50201`, never as an opaque `500 / 50001`
    /// (`GET /backend/v3/api/iam/oauth/resource_accounts/{id}/custom_menus`).
    #[test]
    fn provider_sync_failure_is_reported_as_bad_gateway() {
        let result_code =
            iam_wire_result_code(StatusCode::BAD_GATEWAY, "iam_oauth_custom_menu_sync_failed");
        assert_eq!(SdkWorkResultCode::BadGateway, result_code);
        assert_eq!(502, result_code.http_status_code());
        assert_eq!(50201, result_code.as_i32());
    }

    #[test]
    fn unknown_wire_code_still_uses_the_status_mapping() {
        assert_eq!(
            SdkWorkResultCode::Conflict,
            iam_wire_result_code(
                StatusCode::CONFLICT,
                "iam_oauth_custom_menu_sync_unavailable"
            )
        );
        assert_eq!(
            SdkWorkResultCode::ServiceUnavailable,
            iam_wire_result_code(StatusCode::SERVICE_UNAVAILABLE, "iam_oauth_unavailable")
        );
    }
}
