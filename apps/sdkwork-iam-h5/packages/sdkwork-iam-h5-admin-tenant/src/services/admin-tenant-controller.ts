// SDKWORK-IAM-H5-ADMIN-TENANT: authored controller.
/**
 * Admin tenant controller over the injected IAM service.
 *
 * One query: the tenant page from the backend-api, server-searched and server-paged.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5AdminTenantControllerInput,
  SdkworkIamH5AdminTenantController,
  SdkworkIamH5AdminTenantRow,
  SdkworkIamH5AdminTenantServicePort,
} from "../types/admin-tenant-types.js";

/**
 * Build the admin tenant controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5AdminTenantController(
  input: SdkworkIamH5AdminTenantServicePort | CreateSdkworkIamH5AdminTenantControllerInput,
): SdkworkIamH5AdminTenantController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchTenantsPage(query) {
      const page = readSdkworkIamH5Page<unknown>(await service.iam.tenants.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const tenant = toTenant(item);
          return tenant ? [tenant] : [];
        }),
      };
    },
  };
}

function toListParams(query: SdkworkIamH5ListQuery): Record<string, unknown> {
  const q = query.q?.trim();
  return {
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.page_size === undefined ? {} : { page_size: query.page_size }),
    ...(q === undefined || q === "" ? {} : { q }),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function toTenant(value: unknown): SdkworkIamH5AdminTenantRow | undefined {
  const record = toRecord(value);
  const id = readString(record.tenantId) ?? readString(record.tenant_id) ?? readString(record.id);
  // A tenant without an identity cannot be opened later, so it is dropped rather than
  // rendered as a row the operator could never act on.
  if (!id) return undefined;
  const status = readString(record.status) ?? readString(record.state);
  return {
    id,
    name: readString(record.name) ?? readString(record.displayName) ?? id,
    ...(status === undefined ? {} : { status }),
  };
}
