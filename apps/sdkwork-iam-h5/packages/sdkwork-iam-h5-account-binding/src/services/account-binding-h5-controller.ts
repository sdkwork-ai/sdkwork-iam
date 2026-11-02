/**
 * Account-binding controller.
 *
 * Query-shaped like the other H5 capability controllers: the screen owns load
 * state through the kit hooks, so a cached copy here would give the same list two
 * sources of truth. Policy normalization is the one place that has to *default*
 * rather than propagate absence — a deployment that publishes no policy still has
 * to render a screen, and the defaults are the conservative reading (see
 * `DEFAULT_H5_ACCOUNT_BINDING_POLICY`).
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery, type SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5AccountBindingControllerInput,
  SdkworkIamH5AccountBindingController,
  SdkworkIamH5AccountBindingPolicy,
  SdkworkIamH5AccountBindingServicePort,
  SdkworkIamH5OAuthAccountLink,
} from "../types/account-binding-h5-types";
import { DEFAULT_H5_ACCOUNT_BINDING_POLICY as defaultPolicy } from "../types/account-binding-h5-types";

/**
 * Build the account-binding controller.
 * @param input - the injected service port, or the bare port.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5AccountBindingController(
  input: SdkworkIamH5AccountBindingServicePort | CreateSdkworkIamH5AccountBindingControllerInput,
): SdkworkIamH5AccountBindingController {
  const service = "service" in input ? input.service : input;

  return {
    async bindEmail(body) {
      return service.iam.users.current.emailBindings.create({
        email: body.email.trim(),
        verificationCode: body.verificationCode.trim(),
      });
    },
    async fetchAccountLinksPage(
      query: SdkworkIamH5ListQuery,
    ): Promise<SdkworkIamH5Page<SdkworkIamH5OAuthAccountLink>> {
      const page = readSdkworkIamH5Page<unknown>(await service.oauth.accountLinks.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const link = toAccountLink(item);
          return link ? [link] : [];
        }),
      };
    },
    async loadPolicy() {
      return normalizePolicy(await service.system.iam.accountBindingPolicy.retrieve());
    },
    async unbindEmail(body) {
      return service.iam.users.current.emailBindings.delete({ password: body.password });
    },
    async unlinkAccountLink(accountLinkId) {
      const id = accountLinkId.trim();
      if (!id) {
        throw new Error("accountLinkId is required");
      }
      await service.oauth.accountLinks.delete(id);
    },
  };
}

function toListParams(query: SdkworkIamH5ListQuery): Record<string, unknown> {
  const q = query.q?.trim();
  return {
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.page !== undefined ? { page: query.page } : {}),
    ...(query.page_size !== undefined ? { page_size: query.page_size } : {}),
    ...(q ? { q } : {}),
  };
}

function normalizePolicy(value: unknown): SdkworkIamH5AccountBindingPolicy {
  const record = toRecord(value);
  const contactBinding = toRecord(record.contactBinding ?? record.contact_binding);
  const oauthBinding = toRecord(record.oauthBinding ?? record.oauth_binding);
  return {
    contactBinding: {
      emailChangeEnabled: readBoolean(
        contactBinding.emailChangeEnabled ?? contactBinding.email_change_enabled,
        defaultPolicy.contactBinding.emailChangeEnabled,
      ),
      emailEnabled: readBoolean(
        contactBinding.emailEnabled ?? contactBinding.email_enabled,
        defaultPolicy.contactBinding.emailEnabled,
      ),
      enabled: readBoolean(contactBinding.enabled, defaultPolicy.contactBinding.enabled),
      phoneChangeEnabled: readBoolean(
        contactBinding.phoneChangeEnabled ?? contactBinding.phone_change_enabled,
        defaultPolicy.contactBinding.phoneChangeEnabled,
      ),
      phoneEnabled: readBoolean(
        contactBinding.phoneEnabled ?? contactBinding.phone_enabled,
        defaultPolicy.contactBinding.phoneEnabled,
      ),
    },
    oauthBinding: {
      enabled: readBoolean(oauthBinding.enabled, defaultPolicy.oauthBinding.enabled),
      selfServiceLinkEnabled: readBoolean(
        oauthBinding.selfServiceLinkEnabled ?? oauthBinding.self_service_link_enabled,
        defaultPolicy.oauthBinding.selfServiceLinkEnabled,
      ),
      selfServiceUnlinkEnabled: readBoolean(
        oauthBinding.selfServiceUnlinkEnabled ?? oauthBinding.self_service_unlink_enabled,
        defaultPolicy.oauthBinding.selfServiceUnlinkEnabled,
      ),
    },
  };
}

function toAccountLink(value: unknown): SdkworkIamH5OAuthAccountLink | undefined {
  const record = toRecord(value);
  const accountLinkId =
    readString(record.accountLinkId) ?? readString(record.account_link_id) ?? readString(record.id);
  if (!accountLinkId) return undefined;
  return {
    accountLinkId,
    id: readString(record.id) ?? accountLinkId,
    provider: readString(record.provider),
    providerUserId: readString(record.providerUserId) ?? readString(record.provider_user_id),
  };
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return fallback;
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
