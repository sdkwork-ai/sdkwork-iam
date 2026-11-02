// SDKWORK-IAM-H5-CONSOLE-ORGANIZATION: authored controller.
/**
 * Console organization controller over the injected IAM service.
 *
 * One query: the organization page. Server-searched and server-paged, because an
 * operator looking for one organization out of a thousand must not filter a downloaded
 * list in the browser (`PAGINATION_SPEC.md`).
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5ConsoleOrganizationControllerInput,
  SdkworkIamH5ConsoleOrganization,
  SdkworkIamH5ConsoleOrganizationController,
  SdkworkIamH5ConsoleOrganizationServicePort,
} from "../types/console-organization-types.js";

/**
 * Build the console organization controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5ConsoleOrganizationController(
  input:
    | SdkworkIamH5ConsoleOrganizationServicePort
    | CreateSdkworkIamH5ConsoleOrganizationControllerInput,
): SdkworkIamH5ConsoleOrganizationController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchOrganizationsPage(query) {
      const page = readSdkworkIamH5Page<unknown>(
        await service.iam.organizations.list(toListParams(query)),
      );
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

function toOrganization(value: unknown): SdkworkIamH5ConsoleOrganization | undefined {
  const record = toRecord(value);
  const id =
    readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
  if (!id) return undefined;
  return {
    id,
    name: readString(record.name) ?? readString(record.displayName) ?? id,
    ...(readString(record.parentId) ?? readString(record.parent_id)
      ? { parentId: readString(record.parentId) ?? readString(record.parent_id) }
      : {}),
  };
}
