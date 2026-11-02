// SDKWORK-IAM-H5-ADMIN-PERMISSION: authored controller.
/**
 * Admin permission catalog controller over the injected IAM service.
 *
 * One query: the permission page from the backend-api. The list is server-searched and
 * server-paged because a tenant's catalog can be thousands of rows and an operator
 * filters it to find one.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5AdminPermissionControllerInput,
  SdkworkIamH5AdminPermission,
  SdkworkIamH5AdminPermissionController,
  SdkworkIamH5AdminPermissionServicePort,
} from "../types/admin-permission-types.js";

/**
 * Build the admin permission controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5AdminPermissionController(
  input: SdkworkIamH5AdminPermissionServicePort | CreateSdkworkIamH5AdminPermissionControllerInput,
): SdkworkIamH5AdminPermissionController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchPermissionsPage(query) {
      const page = readSdkworkIamH5Page<unknown>(
        await service.iam.permissions.list(toListParams(query)),
      );
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const permission = toPermission(item);
          return permission ? [permission] : [];
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

function toPermission(value: unknown): SdkworkIamH5AdminPermission | undefined {
  const record = toRecord(value);
  const id =
    readString(record.permissionId) ?? readString(record.permission_id) ?? readString(record.id);
  // A permission without an identity cannot be acted on later, so it is dropped rather
  // than rendered as a row an operator could never manage.
  if (!id) return undefined;
  const resource = readString(record.resource);
  const action = readString(record.action);
  return {
    id,
    code: readString(record.code) ?? readString(record.name) ?? id,
    ...(resource === undefined ? {} : { resource }),
    ...(action === undefined ? {} : { action }),
  };
}
