/**
 * Contracts of the IAM H5 account-binding surface.
 *
 * Route: `app.iam.account-binding.list` (`/user/account-binding`). Everything here
 * is app-api self-service: the caller's own linked OAuth identities
 * (`oauth.accountLinks`), their own email bindings (`iam.users.current
 * .emailBindings`) and the tenant's binding policy (`system.iam
 * .accountBindingPolicy`). No administrative binding resource is reachable.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** Which binding operations this tenant allows a user to perform themselves. */
export interface SdkworkIamH5AccountBindingPolicy {
  readonly contactBinding: {
    readonly emailChangeEnabled: boolean;
    readonly emailEnabled: boolean;
    readonly enabled: boolean;
    readonly phoneChangeEnabled: boolean;
    readonly phoneEnabled: boolean;
  };
  readonly oauthBinding: {
    readonly enabled: boolean;
    readonly selfServiceLinkEnabled: boolean;
    readonly selfServiceUnlinkEnabled: boolean;
  };
}

/** One linked third-party identity. */
export interface SdkworkIamH5OAuthAccountLink {
  readonly accountLinkId: string;
  readonly id: string;
  readonly provider?: string;
  readonly providerUserId?: string;
}

/** The data port the screen binds to. */
export interface SdkworkIamH5AccountBindingController {
  /** Bind an email after the verification-code flow completed. */
  bindEmail(body: { email: string; verificationCode: string }): Promise<unknown>;
  /** One page of the caller's linked identities. */
  fetchAccountLinksPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5OAuthAccountLink>>;
  /** Read the tenant policy that decides which actions the screen may offer. */
  loadPolicy(): Promise<SdkworkIamH5AccountBindingPolicy>;
  /** Unbind the email after re-authenticating with the password. */
  unbindEmail(body: { password: string }): Promise<unknown>;
  /** Remove one linked third-party identity. */
  unlinkAccountLink(accountLinkId: string): Promise<void>;
}

/**
 * The slice of `SdkworkIamService` this capability depends on, narrowed per
 * method so a test double carries only what the screen can reach.
 */
export type SdkworkIamH5AccountBindingServicePort = {
  iam: {
    users: {
      current: Pick<SdkworkIamService["iam"]["users"]["current"], "emailBindings">;
    };
  };
  oauth: Pick<SdkworkIamService["oauth"], "accountLinks">;
  system: {
    iam: {
      accountBindingPolicy: Pick<SdkworkIamService["system"]["iam"]["accountBindingPolicy"], "retrieve">;
    };
  };
};

/** Input of {@link createSdkworkIamH5AccountBindingController}. */
export interface CreateSdkworkIamH5AccountBindingControllerInput {
  service: SdkworkIamH5AccountBindingServicePort;
}

/** Props of {@link SdkworkIamH5AccountBindingScreen}. */
export interface SdkworkIamH5AccountBindingScreenProps {
  controller: SdkworkIamH5AccountBindingController;
  onBack?: () => void;
  title?: string;
}

/** Route constants of this capability. */
export const IAM_H5_ACCOUNT_BINDING_ROUTES = {
  moduleId: "iam-h5-account-binding",
  settingsPath: "/user/account-binding",
} as const;

/**
 * Policy applied when the deployment does not publish one.
 *
 * Contact binding is on because it is the conservative reading of "the tenant said
 * nothing"; OAuth self-service is off because linking or unlinking an identity is
 * a security-relevant action that must be granted explicitly.
 */
export const DEFAULT_H5_ACCOUNT_BINDING_POLICY: SdkworkIamH5AccountBindingPolicy = {
  contactBinding: {
    emailChangeEnabled: true,
    emailEnabled: true,
    enabled: true,
    phoneChangeEnabled: true,
    phoneEnabled: true,
  },
  oauthBinding: {
    enabled: false,
    selfServiceLinkEnabled: false,
    selfServiceUnlinkEnabled: false,
  },
};
