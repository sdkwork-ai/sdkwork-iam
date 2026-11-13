import type { SdkworkIamService } from "@sdkwork/iam-service";

export interface SdkworkIamContactBindingPolicy {
  enabled: boolean;
  emailEnabled: boolean;
  phoneEnabled: boolean;
  emailChangeEnabled: boolean;
  phoneChangeEnabled: boolean;
  emailUnbindEnabled: boolean;
  phoneUnbindEnabled: boolean;
  requireVerification: boolean;
}

export interface SdkworkIamOauthLoginPhoneAssociationPolicy {
  /** Allow the provider phone to associate an external identity with an
   * existing IAM account. */
  enabled: boolean;
  /** Link (and sign in) directly when the provider asserts a verified phone
   * that already owns an account. Off means the person proves ownership with a
   * verification code first. */
  autoLinkVerifiedPhone: boolean;
  /** Require a phone-binding step for OAuth identities that carry no trusted
   * phone, so every account ends up with a verified phone. */
  requirePhoneBinding: boolean;
}

export interface SdkworkIamOauthLoginPolicy {
  allowedProviders: readonly string[];
  autoRegistrationEnabled: boolean;
  enabled: boolean;
  phoneAssociation: SdkworkIamOauthLoginPhoneAssociationPolicy;
}

export interface SdkworkIamOauthBindingPolicy {
  allowedProviders: readonly string[];
  enabled: boolean;
  selfServiceLinkEnabled: boolean;
  selfServiceUnlinkEnabled: boolean;
}

export interface SdkworkIamAccountBindingPolicy {
  contactBinding: SdkworkIamContactBindingPolicy;
  oauthLogin: SdkworkIamOauthLoginPolicy;
  oauthBinding: SdkworkIamOauthBindingPolicy;
}

export interface SdkworkIamAccountBindingPolicyState {
  policy: SdkworkIamAccountBindingPolicy;
  status: "idle" | "loading" | "ready" | "saving" | "error";
  lastError?: string;
}

export interface CreateSdkworkIamAccountBindingControllerInput {
  service: SdkworkIamService;
}

export interface SdkworkIamAccountBindingController {
  getState(): SdkworkIamAccountBindingPolicyState;
  load(): Promise<SdkworkIamAccountBindingPolicy>;
  save(policy: SdkworkIamAccountBindingPolicy): Promise<SdkworkIamAccountBindingPolicy>;
}

export interface SdkworkIamAccountBindingSettingsProps {
  controller: SdkworkIamAccountBindingController;
  /** Absent defaults to true: callers that do not model permissions keep the
   * current behavior, and the server still enforces the update permission. */
  canUpdate?: boolean;
}

export const DEFAULT_ACCOUNT_BINDING_POLICY: SdkworkIamAccountBindingPolicy = {
  contactBinding: {
    enabled: true,
    emailEnabled: true,
    phoneEnabled: true,
    emailChangeEnabled: true,
    phoneChangeEnabled: true,
    emailUnbindEnabled: false,
    phoneUnbindEnabled: false,
    requireVerification: true,
  },
  oauthLogin: {
    allowedProviders: [],
    autoRegistrationEnabled: true,
    enabled: false,
    phoneAssociation: {
      enabled: false,
      autoLinkVerifiedPhone: true,
      requirePhoneBinding: false,
    },
  },
  oauthBinding: {
    allowedProviders: [],
    enabled: false,
    selfServiceLinkEnabled: false,
    selfServiceUnlinkEnabled: false,
  },
};
