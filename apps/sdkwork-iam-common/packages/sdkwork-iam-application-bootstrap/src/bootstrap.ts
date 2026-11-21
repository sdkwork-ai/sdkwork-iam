import { mergeBootstrapAuth } from "./auth.ts";
import {
  assertIamApplicationType,
  manifestReleaseVersion,
  manifestToProvisionCommand,
  normalizeOwnershipScope,
  validateBootstrapEnvironment,
  validateManifestForBootstrap,
  validateInstallationProvisionCommand,
} from "./manifest.ts";
import { assertSdkworkJwtCredential } from "@sdkwork/runtime-bootstrap";
import type {
  ApplicationBootstrapEnvWriterInput,
  ApplicationBootstrapFromCommandInput,
  ApplicationBootstrapFromManifestInput,
  ApplicationBootstrapResult,
  CreateIamApplicationBootstrapInput,
  EnabledInstallationResult,
  IamApplicationBootstrapAuth,
  IamApplicationBootstrapModule,
  IamApplicationBootstrapProfile,
  IamApplicationBootstrapReplayCache,
  IamInstallationProvisionCommand,
  ProvisionedInstallationResult,
} from "./types.ts";

export interface BootstrapApplicationFromManifestOptions extends ApplicationBootstrapFromManifestInput {
  profile?: IamApplicationBootstrapProfile | null;
}

export interface BootstrapDeployApplicationOptions extends ApplicationBootstrapFromCommandInput {
  profile?: IamApplicationBootstrapProfile | null;
}

interface ProvisionPipelineInput extends BootstrapDeployApplicationOptions {
  version?: string;
}

/**
 * Provision one tenant installation from the deploy application it serves.
 *
 * The flow is `installations.create` → `installations.enable` →
 * `accessCredentials.create`. It never registers an application template and
 * never sends `templateId`/`appKey`.
 *
 * A repeated call carrying the same `provisioningIdempotencyKey` replays the
 * first outcome through {@link IamApplicationBootstrapReplayCache} instead of
 * provisioning a second installation.
 * @param input - deploy-application command, bootstrap auth, and transport client
 * @returns the provisioning, enable, credential, and env-handoff result
 */
export async function bootstrapDeployApplication(
  input: BootstrapDeployApplicationOptions | ApplicationBootstrapFromCommandInput,
): Promise<ApplicationBootstrapResult> {
  const { command } = input;
  validateInstallationProvisionCommand(command);
  const profile = "profile" in input ? input.profile : undefined;
  return runProvisionPipeline({
    client: input.client,
    auth: input.auth,
    command,
    ...(input.provisioningCache ? { provisioningCache: input.provisioningCache } : {}),
    ...(profile !== undefined ? { profile } : {}),
  });
}

/**
 * Bootstrap an application from `agent.app.config.json`.
 *
 * The manifest supplies defaults (deploy application anchor, application type,
 * permissions, runtime config); `provision` supplies or overrides the
 * deploy-application inputs the caller owns.
 * @param input - manifest, bootstrap environment, auth, and transport client
 * @returns the provisioning, enable, credential, and env-handoff result
 */
export async function bootstrapApplicationFromManifest(
  input: BootstrapApplicationFromManifestOptions,
): Promise<ApplicationBootstrapResult> {
  validateManifestForBootstrap(input.manifest);
  validateBootstrapEnvironment(input.environment);

  const command = manifestToProvisionCommand(
    input.manifest,
    input.environment,
    input.provision,
  );
  validateInstallationProvisionCommand(command);
  const version = manifestReleaseVersion(input.manifest);
  return runProvisionPipeline({
    client: input.client,
    auth: input.auth,
    command,
    ...(input.provisioningCache ? { provisioningCache: input.provisioningCache } : {}),
    ...(input.profile !== undefined ? { profile: input.profile } : {}),
    ...(version !== undefined ? { version } : {}),
  });
}

async function runProvisionPipeline(input: ProvisionPipelineInput): Promise<ApplicationBootstrapResult> {
  const command = input.command;
  const key = command.provisioningIdempotencyKey;

  const replay = input.provisioningCache?.get(key);
  if (replay) {
    return replay;
  }

  const pending = executeProvisionPipeline(input);
  if (input.provisioningCache) {
    input.provisioningCache.set(key, pending);
    pending.catch(() => {
      if (input.provisioningCache?.get(key) === pending) {
        input.provisioningCache.delete(key);
      }
    });
  }
  return pending;
}

async function executeProvisionPipeline(
  input: ProvisionPipelineInput,
): Promise<ApplicationBootstrapResult> {
  const command = input.command;
  const profile = input.profile ?? null;

  const provisioned = await provisionWithAnchorRepair(input, command, profile);
  const installationId = String(
    provisioned.installationId ?? provisioned.id ?? "",
  );
  if (!installationId) {
    throw new Error("installation provisioning did not return installationId");
  }

  const enabled = await input.client.enableInstallation(
    installationId,
    mergeBootstrapAuth({ tenantId: command.tenantId }, input.auth, profile),
  );
  assertInstallationEnabled(enabled, installationId);

  const issued = await input.client.createAccessCredential(
    mergeBootstrapAuth(
      {
        tenantId: command.tenantId,
        organizationId: command.organizationId,
        // The credential request names the installation with the canonical
        // field; the legacy `tenantApplicationId` spelling is still accepted by
        // the backend for the migration window.
        installationId: enabled.installationId ?? installationId,
      },
      input.auth,
      profile,
    ),
  );

  const resolvedInstallationId = String(
    issued.installationId ?? enabled.installationId ?? installationId,
  );
  const appId = issued.appId ?? enabled.appId ?? provisioned.appId;
  const accessCredential = issued.accessCredential ?? issued.accessToken;
  // The installation's deploy application is the subject of every access token
  // (`APPLICATION_IDENTITY_SPEC.md`): the signed `app_id`/`aud` claims carry the
  // anchor, never the IAM runtime app id, and the tenant claim is what keeps the
  // credential inside one tenant. A credential minted for another installation
  // or tenant fails every authenticated request downstream, so the bootstrap
  // refuses it before the token leaves this process.
  assertAccessCredentialIdentity(
    accessCredential,
    issued.appId,
    command,
  );

  const result: ApplicationBootstrapResult = {
    provisioned,
    enabled,
    issued,
    installationId: resolvedInstallationId,
    deployApplicationId: command.deployApplicationId,
    applicationType: assertIamApplicationType(command.applicationType),
    provisioningIdempotencyKey: command.provisioningIdempotencyKey,
    ...(appId !== undefined ? { appId } : {}),
    ...(input.version !== undefined ? { version: input.version } : {}),
    ...(issued.authToken !== undefined ? { authToken: issued.authToken } : {}),
    ...(accessCredential !== undefined ? { accessCredential } : {}),
    env: {},
  };

  result.env = buildBootstrapEnvRecord({
    result,
    ...(command.primaryDomain !== undefined ? { primaryDomain: command.primaryDomain } : {}),
  });
  return result;
}

/**
 * Provision the installation and repair a receiver that did not bind the anchor.
 *
 * An access token can only name the deploy application its installation serves
 * (`APPLICATION_IDENTITY_SPEC.md` §4), so an installation without that link can
 * never issue a usable credential. When the provisioning answer carries no
 * anchor — a legacy row or a receiver that ignored the field — the same
 * idempotent command is replayed once: the surface matches by anchor first and
 * by instance key second, so the retry binds the existing row instead of
 * creating a second installation.
 * @param input - pipeline input carrying the client, auth, and profile
 * @param command - validated provisioning command
 * @param profile - operator profile merged into the bootstrap body
 * @returns the provisioning answer, with the anchor verified
 * @throws when the anchor is absent after the repair attempt or names another deployment
 */
async function provisionWithAnchorRepair(
  input: ProvisionPipelineInput,
  command: IamInstallationProvisionCommand,
  profile: IamApplicationBootstrapProfile | null,
): Promise<ProvisionedInstallationResult> {
  const body = mergeBootstrapAuth({ ...command }, input.auth, profile) as IamInstallationProvisionCommand;
  let provisioned = await input.client.provisionInstallation(body);
  if (normalizeAppId(provisioned.deployApplicationId) === undefined) {
    provisioned = await input.client.provisionInstallation(body);
  }
  assertProvisionedInstallation(provisioned, command);
  return provisioned;
}

/**
 * Refuses a provisioning answer whose installation is not the deployment served.
 * @param provisioned - provisioning answer
 * @param command - command that was sent
 * @throws when the anchor is missing or names a different deployment, or when
 * the stored release scope contradicts the command
 */
function assertProvisionedInstallation(
  provisioned: ProvisionedInstallationResult,
  command: IamInstallationProvisionCommand,
): void {
  const expectedAnchor = command.deployApplicationId.trim();
  const installationId = String(provisioned.installationId ?? provisioned.id ?? "") || "<unknown>";
  const bound = normalizeAppId(provisioned.deployApplicationId);
  if (bound === undefined) {
    throw new Error(
      `installation ${installationId} is not bound to deploy application ${expectedAnchor}; `
        + "the provisioning surface did not persist the anchor, so no access token can be issued",
    );
  }
  if (bound !== expectedAnchor) {
    throw new Error(
      `installation ${installationId} is bound to deploy application ${bound}, not the provisioned `
        + `${expectedAnchor}; refusing to issue a credential for another deployment`,
    );
  }
  // The installation is the whole configuration a token vouches for: when the
  // stored row disagrees with the command, the credential would describe one
  // application while the consumer reads another. Collect every disagreement so
  // one bootstrap run reports the complete repair list.
  const problems: string[] = [];
  const tenant = normalizeAppId(provisioned.tenantId);
  if (tenant !== undefined && tenant !== command.tenantId.trim()) {
    problems.push(
      `tenant ${tenant} is not the requested ${command.tenantId.trim()} (tenant isolation)`,
    );
  }
  const organization = normalizeAppId(provisioned.organizationId);
  if (organization !== undefined && organization !== command.organizationId.trim()) {
    problems.push(
      `organization ${organization} is not the requested ${command.organizationId.trim()}`,
    );
  }
  const declaredScope = normalizeOwnershipScope(command.ownershipScope);
  if (typeof provisioned.ownershipScope === "string" && provisioned.ownershipScope.trim() !== "") {
    const stored = normalizeOwnershipScope(provisioned.ownershipScope);
    if (stored !== declaredScope) {
      problems.push(`ownershipScope ${stored} is not the declared ${declaredScope} (immutable)`);
    }
  }
  const storedType = normalizeAppId(provisioned.applicationType)?.toLowerCase();
  if (storedType !== undefined && storedType !== command.applicationType.trim().toLowerCase()) {
    problems.push(`applicationType ${storedType} is not the requested ${command.applicationType.trim()}`);
  }
  const storedInstance = normalizeAppId(provisioned.instanceKey);
  if (storedInstance !== undefined && storedInstance !== command.instanceKey.trim()) {
    problems.push(`instanceKey ${storedInstance} is not the requested ${command.instanceKey.trim()}`);
  }
  const storedEnvironment = normalizeAppId(provisioned.environment);
  if (storedEnvironment !== undefined && storedEnvironment !== command.environment.trim()) {
    problems.push(`environment ${storedEnvironment} is not the requested ${command.environment.trim()}`);
  }
  const storedDomain = normalizeAppId(provisioned.primaryDomain);
  const requestedDomain = normalizeAppId(command.primaryDomain);
  if (storedDomain !== undefined && requestedDomain !== undefined && storedDomain !== requestedDomain) {
    problems.push(`primaryDomain ${storedDomain} is not the requested ${requestedDomain}`);
  }
  const storedDisplay = normalizeAppId(provisioned.displayName);
  if (storedDisplay !== undefined && storedDisplay !== command.displayName.trim()) {
    problems.push(
      `displayName ${JSON.stringify(storedDisplay)} is not the requested `
        + JSON.stringify(command.displayName.trim()),
    );
  }
  const requestedPermissions = normalizePermissions(command.accessPermissions);
  const storedPermissions = Array.isArray(provisioned.accessPermissions)
    ? normalizePermissions(provisioned.accessPermissions)
    : undefined;
  if (storedPermissions !== undefined && !samePermissions(storedPermissions, requestedPermissions)) {
    problems.push(
      `accessPermissions [${storedPermissions.join(", ")}] is not the requested `
        + `[${requestedPermissions.join(", ")}]`,
    );
  }
  const requestedRelyingParty = relyingPartyClientId(command.runtimeConfig);
  const storedRelyingParty = storedRelyingPartyClientId(provisioned);
  if (
    requestedRelyingParty !== undefined
    && storedRelyingParty !== undefined
    && requestedRelyingParty !== storedRelyingParty
  ) {
    problems.push(
      `OAuth relying party ${storedRelyingParty} is not the declared ${requestedRelyingParty}`,
    );
  }
  if (problems.length > 0) {
    throw new Error(`installation ${installationId} is incomplete: ${problems.join("; ")}`);
  }
}

/**
 * Refuses a bootstrap that did not reach the operable state.
 * @param enabled - enable answer
 * @param installationId - installation that was enabled
 * @throws when the answer reports a status other than `enabled`
 */
function assertInstallationEnabled(
  enabled: EnabledInstallationResult,
  installationId: string,
): void {
  const status = typeof enabled.status === "string" ? enabled.status.trim().toLowerCase() : "";
  if (status !== "" && status !== "enabled") {
    throw new Error(`installation ${installationId} is not enabled after bootstrap (status=${status})`);
  }
}

/**
 * Refuses a credential whose claims do not describe the provisioned installation.
 *
 * The signed claims are the token's own statement of the deployment, tenant, and
 * release scope it serves; the response's `appId` only stands in when the
 * credential cannot be read as a JWT. Verifying the tenant here is what makes
 * tenant isolation a property of generation rather than a hope about the
 * caller: a credential minted for another tenant never leaves this process.
 * @param credential - access credential the API returned, when it returned one
 * @param reportedAppId - `appId` the credential response reported, if any
 * @param command - provisioning command this bootstrap just executed
 * @throws when the credential names another anchor, tenant, or release scope
 */
function assertAccessCredentialIdentity(
  credential: string | undefined,
  reportedAppId: string | undefined,
  command: IamInstallationProvisionCommand,
): void {
  if (credential === undefined || credential.trim() === "") {
    return;
  }
  const claims = accessCredentialClaims(credential);
  const subject = claims?.appId ?? normalizeAppId(reportedAppId);
  const expectedAnchor = command.deployApplicationId.trim();
  if (subject === undefined) {
    throw new Error(
      `access credential does not name the deploy application ${expectedAnchor}; `
        + "provision the installation with deployApplicationId before issuing a credential",
    );
  }
  if (subject !== expectedAnchor) {
    throw new Error(
      `access credential names deploy application ${subject}, but this bootstrap provisioned `
        + `${expectedAnchor}; the installation's deploy link does not match the access token`,
    );
  }
  const expectedTenant = command.tenantId.trim();
  if (claims?.tenantId !== undefined && claims.tenantId !== expectedTenant) {
    throw new Error(
      `access credential tenant ${claims.tenantId} does not match the provisioned tenant `
        + `${expectedTenant}; tenant isolation requires one tenant`,
    );
  }
  const expectedScope = normalizeOwnershipScope(command.ownershipScope);
  if (
    claims?.ownershipScope !== undefined
    && normalizeOwnershipScope(claims.ownershipScope) !== expectedScope
  ) {
    throw new Error(
      `access credential ownershipScope ${claims.ownershipScope} does not match the provisioned `
        + `${expectedScope}`,
    );
  }
}

/** Claims this bootstrap reads from a signed access credential. */
interface AccessCredentialClaims {
  appId?: string;
  tenantId?: string;
  ownershipScope?: string;
}

/**
 * Reads the identity claims out of a JWT access credential.
 * @param credential - access credential in compact serialization
 * @returns the readable claims, or undefined when the credential is opaque or malformed
 */
function accessCredentialClaims(credential: string): AccessCredentialClaims | undefined {
  const payloadSegment = credential.split(".")[1];
  if (payloadSegment === undefined || payloadSegment === "") {
    return undefined;
  }
  try {
    const base64 = payloadSegment.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    return {
      appId: typeof payload.app_id === "string" ? normalizeAppId(payload.app_id) : undefined,
      tenantId: readStringClaim(payload, ["tenant_id", "tid"]),
      ownershipScope: typeof payload.ownership_scope === "string"
        ? normalizeAppId(payload.ownership_scope)
        : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Reads the first non-blank string claim among the accepted claim names.
 * @param payload - decoded JWT payload
 * @param keys - claim names in precedence order
 * @returns the trimmed claim, or undefined when none is present
 */
function readStringClaim(payload: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    const normalized = typeof value === "string" ? normalizeAppId(value) : undefined;
    if (normalized !== undefined) {
      return normalized;
    }
  }
  return undefined;
}

/**
 * Normalizes a permission list for order-insensitive comparison.
 * @param value - declared or stored access permissions
 * @returns unique, trimmed, sorted permission codes
 */
function normalizePermissions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item !== ""))]
    .sort();
}

/**
 * Compares two normalized permission lists.
 * @param left - first sorted list
 * @param right - second sorted list
 * @returns whether both hold the same codes
 */
function samePermissions(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/**
 * Reads the declared OAuth relying-party client id from a runtime config.
 * @param runtimeConfig - runtime config document, if declared
 * @returns the client id, or undefined when the bootstrap registers no relying party
 */
function relyingPartyClientId(runtimeConfig: unknown): string | undefined {
  if (!isRecord(runtimeConfig)) {
    return undefined;
  }
  const oauth = runtimeConfig.oauth;
  if (!isRecord(oauth)) {
    return undefined;
  }
  const relyingParty = oauth.relyingParty;
  if (!isRecord(relyingParty)) {
    return undefined;
  }
  return typeof relyingParty.clientId === "string" ? normalizeAppId(relyingParty.clientId) : undefined;
}

/**
 * Reads the stored OAuth relying-party client id from a provisioning answer.
 * @param provisioned - provisioning answer
 * @returns the client id, or undefined when the installation registers none
 */
function storedRelyingPartyClientId(
  provisioned: ProvisionedInstallationResult,
): string | undefined {
  const relyingParty = provisioned.oauthRelyingParty;
  if (!isRecord(relyingParty)) {
    return undefined;
  }
  return typeof relyingParty.clientId === "string" ? normalizeAppId(relyingParty.clientId) : undefined;
}

/**
 * Narrows a foreign value to a plain object.
 * @param value - candidate value
 * @returns whether the value is a non-array object
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Trims a reported application id, treating its absence as unknown.
 * @param value - value reported by an API response
 * @returns the trimmed id, or undefined when absent or blank
 */
function normalizeAppId(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === "" ? undefined : trimmed;
}

export function buildBootstrapEnvRecord(input: ApplicationBootstrapEnvWriterInput): Record<string, string> {
  const { result, primaryDomain } = input;
  const provisionTenantId = result.provisioned.tenantId;
  const provisionOrganizationId = result.provisioned.organizationId;
  const accessCredential = String(result.issued.accessCredential ?? result.issued.accessToken ?? "");
  if (accessCredential) {
    assertSdkworkJwtCredential(accessCredential, "SDKWORK_ACCESS_TOKEN");
  }

  return {
    SDKWORK_TENANT_ID: String(result.issued.tenantId ?? provisionTenantId ?? ""),
    SDKWORK_ORGANIZATION_ID: String(result.issued.organizationId ?? provisionOrganizationId ?? ""),
    SDKWORK_INSTALLATION_ID: String(
      result.issued.installationId ?? result.enabled.installationId ?? result.provisioned.installationId ?? "",
    ),
    // The deployment anchor the credential names is part of the handoff: a
    // consumer that only got the token would have to guess the application
    // identity, which is exactly the failure this bootstrap removes.
    SDKWORK_DEPLOY_APPLICATION_ID: result.deployApplicationId,
    SDKWORK_APP_ID: String(result.issued.appId ?? result.enabled.appId ?? result.provisioned.appId ?? ""),
    SDKWORK_APP_DOMAIN: primaryDomain ?? "",
    SDKWORK_ACCESS_TOKEN: accessCredential,
    ...(input.env ?? {}),
  };
}

export function formatBootstrapEnvFile(input: ApplicationBootstrapEnvWriterInput): string {
  const lines = Object.entries(buildBootstrapEnvRecord(input)).map(([key, value]) => `${key}=${value}`);
  return `${lines.join("\n")}\n`;
}

/**
 * Compose the bootstrap module around a transport client.
 * @param input - client plus an optional shared provisioning replay cache
 * @returns the reusable bootstrap module facade
 */
export function createIamApplicationBootstrap(
  input: CreateIamApplicationBootstrapInput,
): IamApplicationBootstrapModule {
  const provisioningCache = input.provisioningCache === null
    ? undefined
    : input.provisioningCache ?? new Map<string, Promise<ApplicationBootstrapResult>>();

  return {
    name: "@sdkwork/iam-application-bootstrap",
    version: "0.1.0",
    provisionInstallation: (body) => input.client.provisionInstallation(body),
    enableInstallation: (installationId, body) =>
      input.client.enableInstallation(installationId, body),
    createAccessCredential: (body) => input.client.createAccessCredential(body),
    updateInstallation: (installationId, body) => {
      if (!input.client.updateInstallation) {
        throw new Error("iam.installations.update is not available on the bootstrap client");
      }
      return input.client.updateInstallation(installationId, body);
    },
    bootstrapDeployApplication: (options) => bootstrapDeployApplication({
      ...options,
      client: input.client,
      ...(provisioningCache ? { provisioningCache } : {}),
    }),
    bootstrapFromManifest: (options) => bootstrapApplicationFromManifest({
      ...options,
      client: input.client,
      ...(provisioningCache ? { provisioningCache } : {}),
    }),
  };
}

export type { IamApplicationBootstrapAuth };
