// SDKWORK-IAM-H5-ADMIN-ACCOUNT-BINDING: authored controller.
/**
 * Admin account-binding controller over the injected IAM service.
 *
 * The policy is read through the backend service and written back whole: a partial write
 * would let a stale field overwrite a setting the operator never saw on this screen.
 */

import type {
  CreateSdkworkIamH5AdminAccountBindingControllerInput,
  SdkworkIamH5AdminAccountBindingController,
  SdkworkIamH5AdminAccountBindingPolicy,
  SdkworkIamH5AdminAccountBindingServicePort,
} from "../types/admin-account-binding-types.js";

/**
 * Build the admin account-binding controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the settings screen binds to.
 */
export function createSdkworkIamH5AdminAccountBindingController(
  input:
    | SdkworkIamH5AdminAccountBindingServicePort
    | CreateSdkworkIamH5AdminAccountBindingControllerInput,
): SdkworkIamH5AdminAccountBindingController {
  const service = "service" in input ? input.service : input;

  return {
    async loadPolicy() {
      const response = await service.iam.accountBindingPolicy.retrieve();
      return toPolicy(response);
    },

    async savePolicy(policy) {
      await service.iam.accountBindingPolicy.update({
        contactBinding: {
          emailEnabled: policy.emailEnabled,
          enabled: policy.contactEnabled,
        },
        oauthBinding: {
          enabled: policy.oauthEnabled,
          selfServiceLinkEnabled: policy.selfServiceUnlinkEnabled,
        },
      });
    },
  };
}

/**
 * Read the policy out of whatever envelope the service returned.
 *
 * A flag the server did not report stays `false`: in a binding policy, silence must not read
 * as permission.
 */
function toPolicy(response: unknown): SdkworkIamH5AdminAccountBindingPolicy {
  const record = toRecord(toRecord(response).item ?? response);
  const contact = toRecord(record.contactBinding);
  const oauth = toRecord(record.oauthBinding);
  return {
    contactEnabled: contact.enabled === true,
    emailEnabled: contact.emailEnabled === true,
    oauthEnabled: oauth.enabled === true,
    selfServiceUnlinkEnabled:
      oauth.selfServiceLinkEnabled === true || oauth.selfServiceUnlinkEnabled === true,
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}
