// SDKWORK-IAM-H5-CONSOLE-TENANT: authored controller.
/**
 * Console tenant controller over the injected IAM service.
 *
 * Every method is a query: it validates what the server sent into the screen's shape
 * and hands back one page at a time. Nothing here caches, retries or re-orders — the
 * kit hooks own load state and `PAGINATION_SPEC.md` owns paging.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5ConsoleTenantControllerInput,
  SdkworkIamH5ConsoleTenantController,
  SdkworkIamH5ConsoleTenantOrganization,
  SdkworkIamH5ConsoleTenantPolicy,
  SdkworkIamH5ConsoleTenantRuntime,
  SdkworkIamH5ConsoleTenantServicePort,
} from "../types/console-tenant-types.js";

/**
 * Build the console tenant controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5ConsoleTenantController(
  input: SdkworkIamH5ConsoleTenantServicePort | CreateSdkworkIamH5ConsoleTenantControllerInput,
): SdkworkIamH5ConsoleTenantController {
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
    async loadPolicy() {
      // A deployment may not publish the policy at all; that is not a reason to fail
      // the whole workspace, so an absent answer reads as "nothing enabled".
      try {
        return toPolicy(await service.system.iam.accountBindingPolicy.retrieve());
      } catch {
        return emptyPolicy();
      }
    },
    async loadRuntime() {
      return toRuntime(await service.system.iam.runtime.retrieve());
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

function toRuntime(value: unknown): SdkworkIamH5ConsoleTenantRuntime {
  const record = toRecord(value);
  const item = toRecord(record.item);
  const source = Object.keys(item).length > 0 ? item : record;
  return {
    environment: readString(source.environment),
    tenantId: readString(source.tenantId) ?? readString(source.tenant_id),
    userId: readString(source.userId) ?? readString(source.user_id),
  };
}

function toOrganization(value: unknown): SdkworkIamH5ConsoleTenantOrganization | undefined {
  const record = toRecord(value);
  const id =
    readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
  if (!id) return undefined;
  const parentId = readString(record.parentId) ?? readString(record.parent_id);
  return {
    detail: parentId === undefined ? undefined : `${id} · ${parentId}`,
    id: readString(record.id) ?? id,
    title: readString(record.name) ?? id,
  };
}

function emptyPolicy(): SdkworkIamH5ConsoleTenantPolicy {
  return {
    contactEnabled: false,
    emailEnabled: false,
    oauthEnabled: false,
    selfServiceUnlinkEnabled: false,
  };
}

function toPolicy(value: unknown): SdkworkIamH5ConsoleTenantPolicy {
  const record = toRecord(value);
  const source = Object.keys(toRecord(record.item)).length > 0 ? toRecord(record.item) : record;
  const contact = toRecord(source.contactBinding);
  const oauth = toRecord(source.oauthBinding);
  return {
    contactEnabled: contact.enabled === true,
    emailEnabled: contact.emailEnabled === true,
    oauthEnabled: oauth.enabled === true,
    // Absent means "not granted": a policy that forgot the flag must not read as
    // permission to remove a sign-in method.
    selfServiceUnlinkEnabled:
      oauth.selfServiceLinkEnabled === true || oauth.selfServiceUnlinkEnabled === true,
  };
}
