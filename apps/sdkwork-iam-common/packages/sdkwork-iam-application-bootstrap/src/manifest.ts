import { createHash } from "node:crypto";

import type {
  IamApplicationBootstrapEnvironment,
  IamApplicationBootstrapProvisionInput,
  IamInstallationOwnershipScope,
  IamInstallationProvisionCommand,
  IamApplicationType,
  SdkworkAppManifest,
} from "./types.ts";
import { IAM_INSTALLATION_OWNERSHIP_SCOPES, IAM_APPLICATION_TYPES } from "./types.ts";
import {
  DEFAULT_IAM_ORGANIZATION_ID,
  DEFAULT_IAM_TENANT_ID,
} from "./constants.ts";

export function hashManifestContent(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function trimToUndefined(value: string | undefined | null): string | undefined {
  const trimmed = `${value ?? ""}`.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function commandText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalize one release-scope declaration onto the installation vocabulary.
 *
 * The installation is the authority (`APPLICATION_IDENTITY_SPEC.md` §4.1): an
 * absent value is the `TENANT` default, and anything outside the three accepted
 * levels fails closed instead of being guessed.
 * @param value - declared scope, as the caller or a command body carries it
 * @returns the normalized level, `TENANT` when absent
 * @throws when the value is outside `TENANT | ORGANIZATION | USER`
 */
export function normalizeOwnershipScope(
  value: string | undefined | null,
): IamInstallationOwnershipScope {
  const normalized = trimToUndefined(value)?.toUpperCase();
  if (normalized === undefined) {
    return "TENANT";
  }
  const matched = IAM_INSTALLATION_OWNERSHIP_SCOPES.find((scope) => scope === normalized);
  if (matched === undefined) {
    throw new Error(
      `ownershipScope must be one of ${IAM_INSTALLATION_OWNERSHIP_SCOPES.join("|")} `
        + `(got ${JSON.stringify(value)})`,
    );
  }
  return matched;
}

/**
 * Refuse a release scope whose organization/owner pair contradicts the level.
 *
 * `TENANT` and `USER` releases live at organization `0`; `ORGANIZATION` needs a
 * real organization. `USER` also needs its owner, and the other levels must not
 * name one. The rule mirrors the IAM provisioning command's own validation, so
 * an incomplete pair never reaches the server.
 * @param scope - normalized release scope
 * @param organizationId - organization the installation is created under
 * @param ownerUserId - declared owner, when the caller supplied one
 * @throws when the pair cannot describe the declared level
 */
export function assertOwnershipScopePair(
  scope: IamInstallationOwnershipScope,
  organizationId: string,
  ownerUserId: string | undefined,
): void {
  const organization = organizationId.trim();
  if (scope === "ORGANIZATION" && organization === "0") {
    throw new Error("ownershipScope ORGANIZATION requires a non-zero organizationId");
  }
  if (scope !== "ORGANIZATION" && organization !== "0") {
    throw new Error(`ownershipScope ${scope} requires organizationId "0" (got ${JSON.stringify(organizationId)})`);
  }
  if (scope === "USER" && trimToUndefined(ownerUserId) === undefined) {
    throw new Error("ownershipScope USER requires ownerUserId");
  }
  if (scope !== "USER" && trimToUndefined(ownerUserId) !== undefined) {
    throw new Error(`ownershipScope ${scope} must not declare ownerUserId`);
  }
}

/**
 * Maps a manifest `app.appType` (PlusProjectType) onto the product-semantic
 * application type the provisioning API accepts.
 *
 * Mirrors the embedded Rust bootstrap so the CLI/Node and embedded surfaces
 * derive the same value from one manifest.
 * @param appType - manifest `app.appType` value
 * @returns the mapped type, `other` for an unrecognized non-empty value, or
 * `undefined` when the manifest declares no type at all
 */
export function mapManifestAppTypeToApplicationType(
  appType: string | undefined | null,
): IamApplicationType | undefined {
  const normalized = trimToUndefined(appType)?.toUpperCase();
  if (!normalized) {
    return undefined;
  }
  switch (normalized) {
    case "APP_HTML":
    case "APP_H5":
    case "H5":
      return "h5";
    case "APP_FLUTTER":
    case "FLUTTER":
      return "flutter";
    case "APP_REACT":
    case "APP_VUE":
    case "APP_PC":
    case "PC":
    case "WEB":
      return "pc";
    case "APP_UNIAPP":
    case "APP_MINIPROGRAM":
    case "APP_MINI_PROGRAM":
    case "MINIPROGRAM":
    case "MINI_PROGRAM":
      return "miniprogram";
    case "APP_IOS":
    case "APP_IOS_NATIVE":
    case "IOS":
      return "ios";
    case "APP_ANDROID":
    case "APP_ANDROID_NATIVE":
    case "ANDROID":
      return "android";
    case "APP_HARMONY":
    case "APP_HARMONYOS":
    case "HARMONYOS":
      return "harmonyos";
    case "APP_DESKTOP":
    case "DESKTOP":
    case "ELECTRON":
    case "TAURI":
      return "desktop";
    case "APP_API":
    case "API":
    case "SDK":
      return "api";
    default:
      return "other";
  }
}

/**
 * Resolves the product-semantic application type of a manifest.
 *
 * `app.appType` names a framework family, not an endpoint: `APP_REACT` is used
 * by both a PC web shell and a WeChat mini program, and `APP_UNIAPP` ships to
 * native Android/iOS/HarmonyOS as well as to mini programs. The runtime surface
 * (`runtime.defaultPlatform`, family, architectures and publish platforms) is
 * therefore authoritative; `appType` is only the fallback for a manifest that
 * declares no surface.
 * @param manifest - parsed `agent.app.config.json`
 * @returns the resolved tenant application type, or `undefined` when neither a
 * runtime surface nor an app type is present
 */
export function resolveManifestApplicationType(
  manifest: SdkworkAppManifest,
): IamApplicationType | undefined {
  const appType = trimToUndefined(manifest.app?.appType)?.toUpperCase();
  const runtime = manifest.runtime ?? {};
  const publish = manifest.publish ?? {};
  const family = trimToUndefined(runtime.family)?.toLowerCase() ?? "";
  const framework = trimToUndefined(runtime.framework)?.toLowerCase() ?? "";
  const architectures = [
    ...(runtime.clientArchitectures ?? []),
    runtime.defaultArchitecture,
  ]
    .map((value) => trimToUndefined(value)?.toLowerCase() ?? "")
    .filter((value) => value.length > 0);
  const platforms = [...(publish.platforms ?? []), ...(publish.installPlatforms ?? [])]
    .map((value) => trimToUndefined(value)?.toUpperCase() ?? "")
    .filter((value) => value.length > 0);
  const runtimeTargets = (manifest.artifacts?.installConfig?.packages ?? [])
    .map((entry) => (typeof entry.runtimeTarget === "string" ? entry.runtimeTarget.trim().toLowerCase() : ""))
    .filter((value) => value.length > 0);
  const hasArchitecture = (...names: string[]): boolean =>
    names.some((name) => architectures.includes(name));
  const hasPlatform = (...names: string[]): boolean =>
    names.some((name) => platforms.includes(name));
  const hasRuntimeTarget = (...names: string[]): boolean =>
    names.some((name) => runtimeTargets.includes(name));
  // `runtime.framework` is decisive; the architecture list only corroborates it
  // for a manifest that declares no framework. A multi-surface repository lists
  // every architecture it ships, so matching that list first classified web roots
  // as desktop/mini-program.
  const frameworkDecides = framework !== "";
  const byFrameworkOrArchitecture = (name: string): boolean =>
    framework === name || (!frameworkDecides && hasArchitecture(name));

  // `app.appType` is the fallback only: a manifest that declares a decisive
  // framework must be classified by it even when the framework family in
  // `app.appType` is stale (an `APP_HTML` root built with Flutter is Flutter, and
  // an `APP_FLUTTER` root that actually ships an H5 shell is H5).
  const flutter = byFrameworkOrArchitecture("flutter")
    || (!frameworkDecides && (appType === "APP_FLUTTER" || appType === "FLUTTER"));
  if (flutter) {
    // Flutter is one codebase delivered to several stores; the kind is the
    // multi-target build, not one of its platform targets.
    return "flutter";
  }
  if (
    framework === "harmony-native"
    || framework === "arkts"
    || (!frameworkDecides && hasArchitecture("harmony-native"))
  ) {
    return "harmonyos";
  }
  if (byFrameworkOrArchitecture("android-native")) {
    return "android";
  }
  if (byFrameworkOrArchitecture("ios-native")) {
    return "ios";
  }
  const miniProgramFramework = framework === "mp-weixin"
    || framework.startsWith("mp-")
    || /(^|-)mini-program$/u.test(framework);
  if (family === "mini-program" || miniProgramFramework) {
    return "miniprogram";
  }
  if (framework === "uni-app" || framework === "uni-app-x"
    || (!frameworkDecides && hasArchitecture("uniapp", "uniappx"))) {
    const platform = trimToUndefined(runtime.defaultPlatform)?.toUpperCase() ?? "";
    for (const candidate of [platform, ...platforms]) {
      switch (candidate) {
        case "APP_ANDROID":
        case "ANDROID":
          return "android";
        case "APP_IOS":
        case "IOS":
          return "ios";
        case "APP_HARMONY":
        case "HARMONYOS":
          return "harmonyos";
        case "MP_WEIXIN":
        case "MP_DOUYIN":
        case "MP":
          return "miniprogram";
        default:
          break;
      }
    }
    if (hasPlatform("H5", "H5_WEIXIN")) {
      return "h5";
    }
    if (hasPlatform("WEB")) {
      return "pc";
    }
  }
  if (framework === "static-html" || (!frameworkDecides && hasArchitecture("static-web"))) {
    return "pc";
  }
  const desktopHost = ["electron", "tauri", "react-tauri", "react-electron", "vue-tauri", "vue-electron"]
    .includes(framework)
    || (!frameworkDecides && hasArchitecture("tauri", "electron"));
  if (desktopHost) {
    // A desktop shell is a desktop app even though its renderer is web.
    return "desktop";
  }
  const h5OnlyDelivery = hasPlatform("H5", "H5_WEIXIN") && !hasPlatform("WEB");
  const h5Framework = framework === "react-h5"
    || framework === "react-capacitor"
    || framework === "vue-h5"
    || framework === "vue-capacitor";
  const h5Evidence = h5Framework
    || hasArchitecture("h5", "capacitor")
    || hasPlatform("H5", "H5_WEIXIN")
    || hasRuntimeTarget("h5", "capacitor-ios", "capacitor-android");
  if (
    h5Evidence
    && (family === "mobile" || family === "" || h5Framework || h5OnlyDelivery)
  ) {
    return "h5";
  }
  const browserTargeted = hasRuntimeTarget("browser", "web", "h5");
  const serverTargetedOnly = runtimeTargets.length > 0
    && runtimeTargets.every((target) => target === "server" || target === "container");
  if (family === "web") {
    // A server root that also advertises a web install platform is still the API
    // deployment (the IAM root manifest is the canonical example).
    if (serverTargetedOnly && !browserTargeted && framework.endsWith("-service")) {
      return "api";
    }
    return "pc";
  }
  if (family === "desktop") {
    return hasPlatform("WEB") || browserTargeted ? "pc" : "desktop";
  }
  if (family === "server" || family === "cli" || family === "library" || family === "plugin") {
    return "api";
  }
  if (family === "mobile") {
    return "h5";
  }
  // No family: the declared delivery platform is the only surface left.
  if (hasPlatform("MP_WEIXIN", "MP_DOUYIN", "MP")) {
    return "miniprogram";
  }
  if (hasPlatform("APP_ANDROID", "ANDROID")) {
    return "android";
  }
  if (hasPlatform("APP_IOS", "IOS")) {
    return "ios";
  }
  if (hasPlatform("APP_HARMONY", "HARMONYOS")) {
    return "harmonyos";
  }
  if (hasPlatform("DESKTOP", "DESKTOP_WINDOWS", "DESKTOP_MACOS", "DESKTOP_LINUX")) {
    return "desktop";
  }
  if (hasPlatform("API")) {
    return "api";
  }
  if (hasPlatform("H5", "H5_WEIXIN")) {
    return "h5";
  }
  if (hasPlatform("WEB")) {
    return "pc";
  }
  return mapManifestAppTypeToApplicationType(appType);
}

/**
 * Validate an explicit `applicationType` and normalize its casing.
 * @param value - caller-supplied application type
 * @returns the normalized application type
 * @throws when the value is blank or outside the accepted enum
 */
export function assertIamApplicationType(value: string | undefined | null): IamApplicationType {
  const normalized = trimToUndefined(value)?.toLowerCase();
  if (!normalized) {
    throw new Error(
      "applicationType is required to provision a tenant application "
        + `(expected one of ${IAM_APPLICATION_TYPES.join("|")})`,
    );
  }
  const matched = IAM_APPLICATION_TYPES.find((candidate) => candidate === normalized);
  if (!matched) {
    throw new Error(
      `applicationType "${normalized}" is not a valid tenant application type `
        + `(expected one of ${IAM_APPLICATION_TYPES.join("|")})`,
    );
  }
  return matched;
}

/**
 * Stable per-installation instance key, mirroring the embedded Rust bootstrap.
 *
 * `development`/`dev` collapse to `_dev` and `production`/`prod` to `_prod`;
 * any other lifecycle keeps its own normalized suffix.
 * @param runtimeAppId - deploy application (or runtime) identity
 * @param environment - selected lifecycle
 * @returns the derived instance key
 */
export function installationInstanceKey(runtimeAppId: string, environment: string): string {
  const normalized = `${runtimeAppId ?? ""}`.trim().replace(/-/gu, "_");
  const lifecycle = `${environment ?? ""}`.trim();
  if (lifecycle.toLowerCase() === "development" || lifecycle.toLowerCase() === "dev") {
    return `${normalized}_dev`;
  }
  if (lifecycle.toLowerCase() === "production" || lifecycle.toLowerCase() === "prod") {
    return `${normalized}_prod`;
  }
  return `${normalized}_${lifecycle ? lifecycle.replace(/-/gu, "_") : "default"}`;
}

/**
 * Deterministic provisioning idempotency key for one installation identity.
 *
 * Derived from the stable provisioning inputs only (never from the runtime
 * config), so re-running the same onboarding command replays the same key and
 * the API reconciles one installation instead of creating a second one.
 * @param command - provisioning command whose key must be derived
 * @returns a stable `iam-bootstrap-<digest>` key
 */
export function deriveProvisioningIdempotencyKey(
  command: Pick<
    IamInstallationProvisionCommand,
    "applicationType" | "deployApplicationId" | "environment" | "instanceKey" | "organizationId" | "tenantId"
  >,
): string {
  const identity = [
    command.tenantId,
    command.organizationId,
    command.deployApplicationId,
    command.applicationType,
    command.instanceKey,
    command.environment,
  ]
    .map((value) => `${value ?? ""}`.trim())
    .join("\n");
  const digest = createHash("sha256").update(identity).digest("hex").slice(0, 40);
  return `iam-bootstrap-${digest}`;
}

/**
 * Resolve the deploy application anchor of a manifest.
 *
 * The explicit input wins, then `backend.deployApplicationId`, then the
 * configured runtime identity `backend.appId`. It is never synthesized from
 * `app.key` and never generated: the deploy application is the installation
 * identity every access token carries.
 * @param manifest - application manifest
 * @param explicit - caller-supplied deploy application id
 * @returns the anchor, or `undefined` when the manifest and caller declare none
 */
export function resolveDeployApplicationId(
  manifest: SdkworkAppManifest,
  explicit?: string | null,
): string | undefined {
  return trimToUndefined(explicit)
    ?? trimToUndefined(manifest.backend?.deployApplicationId)
    ?? trimToUndefined(manifest.backend?.appId);
}

/**
 * Current release version declared by the manifest.
 * @param manifest - application manifest
 * @returns the version label, when present
 */
export function manifestReleaseVersion(manifest: SdkworkAppManifest): string | undefined {
  const notes = manifest.release?.notes ?? [];
  const current = notes.find((note) => note.current) ?? notes[0];
  return trimToUndefined(current?.version);
}

function manifestAccessPermissions(manifest: SdkworkAppManifest): string[] {
  const scope = manifest.backend?.accessTokenPermissionScope ?? manifest.backend?.permissionScope;
  return Array.isArray(scope) ? scope : [];
}

/**
 * Runtime config a manifest declares for its installation.
 *
 * Only `oauth.relyingParty` is carried, under the canonical
 * `runtimeConfig.oauth.relyingParty` shape. No template exists, so nothing is
 * inherited implicitly.
 * @param manifest - application manifest
 * @returns the runtime config document, or `undefined` when none is declared
 */
export function manifestRuntimeConfig(
  manifest: SdkworkAppManifest,
): Record<string, unknown> | undefined {
  const oauth = manifest.oauth;
  if (!oauth || typeof oauth !== "object" || Array.isArray(oauth)) {
    return undefined;
  }
  const declared = "relyingParty" in oauth ? oauth.relyingParty : oauth;
  if (!declared || typeof declared !== "object" || Array.isArray(declared)) {
    return undefined;
  }
  return { oauth: { relyingParty: declared as Record<string, unknown> } };
}

/**
 * Build the `tenantApplications.create` command from a manifest plus explicit
 * deploy-application inputs.
 *
 * Every field is either supplied by the caller or derived from the manifest; no
 * template reference exists anymore.
 * @param manifest - application manifest (`agent.app.config.json`)
 * @param environment - resolved bootstrap environment
 * @param provision - explicit deploy-application inputs, which win over manifest defaults
 * @returns a complete provisioning command
 * @throws when `deployApplicationId` or `applicationType` cannot be resolved
 */
export function manifestToProvisionCommand(
  manifest: SdkworkAppManifest,
  environment: IamApplicationBootstrapEnvironment,
  provision?: Partial<IamApplicationBootstrapProvisionInput>,
): IamInstallationProvisionCommand {
  const app = manifest.app ?? {};
  const backend = manifest.backend ?? {};

  const deployApplicationId = resolveDeployApplicationId(manifest, provision?.deployApplicationId);
  if (!deployApplicationId) {
    throw new Error(
      "deployApplicationId is required to provision a tenant application; set "
        + "backend.deployApplicationId or backend.appId in agent.app.config.json, "
        + "or pass provision.deployApplicationId",
    );
  }

  const applicationType = trimToUndefined(provision?.applicationType)
    ? assertIamApplicationType(provision?.applicationType)
    : resolveManifestApplicationType(manifest);
  if (!applicationType) {
    throw new Error(
      "applicationType is required to provision a tenant application; set app.appType "
        + "in agent.app.config.json or pass provision.applicationType "
        + `(one of ${IAM_APPLICATION_TYPES.join("|")})`,
    );
  }

  const lifecycle = trimToUndefined(provision?.environment)
    ?? trimToUndefined(environment.environment)
    ?? "dev";
  const tenantId = trimToUndefined(provision?.tenantId)
    ?? trimToUndefined(environment.tenantId)
    ?? trimToUndefined(backend.tenantId)
    ?? DEFAULT_IAM_TENANT_ID;
  const organizationId = trimToUndefined(provision?.organizationId)
    ?? trimToUndefined(environment.organizationId)
    ?? trimToUndefined(backend.organizationId)
    ?? DEFAULT_IAM_ORGANIZATION_ID;
  const ownershipScope = normalizeOwnershipScope(provision?.ownershipScope);
  const ownerUserId = trimToUndefined(provision?.ownerUserId);
  assertOwnershipScopePair(ownershipScope, organizationId, ownerUserId);
  const instanceKey = trimToUndefined(provision?.instanceKey)
    ?? trimToUndefined(environment.instanceKey)
    ?? installationInstanceKey(deployApplicationId, lifecycle);
  const displayName = trimToUndefined(provision?.displayName)
    ?? trimToUndefined(app.displayName)
    ?? trimToUndefined(app.name)
    ?? instanceKey;
  const accessPermissions = provision?.accessPermissions !== undefined
    ? provision.accessPermissions
    : manifestAccessPermissions(manifest);
  const runtimeConfig = provision?.runtimeConfig ?? manifestRuntimeConfig(manifest);
  const primaryDomain = trimToUndefined(provision?.primaryDomain)
    ?? trimToUndefined(environment.primaryDomain)
    ?? trimToUndefined(backend.primaryDomain)
    ?? trimToUndefined(backend.domain);

  const command: IamInstallationProvisionCommand = {
    applicationType,
    deployApplicationId,
    tenantId,
    organizationId,
    ownershipScope,
    ...(ownerUserId !== undefined ? { ownerUserId } : {}),
    instanceKey,
    displayName,
    environment: lifecycle,
    accessPermissions,
    provisioningIdempotencyKey: "",
    ...(runtimeConfig !== undefined ? { runtimeConfig } : {}),
    ...(primaryDomain !== undefined ? { primaryDomain } : {}),
  };
  command.provisioningIdempotencyKey = trimToUndefined(provision?.provisioningIdempotencyKey)
    ?? deriveProvisioningIdempotencyKey(command);
  return command;
}

/**
 * Validate a provisioning command before it reaches the API.
 *
 * Every failure names the offending field so onboarding stops on its own
 * inputs instead of on a server round-trip.
 * @param command - provisioning command (or raw command body) to validate
 * @throws when a required field is missing or malformed
 */
export function validateInstallationProvisionCommand(
  command: Record<string, unknown>,
): void {
  if (!commandText(command.deployApplicationId)) {
    throw new Error(
      "deployApplicationId is required to provision a tenant application",
    );
  }
  if (!commandText(command.applicationType)) {
    throw new Error("applicationType is required to provision a tenant application");
  }
  assertIamApplicationType(commandText(command.applicationType));
  if (!commandText(command.tenantId)) {
    throw new Error("tenantId is required to provision a tenant application");
  }
  if (!commandText(command.organizationId)) {
    throw new Error("organizationId is required to provision a tenant application");
  }
  if (!commandText(command.instanceKey)) {
    throw new Error("instanceKey is required to provision a tenant application");
  }
  if (!commandText(command.displayName)) {
    throw new Error("displayName is required to provision a tenant application");
  }
  if (!commandText(command.environment)) {
    throw new Error("environment is required to provision a tenant application");
  }
  if (!commandText(command.provisioningIdempotencyKey)) {
    throw new Error("provisioningIdempotencyKey is required to provision a tenant application");
  }
  assertOwnershipScopePair(
    normalizeOwnershipScope(commandText(command.ownershipScope) || undefined),
    commandText(command.organizationId),
    commandText(command.ownerUserId) || undefined,
  );
}

/**
 * Validate the manifest fields bootstrap depends on.
 * @param manifest - application manifest
 * @throws when an identity field or the default permission scope is missing
 */
export function validateManifestForBootstrap(manifest: SdkworkAppManifest): void {
  if (!trimToUndefined(manifest.app?.key)) {
    throw new Error("app.key must be configured in agent.app.config.json");
  }
  if (!trimToUndefined(manifest.app?.name)) {
    throw new Error("app.name must be configured in agent.app.config.json");
  }
  if (!trimToUndefined(manifest.app?.appType)) {
    throw new Error("app.appType must be configured in agent.app.config.json");
  }
  if (!trimToUndefined(resolveDeployApplicationId(manifest))) {
    throw new Error(
      "deployApplicationId must be configured in agent.app.config.json "
        + "(backend.deployApplicationId or backend.appId)",
    );
  }
  const permissions = manifestAccessPermissions(manifest);
  if (permissions.length === 0) {
    throw new Error("backend.accessTokenPermissionScope must be configured in agent.app.config.json");
  }
}

/**
 * Validate the resolved bootstrap environment.
 * @param environment - resolved bootstrap environment
 * @throws when the backend base URL or the lifecycle is missing
 */
export function validateBootstrapEnvironment(environment: IamApplicationBootstrapEnvironment): void {
  if (!trimToUndefined(environment.backendApiBaseUrl)) {
    throw new Error("backendApiBaseUrl is required for IAM application bootstrap");
  }
  if (!trimToUndefined(environment.primaryDomain)) {
    throw new Error("primaryDomain is required for tenant application bootstrap");
  }
  if (!trimToUndefined(environment.environment)) {
    throw new Error("environment is required for tenant application bootstrap");
  }
}
