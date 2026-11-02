/**
 * Organization directory controller.
 *
 * A thin projection over `organizations.list`: validate what the server sent into
 * the screen's record shape and hand back one page at a time. The tree endpoint is
 * deliberately unused — it answers one whole document, while `PAGINATION_SPEC.md`
 * asks an interactive list to walk pages.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery, type SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5OrganizationControllerInput,
  SdkworkIamH5Organization,
  SdkworkIamH5OrganizationController,
  SdkworkIamH5OrganizationServicePort,
} from "../types/organization-h5-types";

/**
 * Build the directory controller.
 * @param input - the injected service port, or the bare port.
 * @returns the controller the directory screen binds to.
 */
export function createSdkworkIamH5OrganizationController(
  input: SdkworkIamH5OrganizationServicePort | CreateSdkworkIamH5OrganizationControllerInput,
): SdkworkIamH5OrganizationController {
  const service = "service" in input ? input.service : input;
  return {
    async fetchOrganizationsPage(
      query: SdkworkIamH5ListQuery,
    ): Promise<SdkworkIamH5Page<SdkworkIamH5Organization>> {
      const page = readSdkworkIamH5Page<unknown>(await service.iam.organizations.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const organization = toOrganization(item);
          return organization ? [organization] : [];
        }),
      };
    },
  };
}

/**
 * Project the kit query onto the wire query; an empty `q` is not sent.
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

function toOrganization(value: unknown): SdkworkIamH5Organization | undefined {
  const record = value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
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

function readString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}
