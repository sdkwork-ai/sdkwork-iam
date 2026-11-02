/**
 * Third-party sign-in provider controller.
 *
 * Two operations, both app-api: read the provider catalog, and mint the
 * authorization URL for one provider. The URL is returned to the caller rather
 * than navigated here — a controller that changed the document location could not
 * be tested, and the host owns the navigation.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery, type SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5OAuthProviderControllerInput,
  SdkworkIamH5OAuthProvider,
  SdkworkIamH5OAuthProviderController,
  SdkworkIamH5OAuthProviderServicePort,
} from "../types/oauth-h5-types";

/**
 * Build the provider controller.
 * @param input - the injected service port, or the bare port.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5OAuthProviderController(
  input: SdkworkIamH5OAuthProviderServicePort | CreateSdkworkIamH5OAuthProviderControllerInput,
): SdkworkIamH5OAuthProviderController {
  const service = "service" in input ? input.service : input;
  return {
    async createAuthorizationUrl(providerCode: string): Promise<string> {
      const code = providerCode.trim();
      if (!code) {
        throw new Error("providerCode is required");
      }
      const url = readAuthorizationUrl(await service.oauth.authorizationUrls.create({ provider: code }));
      if (!url) {
        throw new Error("The authorization endpoint returned no URL.");
      }
      return url;
    },
    async fetchProvidersPage(
      query: SdkworkIamH5ListQuery,
    ): Promise<SdkworkIamH5Page<SdkworkIamH5OAuthProvider>> {
      const page = readSdkworkIamH5Page<unknown>(await service.oauth.providers.list(toListParams(query)));
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const provider = toProvider(item);
          return provider ? [provider] : [];
        }),
      };
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

/**
 * Read the URL out of whichever envelope the endpoint answered with.
 *
 * The contract names it `authorizationUrl`, but a provider shim answers
 * `url`/`redirectUrl`; accepting the three spellings here keeps the screen from
 * failing on a deployment detail it cannot control.
 */
function readAuthorizationUrl(value: unknown): string | undefined {
  const record = value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return (
    readString(record.authorizationUrl) ??
    readString(record.authorization_url) ??
    readString(record.url) ??
    readString(record.redirectUrl)
  );
}

function toProvider(value: unknown): SdkworkIamH5OAuthProvider | undefined {
  const record = value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const code =
    readString(record.provider) ?? readString(record.providerCode) ?? readString(record.code);
  if (!code) return undefined;
  const enabled = record.enabled;
  return {
    code,
    displayName: readString(record.displayName) ?? readString(record.display_name) ?? readString(record.name),
    ...(typeof enabled === "boolean" ? { enabled } : {}),
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
