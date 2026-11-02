// SDKWORK-IAM-H5-CONSOLE-USER-CENTER: authored controller.
/**
 * Console user-center controller over the injected IAM service.
 *
 * Two independent reads: the caller's record and the tenant's verification policy. The
 * policy is deliberately tolerant — a deployment that publishes none still renders the
 * account, because the account is why the operator opened the screen.
 */

import type {
  CreateSdkworkIamH5ConsoleUserCenterControllerInput,
  SdkworkIamH5ConsoleUserAccount,
  SdkworkIamH5ConsoleUserCenterController,
  SdkworkIamH5ConsoleUserCenterServicePort,
  SdkworkIamH5ConsoleUserVerificationPolicy,
} from "../types/console-user-center-types.js";

/**
 * Build the console user-center controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5ConsoleUserCenterController(
  input: SdkworkIamH5ConsoleUserCenterServicePort | CreateSdkworkIamH5ConsoleUserCenterControllerInput,
): SdkworkIamH5ConsoleUserCenterController {
  const service = "service" in input ? input.service : input;

  return {
    async loadAccount() {
      return toAccount(await service.iam.users.current.retrieve());
    },
    async loadVerificationPolicy() {
      try {
        return toVerificationPolicy(await service.system.iam.verificationPolicy.retrieve());
      } catch {
        return { contactRequired: false, emailRequired: false, oauthRequired: false };
      }
    },
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

function toAccount(value: unknown): SdkworkIamH5ConsoleUserAccount {
  const record = toRecord(value);
  const item = toRecord(record.item);
  const source = Object.keys(item).length > 0 ? item : record;
  const account: { -readonly [K in keyof SdkworkIamH5ConsoleUserAccount]: SdkworkIamH5ConsoleUserAccount[K] } = {};
  const userId = readString(source.userId) ?? readString(source.user_id) ?? readString(source.id);
  const displayName = readString(source.displayName) ?? readString(source.display_name);
  const email = readString(source.email);
  const phone = readString(source.phone);
  if (userId !== undefined) account.userId = userId;
  if (displayName !== undefined) account.displayName = displayName;
  if (email !== undefined) account.email = email;
  if (phone !== undefined) account.phone = phone;
  return account;
}

function toVerificationPolicy(value: unknown): SdkworkIamH5ConsoleUserVerificationPolicy {
  const record = toRecord(value);
  const item = toRecord(record.item);
  const source = Object.keys(item).length > 0 ? item : record;
  const contact = toRecord(source.contactVerification);
  const email = toRecord(source.emailVerification);
  const oauth = toRecord(source.oauthVerification);
  return {
    contactRequired: contact.required === true || source.contactRequired === true,
    emailRequired: email.required === true || source.emailRequired === true,
    oauthRequired: oauth.required === true || source.oauthRequired === true,
  };
}
