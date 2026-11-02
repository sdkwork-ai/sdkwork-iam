// SDKWORK-IAM-H5-ADMIN-PERMISSION: authored controllers.
/**
 * Admin permission controllers over the injected IAM service.
 *
 * Three catalog queries (permissions, roles, policies), each server-searched and
 * server-paged for the same reason: a tenant's authorization catalog is large and the
 * operator is looking for one entry, not browsing a download.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5AdminPermissionControllerInput,
  SdkworkIamH5AdminPermission,
  SdkworkIamH5AdminPermissionController,
  SdkworkIamH5AdminPermissionServicePort,
  SdkworkIamH5AdminPolicy,
  SdkworkIamH5AdminPolicyController,
  SdkworkIamH5AdminRole,
  SdkworkIamH5AdminRoleController,
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

/**
 * Build the admin roles controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the roles screen binds to.
 */
export function createSdkworkIamH5AdminRoleController(
  input: SdkworkIamH5AdminPermissionServicePort | CreateSdkworkIamH5AdminPermissionControllerInput,
): SdkworkIamH5AdminRoleController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchRolesPage(query) {
      const page = readSdkworkIamH5Page<unknown>(await service.iam.roles.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const role = toRole(item);
          return role ? [role] : [];
        }),
      };
    },
  };
}

/**
 * Build the admin policies controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the policies screen binds to.
 */
export function createSdkworkIamH5AdminPolicyController(
  input: SdkworkIamH5AdminPermissionServicePort | CreateSdkworkIamH5AdminPermissionControllerInput,
): SdkworkIamH5AdminPolicyController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchPoliciesPage(query) {
      const page = readSdkworkIamH5Page<unknown>(
        await service.iam.policies.list(toListParams(query)),
      );
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const policy = toPolicy(item);
          return policy ? [policy] : [];
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

function toRole(value: unknown): SdkworkIamH5AdminRole | undefined {
  const record = toRecord(value);
  const id = readString(record.roleId) ?? readString(record.role_id) ?? readString(record.id);
  if (!id) return undefined;
  const name = readString(record.name) ?? readString(record.displayName);
  return {
    id,
    code: readString(record.code) ?? readString(record.roleCode) ?? id,
    ...(name === undefined ? {} : { name }),
  };
}

function toPolicy(value: unknown): SdkworkIamH5AdminPolicy | undefined {
  const record = toRecord(value);
  const id = readString(record.policyId) ?? readString(record.policy_id) ?? readString(record.id);
  if (!id) return undefined;
  const effect = readString(record.effect) ?? readString(record.effectType);
  return {
    id,
    code: readString(record.code) ?? readString(record.name) ?? id,
    ...(effect === undefined ? {} : { effect }),
  };
}
