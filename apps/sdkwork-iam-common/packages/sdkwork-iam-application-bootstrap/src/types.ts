import type { SdkworkDeploymentMode, SdkworkRuntimeEnvironment } from "@sdkwork/runtime-bootstrap";

/**
 * Product-semantic application types accepted by
 * `POST /backend/v3/api/iam/tenant_applications`.
 *
 * The value names the endpoint the installation serves, not the rendering
 * technology. Application templates are retired, so nothing else can supply
 * this value: a provisioning command that omits it fails closed instead of
 * inheriting one.
 */
export const IAM_APPLICATION_TYPES = [
  "api",
  "h5",
  "pc",
  "flutter",
  "miniprogram",
  "ios",
  "android",
  "harmonyos",
  "desktop",
  "other",
] as const;

export type IamApplicationType = (typeof IAM_APPLICATION_TYPES)[number];

/**
 * Release scope of one installation (`APPLICATION_IDENTITY_SPEC.md` §4.1).
 *
 * The installation is the authority: the level is chosen at publication time,
 * stored on the row, and immutable afterwards. It decides the access token's
 * `ownership_scope` claim and the data-plane isolation key, so a bootstrap that
 * omits it creates a `TENANT` installation and cannot widen it later.
 */
export const IAM_INSTALLATION_OWNERSHIP_SCOPES = [
  "TENANT",
  "ORGANIZATION",
  "USER",
] as const;

export type IamInstallationOwnershipScope =
  (typeof IAM_INSTALLATION_OWNERSHIP_SCOPES)[number];

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
  applicationType: IamApplicationType;
  /** Deploy application this installation serves; the identity every access token carries. */
  deployApplicationId: string;
  displayName?: string;
  environment?: string;
  instanceKey?: string;
  organizationId?: string;
  /** Installation primary domain; optional. */
  primaryDomain?: string;
  /** Release scope of the installation; defaults to `TENANT` and is immutable afterwards. */
  ownershipScope?: IamInstallationOwnershipScope;
  /** Owner of a `USER` installation; required for `USER` and absent otherwise. */
  ownerUserId?: string;
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
export interface IamInstallationProvisionCommand {
  [key: string]: unknown;
  accessPermissions?: string[] | null;
  applicationType: IamApplicationType;
  deployApplicationId: string;
  displayName: string;
  environment: string;
  instanceKey: string;
  organizationId: string;
  ownershipScope?: IamInstallationOwnershipScope;
  ownerUserId?: string;
  primaryDomain?: string;
  provisioningIdempotencyKey: string;
  runtimeConfig?: Record<string, unknown>;
  tenantId: string;
}

export interface ProvisionedInstallationResult {
  installationId?: string;
  appId?: string;
  tenantId?: string;
  organizationId?: string;
  status?: string;
  applicationType?: string;
  deployApplicationId?: string;
  ownershipScope?: string;
  ownerUserId?: string | null;
  instanceKey?: string;
  displayName?: string;
  environment?: string;
  accessPermissions?: string[] | null;
  oauthRelyingParty?: Record<string, unknown> | null;
  primaryDomain?: string;
  [key: string]: unknown;
}

export interface EnabledInstallationResult {
  installationId?: string;
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
  installationId?: string;
  appId?: string;
  sessionId?: string;
  expiresAt?: string;
  [key: string]: unknown;
}

export interface IamApplicationBootstrapClient {
  createAccessCredential(body: Record<string, unknown>): Promise<IssuedAccessCredentialResult>;
  enableInstallation(
    installationId: string,
    body?: Record<string, unknown>,
  ): Promise<EnabledInstallationResult>;
  provisionInstallation(
    body: IamInstallationProvisionCommand,
  ): Promise<ProvisionedInstallationResult>;
  updateInstallation?(
    installationId: string,
    body?: Record<string, unknown>,
  ): Promise<ProvisionedInstallationResult>;
  /**
   * Repairs one installation through the readiness-driven reconcile operation.
   *
   * The request is a `bootstrap_body` route: the credential travels in the body
   * (`authToken`, or `username`/`password`), never in a header. `dryRun: true`
   * returns the same plan without writing, and the response carries the
   * readiness document before and after the repair.
   */
  reconcileInstallation?(
    installationId: string,
    body: Record<string, unknown>,
  ): Promise<IamInstallationReconcileResult>;
  /**
   * Reads one installation's readiness document.
   *
   * Optional because it is a dual-token read (`Authorization` +
   * `Access-Token`), which only an adapter carrying a session can call; the
   * bootstrap CLI reads the same document from a reconcile response instead.
   */
  retrieveInstallationReadiness?(installationId: string): Promise<IamInstallationReadiness>;
}

/** One defect the installation readiness assessment reports. */
export interface IamInstallationDefect {
  /** Stable machine-readable code, e.g. `deploy_application_unbound`. */
  code: string;
  /** Installation field (or runtime-config pointer) the defect sits on. */
  field: string;
  /** Human sentence explaining the defect. */
  message: string;
  /** Planes the defect blocks (`issuance`, `login`, `enable`). */
  blocks: string[];
  /** Whether `iam.installations.reconcile` writes this defect. */
  autoRepairable: boolean;
  /** Whether the repair request must carry the field's value. */
  requiresInput: boolean;
  /** Operation that repairs the defect. */
  operation: string;
}

/** Readiness document for one installation. */
export interface IamInstallationReadiness {
  installationId: string;
  tenantId: string;
  organizationId: string;
  applicationType: string;
  status: string;
  /** Deploy application the installation serves; `null` when unbound. */
  deployApplicationId: string | null;
  ownershipScope: string;
  /** No defect blocks credential issuance or login. */
  ready: boolean;
  /** No defect blocks credential issuance (a missing relying party does not). */
  issuanceReady: boolean;
  /** No defect blocks the hosted browser login. */
  loginReady: boolean;
  repairOperation: string;
  environments: Array<{ environmentKey: string; status: string }>;
  defects: IamInstallationDefect[];
  [key: string]: unknown;
}

/** One repair step of a reconcile call. */
export interface IamInstallationReconcileStep {
  field: string;
  /** `applied` for a write, `planned` for a dry run, `skipped` when satisfied. */
  status: "applied" | "planned" | "skipped";
  detail: string;
}

/** Outcome of one reconcile call. */
export interface IamInstallationReconcileResult {
  installationId: string;
  dryRun: boolean;
  /** At least one step was written; always false for a dry run. */
  changed: boolean;
  steps: IamInstallationReconcileStep[];
  readinessBefore: IamInstallationReadiness;
  /** Equal to `readinessBefore` for a dry run. */
  readinessAfter: IamInstallationReadiness;
  [key: string]: unknown;
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
  /**
   * The concrete application surface.
   *
   * `app.appType` is a framework family (`APP_REACT` covers PC web and WeChat
   * mini programs), so the runtime block is the authoritative source of the
   * tenant-application `applicationType`.
   */
  runtime?: {
    family?: string;
    framework?: string;
    defaultPlatform?: string;
    defaultArchitecture?: string;
    runtimes?: string[];
    targetPlatforms?: string[];
    clientArchitectures?: string[];
  };
  /** Publish/install platforms; a second surface signal for old manifests. */
  publish?: {
    platforms?: string[];
    installPlatforms?: string[];
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
  release?: {
    notes?: Array<{
      channel?: string;
      current?: boolean;
      version?: string;
    }>;
  };
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
  command: IamInstallationProvisionCommand;
  /** Replay cache for provisioning idempotency keys (shared by a module instance). */
  provisioningCache?: IamApplicationBootstrapReplayCache;
  /** Optional version label reported in the bootstrap result. */
  version?: string;
}

export interface ApplicationBootstrapResult {
  accessCredential?: string;
  appId?: string;
  applicationType: IamApplicationType;
  authToken?: string;
  deployApplicationId: string;
  enabled: EnabledInstallationResult;
  env: Record<string, string>;
  issued: IssuedAccessCredentialResult;
  provisioningIdempotencyKey: string;
  provisioned: ProvisionedInstallationResult;
  installationId: string;
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
  enableInstallation(
    installationId: string,
    body?: Record<string, unknown>,
  ): Promise<EnabledInstallationResult>;
  name: "@sdkwork/iam-application-bootstrap";
  provisionInstallation(
    body: IamInstallationProvisionCommand,
  ): Promise<ProvisionedInstallationResult>;
  updateInstallation?(
    installationId: string,
    body?: Record<string, unknown>,
  ): Promise<ProvisionedInstallationResult>;
  version: "0.1.0";
}
