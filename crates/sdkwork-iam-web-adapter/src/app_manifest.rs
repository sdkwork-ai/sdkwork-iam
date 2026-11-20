//! Application manifest types and parsing for embedded IAM tenant application bootstrap.
//!
//! Maps `agent.app.config.json` to [`EnsureTenantApplicationCommand`] using the same
//! manifest fields as `@sdkwork/iam-application-bootstrap`, without raw SQL or per-app copies.

use std::collections::BTreeSet;
use std::path::Path;

use sdkwork_iam_bootstrap::{DEFAULT_IAM_ORGANIZATION_ID, DEFAULT_IAM_TENANT_ID};
use serde::Deserialize;
use serde_json::Value;

use crate::application_registry::{
    tenant_application_instance_key, EnsureTenantApplicationCommand,
};

const DEFAULT_OWNER_TENANT_ID: &str = "0";
const DEFAULT_PRIMARY_DOMAIN: &str = "localhost";
const DEFAULT_CHANNEL: &str = "stable";

/// Options for embedded application bootstrap.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct EmbeddedApplicationBootstrapOptions {
    pub environment: String,
    pub primary_domain_override: Option<String>,
    pub version_override: Option<String>,
}

/// Runtime binding for multi-surface applications (e.g. PC + H5 + Flutter).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EmbeddedApplicationRuntimeBinding {
    pub runtime_app_id: String,
    pub display_name: Option<String>,
    pub app_key_override: Option<String>,
    pub instance_key_override: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SdkworkAppManifest {
    pub app: ManifestAppSection,
    #[serde(default)]
    pub backend: ManifestBackendSection,
    #[serde(default)]
    pub runtime: ManifestRuntimeSection,
    #[serde(default)]
    pub publish: ManifestPublishSection,
    #[serde(default)]
    pub release: ManifestReleaseSection,
    /// OAuth relying-party registration declared by the application.
    ///
    /// Accepts either `{ "relyingParty": { ... } }` or the relying-party
    /// document itself. Applied by the embedded bootstrap only when the
    /// auto-registration policy allows it for the lifecycle.
    #[serde(default)]
    pub oauth: Option<Value>,
}

/// The manifest `runtime` block that names the concrete application surface.
///
/// `app.appType` is a framework family (`APP_REACT` covers both a PC web shell
/// and a WeChat mini program), so the runtime surface is the authoritative
/// signal for the IAM application type.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestRuntimeSection {
    #[serde(default)]
    pub family: Option<String>,
    #[serde(default)]
    pub framework: Option<String>,
    #[serde(default)]
    pub default_platform: Option<String>,
    #[serde(default)]
    pub default_architecture: Option<String>,
    #[serde(default)]
    pub runtimes: Vec<String>,
    #[serde(default)]
    pub target_platforms: Vec<String>,
    #[serde(default)]
    pub client_architectures: Vec<String>,
}

/// The manifest `publish` block; its platforms are a second surface signal for
/// manifests that omit the richer `runtime` block.
#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestPublishSection {
    #[serde(default)]
    pub platforms: Vec<String>,
    #[serde(default)]
    pub install_platforms: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestAppSection {
    pub key: String,
    pub name: String,
    #[serde(default)]
    pub display_name: Option<String>,
    #[serde(default)]
    pub app_type: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestBackendSection {
    #[serde(default)]
    pub app_id: Option<String>,
    /// Deploy application anchor of this installation.
    ///
    /// `APPLICATION_IDENTITY_SPEC.md` §2 makes the deployed runtime identity the
    /// deploy application, so a manifest that declares it here is authoritative.
    /// A manifest that omits it keeps its `backend.appId` as the anchor: that
    /// field is the configured runtime identity and is never a generated value.
    #[serde(default)]
    pub deploy_application_id: Option<String>,
    #[serde(default)]
    pub tenant_id: Option<String>,
    #[serde(default)]
    pub organization_id: Option<String>,
    #[serde(default)]
    pub primary_domain: Option<String>,
    #[serde(default)]
    pub domain: Option<String>,
    #[serde(default)]
    pub access_token_permission_scope: Option<Vec<String>>,
    #[serde(default)]
    pub permission_scope: Option<Vec<String>>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct ManifestReleaseSection {
    #[serde(default)]
    pub notes: Vec<ManifestReleaseNote>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestReleaseNote {
    #[serde(default)]
    pub current: bool,
    #[serde(default)]
    pub version: Option<String>,
    #[serde(default)]
    pub channel: Option<String>,
}

pub fn load_manifest_from_app_root(app_root: &Path) -> Result<SdkworkAppManifest, String> {
    let manifest_path = app_root.join("agent.app.config.json");
    load_manifest_from_path(&manifest_path)
}

pub fn load_manifest_from_path(manifest_path: &Path) -> Result<SdkworkAppManifest, String> {
    let raw = std::fs::read_to_string(manifest_path).map_err(|error| {
        format!(
            "read application manifest {} failed: {error}",
            manifest_path.display()
        )
    })?;
    serde_json::from_str(&raw).map_err(|error| {
        format!(
            "parse application manifest {} failed: {error}",
            manifest_path.display()
        )
    })
}

/// Resolves the product-semantic application type of a manifest.
///
/// `app.appType` names a framework family, not an endpoint: `APP_REACT` is used
/// by both a PC web shell and a WeChat mini program, and `APP_UNIAPP` ships to
/// native Android/iOS/HarmonyOS as well as to mini programs. The runtime
/// surface (`runtime.defaultPlatform`, family, architectures and publish
/// platforms) is therefore authoritative; `appType` is only the fallback for a
/// manifest that declares no surface.
#[must_use]
pub fn resolve_manifest_application_type(manifest: &SdkworkAppManifest) -> String {
    let app_type = manifest.app.app_type.as_deref().unwrap_or("").trim();
    if matches!(
        app_type.to_ascii_uppercase().as_str(),
        "APP_FLUTTER" | "FLUTTER"
    ) {
        // Flutter is one codebase delivered to several stores; the kind is the
        // multi-target build, not one of its platform targets.
        return "flutter".to_owned();
    }

    let runtime = &manifest.runtime;
    let mut signals: Vec<String> = Vec::new();
    for value in [
        runtime.family.as_deref(),
        runtime.framework.as_deref(),
        runtime.default_platform.as_deref(),
        runtime.default_architecture.as_deref(),
    ]
    .into_iter()
    .flatten()
    {
        push_surface_signal(&mut signals, value);
    }
    for value in runtime
        .runtimes
        .iter()
        .chain(runtime.target_platforms.iter())
        .chain(runtime.client_architectures.iter())
        .chain(manifest.publish.platforms.iter())
        .chain(manifest.publish.install_platforms.iter())
    {
        push_surface_signal(&mut signals, value);
    }
    let has = |needle: &str| {
        signals
            .iter()
            .any(|signal| signal == needle || signal.contains(needle))
    };

    // A desktop shell is a desktop app even though its renderer is web.
    if has("tauri") || has("electron") || has("desktop") {
        return "desktop".to_owned();
    }
    if has("mini-program") || has("miniprogram") || has("mp-weixin") || has("mp_weixin") {
        return "miniprogram".to_owned();
    }
    // The default platform is the concrete delivery target of a native app.
    let platform = runtime
        .default_platform
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_ascii_lowercase();
    match platform.as_str() {
        "app_ios" | "ios" | "iphone" | "ipad" => return "ios".to_owned(),
        "app_android" | "android" => return "android".to_owned(),
        "app_harmony" | "harmony" | "harmonyos" | "openharmony" => return "harmonyos".to_owned(),
        _ => {}
    }
    // A manifest that only advertises native publish platforms (no runtime
    // defaultPlatform) is still a native app, not the ambiguous `APP_UNIAPP`
    // framework family.
    let has_web_surface =
        has("h5") || has("web") || has("pc") || has("browser") || has("universal");
    if !has_web_surface {
        if has("android") {
            return "android".to_owned();
        }
        if has("ios") || has("iphone") || has("ipad") {
            return "ios".to_owned();
        }
        if has("harmony") || has("harmonyos") || has("openharmony") {
            return "harmonyos".to_owned();
        }
    }
    // A server/runtime service is an API application even when its manifest
    // also advertises a web install platform (the IAM root manifest does).
    if has("api") || has("server") || has("rust-axum") || has("rust-service") {
        return "api".to_owned();
    }
    if has("h5") {
        return "h5".to_owned();
    }
    if has("pc") || has("web") || has("browser") || has("universal") {
        return "pc".to_owned();
    }
    crate::application_registry::map_manifest_app_type_to_application_type(app_type)
}

fn push_surface_signal(signals: &mut Vec<String>, value: &str) {
    let normalized = value.trim().to_ascii_lowercase();
    if !normalized.is_empty() {
        signals.push(normalized);
    }
}

pub fn validate_manifest_for_embedded_bootstrap(
    manifest: &SdkworkAppManifest,
) -> Result<(), String> {
    if manifest.app.key.trim().is_empty() {
        return Err("app.key must be configured in agent.app.config.json".to_string());
    }
    if manifest.app.name.trim().is_empty() {
        return Err("app.name must be configured in agent.app.config.json".to_string());
    }
    let app_type = manifest
        .app
        .app_type
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_owned();
    if app_type.is_empty() {
        return Err("app.appType must be configured in agent.app.config.json".to_string());
    }
    let permissions = default_access_permissions(manifest);
    if permissions.is_empty() {
        return Err(
            "backend.accessTokenPermissionScope must be configured in agent.app.config.json"
                .to_string(),
        );
    }
    Ok(())
}

pub fn manifest_to_ensure_commands(
    manifest: &SdkworkAppManifest,
    options: &EmbeddedApplicationBootstrapOptions,
    primary_runtime: Option<&EmbeddedApplicationRuntimeBinding>,
    additional_runtimes: &[EmbeddedApplicationRuntimeBinding],
) -> Result<Vec<EnsureTenantApplicationCommand>, String> {
    validate_manifest_for_embedded_bootstrap(manifest)?;

    let has_explicit_runtime_bindings =
        primary_runtime.is_some() || !additional_runtimes.is_empty();
    let runtime_bindings = if has_explicit_runtime_bindings {
        normalize_runtime_bindings(primary_runtime, additional_runtimes)
    } else {
        resolve_manifest_runtime_app_bindings(manifest)
    };
    if runtime_bindings.is_empty() {
        return Ok(vec![manifest_to_ensure_command(manifest, options, None)?]);
    }

    runtime_bindings
        .into_iter()
        .map(|mut binding| {
            // Explicit runtime identities must remain stable when an app later adds surfaces.
            // They also need distinct templates because tenant applications are unique by
            // tenant, organization, and template.
            if has_explicit_runtime_bindings && binding.app_key_override.is_none() {
                binding.app_key_override = Some(binding.runtime_app_id.clone());
            }
            manifest_to_ensure_command(manifest, options, Some(&binding))
        })
        .collect()
}

fn normalize_runtime_bindings(
    primary_runtime: Option<&EmbeddedApplicationRuntimeBinding>,
    additional_runtimes: &[EmbeddedApplicationRuntimeBinding],
) -> Vec<EmbeddedApplicationRuntimeBinding> {
    let mut runtime_app_ids = BTreeSet::new();
    primary_runtime
        .into_iter()
        .chain(additional_runtimes.iter())
        .filter_map(|binding| {
            let runtime_app_id = binding.runtime_app_id.trim();
            if runtime_app_id.is_empty() || !runtime_app_ids.insert(runtime_app_id.to_owned()) {
                return None;
            }
            let mut normalized = binding.clone();
            normalized.runtime_app_id = runtime_app_id.to_owned();
            Some(normalized)
        })
        .collect()
}

pub fn manifest_to_ensure_command(
    manifest: &SdkworkAppManifest,
    options: &EmbeddedApplicationBootstrapOptions,
    binding: Option<&EmbeddedApplicationRuntimeBinding>,
) -> Result<EnsureTenantApplicationCommand, String> {
    validate_manifest_for_embedded_bootstrap(manifest)?;

    let app_key = binding
        .and_then(|value| value.app_key_override.as_deref())
        .unwrap_or(manifest.app.key.as_str())
        .trim()
        .to_owned();
    let runtime_app_id = binding
        .map(|value| value.runtime_app_id.as_str())
        .or_else(|| backend_runtime_app_id(manifest))
        .unwrap_or(app_key.as_str())
        .trim()
        .to_owned();
    if runtime_app_id.is_empty() {
        return Err("runtime appId must be resolved from manifest or runtime binding".to_string());
    }
    // The deploy anchor comes from configuration: an explicit
    // `backend.deployApplicationId`, else the manifest's configured runtime
    // identity (`backend.appId`, or `app.key` when the manifest declares no
    // runtime id). It is never generated, and there is no fallback to a
    // synthesized IAM app id.
    //
    // An explicit additional runtime binding is a *surface* of the same
    // deployment (PC/H5/mobile of one product), not a second installation, so it
    // does not claim the anchor: `uk_iam_application_installation_deploy` makes the
    // anchor one-to-one and a surface must not compete for it.
    let is_installation_identity = binding
        .map(|value| backend_runtime_app_id(manifest) == Some(value.runtime_app_id.trim()))
        .unwrap_or(true);
    let deploy_application_id = if is_installation_identity {
        let anchor = manifest
            .backend
            .deploy_application_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(runtime_app_id.as_str());
        Some(anchor.to_owned())
    } else {
        None
    };

    let display_name = binding
        .and_then(|value| value.display_name.as_deref())
        .or(manifest.app.display_name.as_deref())
        .unwrap_or(manifest.app.name.as_str())
        .trim()
        .to_owned();
    let app_type = resolve_manifest_application_type(manifest);
    let (version, channel) = manifest_release_identity(manifest, options);
    let environment = normalize_bootstrap_environment(&options.environment);
    let instance_key = binding
        .and_then(|value| value.instance_key_override.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| tenant_application_instance_key(&runtime_app_id, &options.environment));
    let primary_domain = options
        .primary_domain_override
        .as_deref()
        .or(manifest.backend.primary_domain.as_deref())
        .or(manifest.backend.domain.as_deref())
        .unwrap_or(DEFAULT_PRIMARY_DOMAIN)
        .trim()
        .to_owned();

    Ok(EnsureTenantApplicationCommand {
        owner_tenant_id: DEFAULT_OWNER_TENANT_ID.to_owned(),
        app_key,
        name: manifest.app.name.trim().to_owned(),
        display_name,
        app_type,
        version,
        channel,
        default_access_permissions: default_access_permissions(manifest),
        tenant_id: manifest
            .backend
            .tenant_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(DEFAULT_IAM_TENANT_ID)
            .to_owned(),
        organization_id: manifest
            .backend
            .organization_id
            .as_deref()
            .map(str::trim)
            .filter(|value| !value.is_empty())
            .unwrap_or(DEFAULT_IAM_ORGANIZATION_ID)
            .to_owned(),
        instance_key,
        environment,
        primary_domain,
        runtime_app_id,
        deploy_application_id,
        oauth_relying_party: manifest_oauth_relying_party(manifest),
    })
}

/// Extracts the relying-party document a manifest declares, if any.
///
/// `oauth.relyingParty` is the canonical shape; a manifest that writes the
/// relying party directly under `oauth` is accepted as long as it carries the
/// identifying `redirectUris` field, so one obvious typo does not silently
/// leave the application unregistered.
fn manifest_oauth_relying_party(manifest: &SdkworkAppManifest) -> Option<Value> {
    let oauth = manifest.oauth.as_ref()?;
    if let Some(relying_party) = oauth.get("relyingParty") {
        return relying_party.is_object().then(|| relying_party.clone());
    }
    oauth.is_object().then(|| oauth.clone())
}

fn backend_runtime_app_id(manifest: &SdkworkAppManifest) -> Option<&str> {
    manifest
        .backend
        .app_id
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

pub fn resolve_manifest_runtime_app_bindings(
    manifest: &SdkworkAppManifest,
) -> Vec<EmbeddedApplicationRuntimeBinding> {
    backend_runtime_app_id(manifest)
        .map(|runtime_app_id| EmbeddedApplicationRuntimeBinding {
            runtime_app_id: runtime_app_id.to_owned(),
            display_name: None,
            app_key_override: None,
            instance_key_override: None,
        })
        .into_iter()
        .collect()
}

pub fn manifest_runtime_bindings(
    manifest: &SdkworkAppManifest,
) -> Vec<EmbeddedApplicationRuntimeBinding> {
    resolve_manifest_runtime_app_bindings(manifest)
}

fn default_access_permissions(manifest: &SdkworkAppManifest) -> Vec<String> {
    manifest
        .backend
        .access_token_permission_scope
        .clone()
        .or_else(|| manifest.backend.permission_scope.clone())
        .unwrap_or_default()
        .into_iter()
        .map(|permission| permission.trim().to_owned())
        .filter(|permission| !permission.is_empty())
        .collect()
}

fn manifest_release_identity(
    manifest: &SdkworkAppManifest,
    options: &EmbeddedApplicationBootstrapOptions,
) -> (String, String) {
    if let Some(version) = options.version_override.as_deref().map(str::trim) {
        if !version.is_empty() {
            return (version.to_owned(), DEFAULT_CHANNEL.to_owned());
        }
    }

    let note = manifest
        .release
        .notes
        .iter()
        .find(|note| note.current)
        .or_else(|| manifest.release.notes.first());

    let version = note
        .and_then(|value| value.version.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or("0.0.0")
        .to_owned();
    let channel = note
        .and_then(|value| value.channel.as_deref())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(DEFAULT_CHANNEL)
        .to_owned();
    (version, channel)
}

pub fn normalize_bootstrap_environment(environment: &str) -> String {
    if environment.eq_ignore_ascii_case("development") || environment.eq_ignore_ascii_case("dev") {
        "dev".to_owned()
    } else if environment.eq_ignore_ascii_case("production")
        || environment.eq_ignore_ascii_case("prod")
    {
        "prod".to_owned()
    } else {
        environment.trim().to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn surface_manifest(
        app_type: &str,
        runtime: ManifestRuntimeSection,
        publish: ManifestPublishSection,
    ) -> SdkworkAppManifest {
        SdkworkAppManifest {
            app: ManifestAppSection {
                key: "surface-app".to_owned(),
                name: "Surface app".to_owned(),
                display_name: None,
                app_type: Some(app_type.to_owned()),
            },
            backend: ManifestBackendSection {
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime,
            publish,
            release: ManifestReleaseSection::default(),
            oauth: None,
        }
    }

    /// `appType` names a framework family, so the runtime surface must decide
    /// the IAM application type: a React mini program is not a PC web app.
    #[test]
    fn runtime_surface_wins_over_the_framework_app_type() {
        let mini = surface_manifest(
            "APP_REACT",
            ManifestRuntimeSection {
                default_platform: Some("MP_WEIXIN".to_owned()),
                family: Some("mini-program".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&mini), "miniprogram");

        let h5 = surface_manifest(
            "APP_REACT",
            ManifestRuntimeSection {
                default_architecture: Some("h5".to_owned()),
                default_platform: Some("H5".to_owned()),
                family: Some("mobile".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&h5), "h5");

        let pc = surface_manifest(
            "APP_REACT",
            ManifestRuntimeSection {
                default_architecture: Some("universal".to_owned()),
                default_platform: Some("WEB".to_owned()),
                family: Some("web".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&pc), "pc");

        let desktop = surface_manifest(
            "APP_HTML",
            ManifestRuntimeSection {
                default_platform: Some("WEB".to_owned()),
                family: Some("desktop".to_owned()),
                framework: Some("tauri".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&desktop), "desktop");

        let android = surface_manifest(
            "APP_UNIAPP",
            ManifestRuntimeSection {
                default_platform: Some("APP_ANDROID".to_owned()),
                family: Some("mobile".to_owned()),
                framework: Some("uni-app-x".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&android), "android");

        let flutter = surface_manifest(
            "APP_FLUTTER",
            ManifestRuntimeSection {
                default_platform: Some("APP_ANDROID".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&flutter), "flutter");

        let server = surface_manifest(
            "APP_HTML",
            ManifestRuntimeSection {
                family: Some("server".to_owned()),
                framework: Some("rust-axum".to_owned()),
                ..ManifestRuntimeSection::default()
            },
            ManifestPublishSection {
                // The IAM root manifest advertises a WEB install platform even
                // though the app itself is the API service.
                install_platforms: vec!["WEB".to_owned()],
                platforms: vec!["WEB".to_owned()],
            },
        );
        assert_eq!(resolve_manifest_application_type(&server), "api");

        // No surface at all: the framework fallback still applies.
        let fallback = surface_manifest(
            "APP_REACT",
            ManifestRuntimeSection::default(),
            ManifestPublishSection::default(),
        );
        assert_eq!(resolve_manifest_application_type(&fallback), "pc");
    }

    /// The publish block is a second signal for manifests without `runtime`.
    #[test]
    fn publish_platforms_resolve_a_missing_runtime_surface() {
        let mini = surface_manifest(
            "APP_UNIAPP",
            ManifestRuntimeSection::default(),
            ManifestPublishSection {
                install_platforms: vec!["MP_WEIXIN".to_owned()],
                platforms: vec!["MP_WEIXIN".to_owned()],
            },
        );
        assert_eq!(resolve_manifest_application_type(&mini), "miniprogram");

        let native = surface_manifest(
            "APP_UNIAPP",
            ManifestRuntimeSection::default(),
            ManifestPublishSection {
                install_platforms: vec!["APP_ANDROID".to_owned(), "APP_IOS".to_owned()],
                platforms: vec!["APP_ANDROID".to_owned(), "APP_IOS".to_owned()],
            },
        );
        assert_eq!(resolve_manifest_application_type(&native), "android");
    }

    #[test]
    fn manifest_maps_the_oauth_relying_party_registration() {
        let manifest: SdkworkAppManifest = serde_json::from_value(json!({
            "app": {
                "key": "sdkwork-birdcoder",
                "name": "SDKWork Birdcoder",
                "appType": "APP_REACT"
            },
            "backend": {
                "appId": "sdkwork-birdcoder",
                "tenantId": "100001",
                "accessTokenPermissionScope": ["iam.users.read"]
            },
            "oauth": {
                "relyingParty": {
                    "enabled": true,
                    "clientId": "birdcoder",
                    "redirectUris": ["birdcoder://auth/callback"],
                    "allowedScopes": ["openid", "profile", "offline_access"],
                    "confidential": false
                }
            }
        }))
        .expect("parse manifest");

        let command = manifest_to_ensure_command(
            &manifest,
            &EmbeddedApplicationBootstrapOptions {
                environment: "development".to_owned(),
                ..EmbeddedApplicationBootstrapOptions::default()
            },
            None,
        )
        .expect("command");

        assert_eq!(command.runtime_app_id, "sdkwork-birdcoder");
        let relying_party = command
            .oauth_relying_party
            .expect("manifest oauth registration");
        assert_eq!(relying_party["clientId"], json!("birdcoder"));
        assert_eq!(
            relying_party["redirectUris"],
            json!(["birdcoder://auth/callback"])
        );
    }

    #[test]
    fn manifest_without_oauth_maps_no_registration() {
        let manifest: SdkworkAppManifest = serde_json::from_value(json!({
            "app": { "key": "sdkwork-forum", "name": "SDKWork Forum", "appType": "APP_HTML" },
            "backend": { "accessTokenPermissionScope": ["iam.self"] }
        }))
        .expect("parse manifest");
        let command = manifest_to_ensure_command(
            &manifest,
            &EmbeddedApplicationBootstrapOptions::default(),
            None,
        )
        .expect("command");
        assert!(command.oauth_relying_party.is_none());
    }

    #[test]
    fn manifest_mapping_uses_runtime_app_id_for_instance_key() {
        let manifest = SdkworkAppManifest {
            app: ManifestAppSection {
                key: "chat".to_owned(),
                name: "chat".to_owned(),
                display_name: Some("Sdkwork IM".to_owned()),
                app_type: Some("APP_HTML".to_owned()),
            },
            backend: ManifestBackendSection {
                tenant_id: Some("100001".to_owned()),
                organization_id: Some("0".to_owned()),
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime: ManifestRuntimeSection::default(),
            publish: ManifestPublishSection::default(),
            release: ManifestReleaseSection::default(),
            oauth: None,
        };
        let command = manifest_to_ensure_command(
            &manifest,
            &EmbeddedApplicationBootstrapOptions {
                environment: "development".to_owned(),
                ..EmbeddedApplicationBootstrapOptions::default()
            },
            Some(&EmbeddedApplicationRuntimeBinding {
                runtime_app_id: "sdkwork-im-pc".to_owned(),
                display_name: None,
                app_key_override: None,
                instance_key_override: None,
            }),
        )
        .expect("command");

        assert_eq!("chat", command.app_key);
        assert_eq!("sdkwork-im-pc", command.runtime_app_id);
        assert_eq!("sdkwork_im_pc_dev", command.instance_key);
    }

    #[test]
    fn manifest_mapping_defaults_runtime_app_id_to_app_key() {
        let manifest = SdkworkAppManifest {
            app: ManifestAppSection {
                key: "sdkwork-cloudrouter".to_owned(),
                name: "SDKWork Cloud Router".to_owned(),
                display_name: None,
                app_type: Some("APP_HTML".to_owned()),
            },
            backend: ManifestBackendSection {
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime: ManifestRuntimeSection::default(),
            publish: ManifestPublishSection::default(),
            release: ManifestReleaseSection::default(),
            oauth: None,
        };
        let command = manifest_to_ensure_command(
            &manifest,
            &EmbeddedApplicationBootstrapOptions {
                environment: "production".to_owned(),
                ..EmbeddedApplicationBootstrapOptions::default()
            },
            None,
        )
        .expect("command");

        assert_eq!("sdkwork-cloudrouter", command.runtime_app_id);
        assert_eq!("sdkwork_cloudrouter_prod", command.instance_key);
        // The configured runtime identity is the installation's deploy anchor;
        // no generated IAM id is invented for a manifest that declares no
        // separate `backend.deployApplicationId`.
        assert_eq!(
            command.deploy_application_id.as_deref(),
            Some("sdkwork-cloudrouter")
        );
    }

    #[test]
    fn manifest_runtime_bindings_use_backend_app_id_without_guessing_surface_ids() {
        let manifest = SdkworkAppManifest {
            app: ManifestAppSection {
                key: "sdkwork-example".to_owned(),
                name: "SDKWork Example".to_owned(),
                display_name: None,
                app_type: Some("APP_REACT".to_owned()),
            },
            backend: ManifestBackendSection {
                app_id: Some("sdkwork-example".to_owned()),
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime: ManifestRuntimeSection::default(),
            publish: ManifestPublishSection::default(),
            release: ManifestReleaseSection::default(),
            oauth: None,
        };

        let app_ids = resolve_manifest_runtime_app_bindings(&manifest)
            .into_iter()
            .map(|binding| binding.runtime_app_id)
            .collect::<Vec<_>>();

        assert_eq!(app_ids, vec!["sdkwork-example".to_owned()]);
    }

    #[test]
    fn multi_surface_commands_use_distinct_template_keys() {
        let manifest = SdkworkAppManifest {
            app: ManifestAppSection {
                key: "chat".to_owned(),
                name: "SDKWork IM".to_owned(),
                display_name: None,
                app_type: Some("APP_REACT".to_owned()),
            },
            backend: ManifestBackendSection {
                app_id: Some("sdkwork-im-pc".to_owned()),
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime: ManifestRuntimeSection::default(),
            publish: ManifestPublishSection::default(),
            release: ManifestReleaseSection::default(),
            oauth: None,
        };
        let primary = EmbeddedApplicationRuntimeBinding {
            runtime_app_id: "sdkwork-im-pc".to_owned(),
            display_name: None,
            app_key_override: None,
            instance_key_override: None,
        };
        let additional = [
            EmbeddedApplicationRuntimeBinding {
                runtime_app_id: "sdkwork-im-h5".to_owned(),
                display_name: None,
                app_key_override: None,
                instance_key_override: None,
            },
            EmbeddedApplicationRuntimeBinding {
                runtime_app_id: "sdkwork-im-flutter-mobile".to_owned(),
                display_name: None,
                app_key_override: None,
                instance_key_override: None,
            },
        ];

        let commands = manifest_to_ensure_commands(
            &manifest,
            &EmbeddedApplicationBootstrapOptions {
                environment: "development".to_owned(),
                ..EmbeddedApplicationBootstrapOptions::default()
            },
            Some(&primary),
            &additional,
        )
        .expect("commands");
        let identities = commands
            .into_iter()
            .map(|command| (command.app_key, command.runtime_app_id))
            .collect::<Vec<_>>();

        assert_eq!(
            identities,
            vec![
                ("sdkwork-im-pc".to_owned(), "sdkwork-im-pc".to_owned()),
                ("sdkwork-im-h5".to_owned(), "sdkwork-im-h5".to_owned()),
                (
                    "sdkwork-im-flutter-mobile".to_owned(),
                    "sdkwork-im-flutter-mobile".to_owned(),
                ),
            ]
        );
    }

    #[test]
    fn explicit_runtime_binding_uses_a_stable_template_key_before_more_surfaces_are_added() {
        let manifest = SdkworkAppManifest {
            app: ManifestAppSection {
                key: "chat".to_owned(),
                name: "SDKWork IM".to_owned(),
                display_name: None,
                app_type: Some("APP_REACT".to_owned()),
            },
            backend: ManifestBackendSection {
                access_token_permission_scope: Some(vec!["iam.self".to_owned()]),
                ..ManifestBackendSection::default()
            },
            runtime: ManifestRuntimeSection::default(),
            publish: ManifestPublishSection::default(),
            release: ManifestReleaseSection::default(),
            oauth: None,
        };
        let primary = EmbeddedApplicationRuntimeBinding {
            runtime_app_id: "sdkwork-im-pc".to_owned(),
            display_name: None,
            app_key_override: None,
            instance_key_override: None,
        };

        let commands = manifest_to_ensure_commands(
            &manifest,
            &EmbeddedApplicationBootstrapOptions {
                environment: "development".to_owned(),
                ..EmbeddedApplicationBootstrapOptions::default()
            },
            Some(&primary),
            &[],
        )
        .expect("command");

        assert_eq!(commands.len(), 1);
        assert_eq!(commands[0].app_key, "sdkwork-im-pc");
        assert_eq!(commands[0].runtime_app_id, "sdkwork-im-pc");
    }
}
