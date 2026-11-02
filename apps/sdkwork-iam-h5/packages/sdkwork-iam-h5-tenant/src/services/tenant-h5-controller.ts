/**
 * Tenant overview controller over the injected IAM service.
 *
 * Every method is a query: it validates what the server sent into the screen's
 * record shape and hands back one page at a time. Nothing here caches, retries or
 * re-orders — the kit hooks own load state and `PAGINATION_SPEC.md` owns paging.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery, type SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5TenantControllerInput,
  SdkworkIamH5TenantController,
  SdkworkIamH5TenantMembership,
  SdkworkIamH5TenantOrganization,
  SdkworkIamH5TenantRuntime,
  SdkworkIamH5TenantServicePort,
} from "../types/tenant-h5-types";

/**
 * Build the tenant overview controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5TenantController(
  input: SdkworkIamH5TenantServicePort | CreateSdkworkIamH5TenantControllerInput,
): SdkworkIamH5TenantController {
  const service = "service" in input ? input.service : input;

  return {
    async loadRuntime(): Promise<SdkworkIamH5TenantRuntime> {
      return toRuntime(await service.system.iam.runtime.retrieve());
    },
    async fetchOrganizationsPage(
      query: SdkworkIamH5ListQuery,
    ): Promise<SdkworkIamH5Page<SdkworkIamH5TenantOrganization>> {
      const page = readSdkworkIamH5Page<unknown>(await service.iam.organizations.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const organization = toOrganization(item);
          return organization ? [organization] : [];
        }),
      };
    },
    async fetchMembershipsPage(
      query: SdkworkIamH5ListQuery,
    ): Promise<SdkworkIamH5Page<SdkworkIamH5TenantMembership>> {
      const page = readSdkworkIamH5Page<unknown>(
        await service.iam.organizationMemberships.list(toListParams(query)),
      );
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const membership = toMembership(item);
          return membership ? [membership] : [];
        }),
      };
    },
  };
}

/**
 * Project the kit query onto the wire query.
 *
 * `q` is only sent when non-empty: an empty `q` is a filter the server would have
 * to special-case, and omitting it keeps the request identical to an unfiltered
 * list.
 * @param query - kit query.
 * @returns the parameters object the port accepts.
 */
function toListParams(query: SdkworkIamH5ListQuery): Record<string, unknown> {
  const q = query.q?.trim();
  return {
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.page_size !== undefined ? { page_size: query.page_size } : {}),
    ...(q ? { q } : {}),
  };
}

function toRuntime(value: unknown): SdkworkIamH5TenantRuntime {
  const record = toRecord(value);
  return {
    deploymentMode: readString(record.deploymentMode) ?? readString(record.deployment_mode),
    environment: readString(record.environment),
    tenantId: readString(record.tenantId) ?? readString(record.tenant_id),
    userId: readString(record.userId) ?? readString(record.user_id),
  };
}

function toOrganization(value: unknown): SdkworkIamH5TenantOrganization | undefined {
  const record = toRecord(value);
  const organizationId =
    readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
  if (!organizationId) return undefined;
  return {
    id: readString(record.id) ?? organizationId,
    name: readString(record.name) ?? readString(record.organizationName) ?? organizationId,
    parentId: readString(record.parentId) ?? readString(record.parent_id),
    status: readString(record.status),
  };
}

function toMembership(value: unknown): SdkworkIamH5TenantMembership | undefined {
  const record = toRecord(value);
  const userId = readString(record.userId) ?? readString(record.user_id) ?? readString(record.id);
  if (!userId) return undefined;
  return {
    displayName: readString(record.displayName) ?? readString(record.name),
    id: readString(record.id) ?? readString(record.membershipId) ?? userId,
    organizationId: readString(record.organizationId) ?? readString(record.organization_id),
    roleCode: readString(record.roleCode) ?? readString(record.role_code),
    userId,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}
