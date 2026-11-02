/**
 * Contracts of the IAM H5 third-party sign-in surface.
 *
 * Route: `app.iam.oauth.providers` (`/oauth/providers`). Reads the app-api OAuth
 * provider catalog and can mint an authorization URL for one provider; nothing
 * here administers a provider — that is the admin tier's job.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** One provider a user can sign in with. */
export interface SdkworkIamH5OAuthProvider {
  /** Server code, e.g. `wechat` or `github`. */
  readonly code: string;
  /** Localized display name when the server publishes one. */
  readonly displayName?: string;
  /** Whether the provider is currently offered. */
  readonly enabled?: boolean;
}

/** The data port the screen binds to. */
export interface SdkworkIamH5OAuthProviderController {
  /** Mint the authorization URL the host navigates to. */
  createAuthorizationUrl(providerCode: string): Promise<string>;
  /** One page of the provider catalog. */
  fetchProvidersPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5OAuthProvider>>;
}

/**
 * The slice of `SdkworkIamService` this capability depends on.
 */
export type SdkworkIamH5OAuthProviderServicePort = {
  oauth: Pick<SdkworkIamService["oauth"], "authorizationUrls" | "providers">;
};

/** Input of {@link createSdkworkIamH5OAuthProviderController}. */
export interface CreateSdkworkIamH5OAuthProviderControllerInput {
  service: SdkworkIamH5OAuthProviderServicePort;
}

/** Props of {@link SdkworkIamH5OAuthProviderScreen}. */
export interface SdkworkIamH5OAuthProviderScreenProps {
  controller: SdkworkIamH5OAuthProviderController;
  /**
   * Performs the navigation for a minted URL.
   *
   * Injected rather than `window.location.assign` inside the screen so the host
   * decides (browser, Capacitor in-app browser, native deep link) and a test can
   * assert the URL without leaving the document.
   */
  onAuthorize: (authorizationUrl: string, provider: SdkworkIamH5OAuthProvider) => void;
  onBack?: () => void;
  title?: string;
}

/** Route constants of this capability. */
export const IAM_H5_OAUTH_PROVIDER_ROUTES = {
  moduleId: "iam-h5-oauth",
  providersPath: "/oauth/providers",
} as const;
