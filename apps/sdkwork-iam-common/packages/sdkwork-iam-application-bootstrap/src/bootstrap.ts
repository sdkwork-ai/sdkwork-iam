import { mergeBootstrapAuth } from "./auth.ts";
import {
  assertIamTenantApplicationType,
  manifestReleaseVersion,
  manifestToProvisionCommand,
  validateBootstrapEnvironment,
  validateManifestForBootstrap,
  validateTenantApplicationProvisionCommand,
} from "./manifest.ts";
import { assertSdkworkJwtCredential } from "@sdkwork/runtime-bootstrap";
import type {
  ApplicationBootstrapEnvWriterInput,
  ApplicationBootstrapFromCommandInput,
  ApplicationBootstrapFromManifestInput,
  ApplicationBootstrapResult,
  CreateIamApplicationBootstrapInput,
  IamApplicationBootstrapAuth,
  IamApplicationBootstrapModule,
  IamApplicationBootstrapProfile,
  IamApplicationBootstrapReplayCache,
  IamTenantApplicationProvisionCommand,
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
 * The flow is `tenantApplications.create` → `tenantApplications.enable` →
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
  validateTenantApplicationProvisionCommand(command);
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
  validateTenantApplicationProvisionCommand(command);
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

  const provisioned = await input.client.provisionTenantApplication(
    mergeBootstrapAuth({ ...command }, input.auth, profile) as IamTenantApplicationProvisionCommand,
  );

  const tenantApplicationId = String(
    provisioned.tenantApplicationId ?? provisioned.id ?? "",
  );
  if (!tenantApplicationId) {
    throw new Error("tenantApplications.create did not return tenantApplicationId");
  }

  const enabled = await input.client.enableTenantApplication(
    tenantApplicationId,
    mergeBootstrapAuth({ tenantId: command.tenantId }, input.auth, profile),
  );

  const issued = await input.client.createAccessCredential(
    mergeBootstrapAuth(
      {
        tenantId: command.tenantId,
        organizationId: command.organizationId,
        tenantApplicationId: enabled.tenantApplicationId ?? tenantApplicationId,
      },
      input.auth,
      profile,
    ),
  );

  const resolvedTenantApplicationId = String(
    issued.tenantApplicationId ?? enabled.tenantApplicationId ?? tenantApplicationId,
  );
  const appId = issued.appId ?? enabled.appId ?? provisioned.appId;
  const accessCredential = issued.accessCredential ?? issued.accessToken;

  const result: ApplicationBootstrapResult = {
    provisioned,
    enabled,
    issued,
    tenantApplicationId: resolvedTenantApplicationId,
    deployApplicationId: command.deployApplicationId,
    applicationType: assertIamTenantApplicationType(command.applicationType),
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
    SDKWORK_TENANT_APPLICATION_ID: String(
      result.issued.tenantApplicationId ?? result.enabled.tenantApplicationId ?? result.provisioned.tenantApplicationId ?? "",
    ),
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
    provisionTenantApplication: (body) => input.client.provisionTenantApplication(body),
    enableTenantApplication: (tenantApplicationId, body) =>
      input.client.enableTenantApplication(tenantApplicationId, body),
    createAccessCredential: (body) => input.client.createAccessCredential(body),
    updateTenantApplication: (tenantApplicationId, body) => {
      if (!input.client.updateTenantApplication) {
        throw new Error("iam.tenantApplications.update is not available on the bootstrap client");
      }
      return input.client.updateTenantApplication(tenantApplicationId, body);
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
