import type { SdkworkDeploymentMode, SdkworkRuntimeEnvironment } from "@sdkwork/runtime-bootstrap";

/**
 * Product-semantic application types accepted by
 * `POST /backend/v3/api/iam/tenant_applications`.
 *
 * Application templates are retired, so nothing else can supply this value: a
 * provisioning command that omits it fails closed instead of inheriting one.
 */
export const IAM_TENANT_APPLICATION_TYPES = [
  "api",
  "h5",
  "pc",
  "flutter",
  "other",
] as const;

export type IamTenantApplicationType = (typeof IAM_TENANT_APPLICATION_TYPES)[number];

export interface IamApplicationBootstrapAuth {
  authToken?: string;
  username?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export interface IamApplicationBootstrapProfile {
  account?: string;
  email?: string;
  password?: string;
  username?: string;
}

export interface IamApplicationBootstrapEnvironment {
  backendApiBaseUrl: string;
  deploymentMode?: SdkworkDeploymentMode;
  environment: SdkworkRuntimeEnvironment | string;
  instanceKey?: string;
  organizationId?: string;
  primaryDomain?: string;
  tenantId?: string;
}

/**
 * Deploy-application onboarding input supplied by the caller.
 *
 * The flow provisions a tenant installation from the deploy application it
 * serves; it never registers an application template and never sends
 * `templateId` or `appKey`.
 */
export interface IamApplicationBootstrapProvisionInput {
  /** Access permissions granted to the installation; an empty array is a valid explicit choice. */
  accessPermissions?: string[] | null;
  /** Product-semantic application type; required by the provisioning API. */
  applicationType: IamTenantApplicationType;
  /** Deploy application this installation serves; the identity every access token carries. */
  deployApplicationId: string;
  displayName?: string;
  environment?: string;
  instanceKey?: string;
  organizationId?: string;
  /** Installation primary domain; optional. */
  primaryDomain?: string;
  /** Replay-safe provisioning key; derived deterministically when omitted. */
  provisioningIdempotencyKey?: string;
  /** Explicit runtime config, including `oauth.relyingParty`; absent registers none. */
  runtimeConfig?: Record<string, unknown>;
  tenantId?: string;
}

/**
 * Wire body of `POST /backend/v3/api/iam/tenant_applications`.
 *
 * Carries the bootstrap-body operator credentials in the same object, so an
 * index signature admits `authToken`/`username`/`email`/`phone`/`password`
 * without widening every field to `unknown`.
 */
export interface IamTenantApplicationProvisionCommand {
  [key: string]: unknown;
  accessPermissions?: string[] | null;
  applicationType: IamTenantApplicationType;
  deployApplicationId: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  primaryDomain?: string;
  provisioningIdempotencyKey: string;
  runtimeConfig?: Record<string, unknown>;
  tenantId: string;
}

export interface ProvisionedTenantApplicationResult {
  tenantApplicationId?: string;
  appId?: string;
  tenantId?: string;
  organizationId?: string;
  status?: string;
  applicationType?: string;
  deployApplicationId?: string;
  instanceKey?: string;
  primaryDomain?: string;
  [key: string]: unknown;
}

export interface EnabledTenantApplicationResult {
  tenantApplicationId?: string;
  appId?: string;
  status?: string;
  [key: string]: unknown;
}

export interface IssuedAccessCredentialResult {
  accessCredential?: string;
  accessToken?: string;
  authToken?: string;
  tenantId?: string;
  organizationId?: string;
  tenantApplicationId?: string;
  appId?: string;
  sessionId?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface IamApplicationBootstrapClient {
  createAccessCredential(body: Record<string, unknown>): Promise<IssuedAccessCredentialResult>;
  enableTenantApplication(
    tenantApplicationId: string,
    body?: Record<string, unknown>,
  ): Promise<EnabledTenantApplicationResult>;
  provisionTenantApplication(
    body: IamTenantApplicationProvisionCommand,
  ): Promise<ProvisionedTenantApplicationResult>;
  updateTenantApplication?(
    tenantApplicationId: string,
    body?: Record<string, unknown>,
  ): Promise<ProvisionedTenantApplicationResult>;
}

export interface SdkworkAppManifest {
  app?: {
    appType?: string;
    displayName?: string;
    identifiers?: {
      bundleId?: string;
      packageName?: string;
    };
    key?: string;
    name?: string;
  };
  artifacts?: {
    installConfig?: {
      packages?: Array<Record<string, unknown>>;
    };
  };
  backend?: {
    /**
     * Deploy application anchor of this installation.
     *
     * `APPLICATION_IDENTITY_SPEC.md` makes the deployed runtime identity the deploy
     * application, so a manifest that declares it here is authoritative. A manifest
     * that omits it keeps `backend.appId` as the anchor.
     */
    deployApplicationId?: string;
    /**
     * Configured runtime application identity.
     *
     * `agent.app.config.json` carries it (`"appId": "sdkwork-iam"`) and the
     * credential bundle persists it, so the bootstrap reads it to stamp the
     * token's owning application and as the deploy-application anchor fallback.
     */
    appId?: string;
    /** Backend service that serves this application; manifest metadata only. */
    serviceId?: string;
    /** Loopback bind address the dev runner uses; manifest metadata only. */
    defaultBind?: string;
    /** Operator profile the bootstrap authenticates as; manifest metadata only. */
    profileKey?: string;
    accessTokenPermissionScope?: string[];
    domain?: string;
    organizationId?: string;
    permissionScope?: string[];
    primaryDomain?: string;
    tenantId?: string;
  };
  /**
   * OAuth relying-party document declared by the application.
   *
   * Mirrors the embedded Rust bootstrap: `oauth.relyingParty` becomes
   * `runtimeConfig.oauth.relyingParty`, and a manifest that declares no relying
   * party registers none.
   */
  oauth?: Record<string, unknown>;
  publish?: Record<string, unknown>;
  release?: {
    notes?: Array<{
      channel?: string;
      current?: boolean;
      version?: string;
    }>;
  };
  runtime?: Record<string, unknown>;
  security?: Record<string, unknown>;
}

export interface ApplicationBootstrapFromManifestInput {
  auth: IamApplicationBootstrapAuth;
  client: IamApplicationBootstrapClient;
  environment: IamApplicationBootstrapEnvironment;
  manifest: SdkworkAppManifest;
  manifestHash?: string;
  /** Explicit deploy-application inputs; they win over the manifest defaults. */
  provision?: Partial<IamApplicationBootstrapProvisionInput>;
  /** Replay cache for provisioning idempotency keys (shared by a module instance). */
  provisioningCache?: IamApplicationBootstrapReplayCache;
}

export interface ApplicationBootstrapFromCommandInput {
  auth: IamApplicationBootstrapAuth;
  client: IamApplicationBootstrapClient;
  /** Complete deploy-application provisioning command (no manifest involved). */
  command: IamTenantApplicationProvisionCommand;
  /** Replay cache for provisioning idempotency keys (shared by a module instance). */
  provisioningCache?: IamApplicationBootstrapReplayCache;
  /** Optional version label reported in the bootstrap result. */
  version?: string;
}

export interface ApplicationBootstrapResult {
  accessCredential?: string;
  appId?: string;
  applicationType: IamTenantApplicationType;
  authToken?: string;
  deployApplicationId: string;
  enabled: EnabledTenantApplicationResult;
  env: Record<string, string>;
  issued: IssuedAccessCredentialResult;
  provisioningIdempotencyKey: string;
  provisioned: ProvisionedTenantApplicationResult;
  tenantApplicationId: string;
  version?: string;
}

export interface ApplicationBootstrapEnvWriterInput {
  env?: Record<string, string>;
  primaryDomain?: string;
  result: ApplicationBootstrapResult;
}

export interface CreateIamApplicationBootstrapInput {
  client: IamApplicationBootstrapClient;
  /**
   * Share a replay cache across module calls, or pass `null` to disable it.
   * Defaults to a per-module cache so a repeated call with the same
   * provisioning idempotency key returns the first outcome.
   */
  provisioningCache?: IamApplicationBootstrapReplayCache | null;
}

/**
 * Provisioning idempotency replay cache: idempotency key → pending or settled
 * bootstrap result. A rejected entry is evicted so a retry can run again.
 */
export type IamApplicationBootstrapReplayCache = Map<string, Promise<ApplicationBootstrapResult>>;

export interface IamApplicationBootstrapModule {
  bootstrapDeployApplication(input: ApplicationBootstrapFromCommandInput): Promise<ApplicationBootstrapResult>;
  bootstrapFromManifest(input: ApplicationBootstrapFromManifestInput): Promise<ApplicationBootstrapResult>;
  createAccessCredential(body: Record<string, unknown>): Promise<IssuedAccessCredentialResult>;
  enableTenantApplication(
    tenantApplicationId: string,
    body?: Record<string, unknown>,
  ): Promise<EnabledTenantApplicationResult>;
  name: "@sdkwork/iam-application-bootstrap";
  provisionTenantApplication(
    body: IamTenantApplicationProvisionCommand,
  ): Promise<ProvisionedTenantApplicationResult>;
  updateTenantApplication?(
    tenantApplicationId: string,
    body?: Record<string, unknown>,
  ): Promise<ProvisionedTenantApplicationResult>;
  version: "0.1.0";
}
