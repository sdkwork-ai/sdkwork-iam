import { unwrapIamSdkResponse } from "@sdkwork/iam-sdk-adapter";
import type { IamBackendSdkClient } from "@sdkwork/iam-sdk-ports";
import type { SdkworkIamService } from "@sdkwork/iam-service";

import { createIamApplicationBootstrap } from "./bootstrap.ts";
import {
  createFetchIamApplicationBootstrapClient,
  type CreateFetchIamApplicationBootstrapClientOptions,
} from "./fetch-client.ts";
import type {
  EnabledInstallationResult,
  IamApplicationBootstrapClient,
  IamInstallationProvisionCommand,
  IssuedAccessCredentialResult,
  ProvisionedInstallationResult,
} from "./types.ts";
import { normalizeInstallationResult } from "./results.ts";

export function createIamApplicationBootstrapClientFromBackend(
  backend: IamBackendSdkClient,
): IamApplicationBootstrapClient {
  return {
    async provisionInstallation(body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<ProvisionedInstallationResult>(
        await backend.iam?.installations?.create?.(body),
        "iam.installations.create failed",
      ));
    },
    async enableInstallation(installationId, body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<EnabledInstallationResult>(
        await backend.iam?.installations?.enable?.(installationId, body),
        "iam.installations.enable failed",
      ));
    },
    async createAccessCredential(body) {
      return unwrapIamSdkResponse<IssuedAccessCredentialResult>(
        await backend.iam?.accessCredentials?.create?.(body),
        "iam.accessCredentials.create failed",
      );
    },
    async updateInstallation(installationId, body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<ProvisionedInstallationResult>(
        await backend.iam?.installations?.update?.(installationId, body),
        "iam.installations.update failed",
      ));
    },
  };
}

/**
 * CLI convenience adapter. Local tooling uses the fetch transport so start/build
 * does not require the generated backend SDK to be materialized.
 * @param config - backend origin (`baseUrl`) and optional fetch override
 * @returns an {@link IamApplicationBootstrapClient}
 */
export function createIamApplicationBootstrapClientFromAppbaseBackendSdk(
  config: CreateFetchIamApplicationBootstrapClientOptions,
): IamApplicationBootstrapClient {
  return createFetchIamApplicationBootstrapClient(config);
}

/**
 * Bootstrap-only backend SDK binding. Uses the canonical installation
 * operations directly so application bootstrap does not depend on the full
 * generated SDK surface matching {@link createIamBackendSdkAdapter}.
 */
export function createIamApplicationBootstrapClientFromGeneratedBackendSdk(
  client: {
    iam?: {
      installations?: {
        create?: (body: IamInstallationProvisionCommand) => Promise<unknown>;
        enable?: (installationId: string, body?: Record<string, unknown>) => Promise<unknown>;
        update?: (installationId: string, body?: Record<string, unknown>) => Promise<unknown>;
      };
      accessCredentials?: { create?: (body: Record<string, unknown>) => Promise<unknown> };
    };
  },
): IamApplicationBootstrapClient {
  const iam = client.iam;
  return {
    async provisionInstallation(body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<ProvisionedInstallationResult>(
        await iam?.installations?.create?.(body),
        "iam.installations.create failed",
      ));
    },
    async enableInstallation(installationId, body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<EnabledInstallationResult>(
        await iam?.installations?.enable?.(installationId, body),
        "iam.installations.enable failed",
      ));
    },
    async createAccessCredential(body) {
      return unwrapIamSdkResponse<IssuedAccessCredentialResult>(
        await iam?.accessCredentials?.create?.(body),
        "iam.accessCredentials.create failed",
      );
    },
    async updateInstallation(installationId, body) {
      return normalizeInstallationResult(unwrapIamSdkResponse<ProvisionedInstallationResult>(
        await iam?.installations?.update?.(installationId, body),
        "iam.installations.update failed",
      ));
    },
  };
}

export function createIamApplicationBootstrapClientFromIamService(
  service: SdkworkIamService,
): IamApplicationBootstrapClient {
  return {
    provisionInstallation: async (body) =>
      normalizeInstallationResult(
        (await service.iam.installations.create(body)) as Record<string, unknown>,
      ) as ProvisionedInstallationResult,
    enableInstallation: async (installationId, body) =>
      normalizeInstallationResult(
        (await service.iam.installations.enable(installationId, body)) as Record<string, unknown>,
      ) as EnabledInstallationResult,
    createAccessCredential: (body) =>
      service.iam.accessCredentials.create(body) as Promise<IssuedAccessCredentialResult>,
    updateInstallation: async (installationId, body) =>
      normalizeInstallationResult(
        (await service.iam.installations.update(installationId, body)) as Record<string, unknown>,
      ) as ProvisionedInstallationResult,
  };
}

export interface IamRuntimeBootstrapSource {
  service: SdkworkIamService;
}

export function createIamApplicationBootstrapFromIamService(
  service: SdkworkIamService,
): import("./types.ts").IamApplicationBootstrapModule {
  return createIamApplicationBootstrap({
    client: createIamApplicationBootstrapClientFromIamService(service),
  });
}

export function createIamApplicationBootstrapFromIamRuntime(
  runtime: IamRuntimeBootstrapSource,
): import("./types.ts").IamApplicationBootstrapModule {
  return createIamApplicationBootstrapFromIamService(runtime.service);
}
