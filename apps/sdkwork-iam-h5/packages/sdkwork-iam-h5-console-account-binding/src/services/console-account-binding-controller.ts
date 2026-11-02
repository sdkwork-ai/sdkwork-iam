// SDKWORK-IAM-H5-CONSOLE-ACCOUNT-BINDING: authored controller.
/**
 * Console account-binding controller over the injected IAM service.
 *
 * Policy and links are separate queries on purpose: the policy decides whether an
 * operator may remove a binding on the user's behalf, and rendering the remove action
 * before that answer arrives would offer an action the tenant forbids.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5ConsoleAccountBindingControllerInput,
  SdkworkIamH5ConsoleAccountBindingController,
  SdkworkIamH5ConsoleAccountBindingPolicy,
  SdkworkIamH5ConsoleAccountBindingServicePort,
  SdkworkIamH5ConsoleAccountLink,
} from "../types/console-account-binding-types.js";

/**
 * Build the console account-binding controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5ConsoleAccountBindingController(
  input:
    | SdkworkIamH5ConsoleAccountBindingServicePort
    | CreateSdkworkIamH5ConsoleAccountBindingControllerInput,
): SdkworkIamH5ConsoleAccountBindingController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchLinksPage(query) {
      const page = readSdkworkIamH5Page<unknown>(
        await service.oauth.accountLinks.list(toListParams(query)),
      );
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const link = toLink(item);
          return link ? [link] : [];
        }),
      };
    },
    async loadPolicy() {
      // A deployment may not publish the policy; that is not a reason to lose the
      // links an operator came for, so an absent answer reads as "nothing granted".
      try {
        return toPolicy(await service.system.iam.accountBindingPolicy.retrieve());
      } catch {
        return emptyPolicy();
      }
    },
    async unlink(accountLinkId) {
      const id = accountLinkId.trim();
      if (id === "") {
        throw new Error("A binding to remove is required.");
      }
      await service.oauth.accountLinks.delete(id);
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

function emptyPolicy(): SdkworkIamH5ConsoleAccountBindingPolicy {
  return {
    contactEnabled: false,
    emailEnabled: false,
    oauthEnabled: false,
    selfServiceUnlinkEnabled: false,
  };
}

function toPolicy(value: unknown): SdkworkIamH5ConsoleAccountBindingPolicy {
  const record = toRecord(value);
  const item = toRecord(record.item);
  const source = Object.keys(item).length > 0 ? item : record;
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

function toLink(value: unknown): SdkworkIamH5ConsoleAccountLink | undefined {
  const record = toRecord(value);
  const accountLinkId =
    readString(record.accountLinkId) ?? readString(record.account_link_id) ?? readString(record.id);
  if (!accountLinkId) return undefined;
  const providerUserId =
    readString(record.providerUserId) ?? readString(record.provider_user_id);
  return {
    accountLinkId,
    provider: readString(record.provider) ?? readString(record.providerKey) ?? accountLinkId,
    ...(providerUserId === undefined ? {} : { providerUserId }),
  };
}
