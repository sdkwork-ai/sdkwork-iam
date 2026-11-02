/**
 * Self-service controller for the IAM H5 user center.
 *
 * It normalizes the server's record into the screen's shape and nothing else: no
 * caching, no optimistic writes, no retries. A profile update returns what the
 * server stored, because the screen must show the persisted value rather than the
 * one that was typed.
 */

import type {
  CreateSdkworkIamH5UserCenterControllerInput,
  SdkworkIamH5UserCenterController,
  SdkworkIamH5UserCenterPasswordDraft,
  SdkworkIamH5UserCenterProfile,
  SdkworkIamH5UserCenterProfileDraft,
  SdkworkIamH5UserCenterServicePort,
  SdkworkIamH5UserCenterVerificationPolicy,
} from "../types/user-center-h5-types";

/**
 * Build the user-center controller.
 * @param input - the injected service port, or the bare port.
 * @returns the controller the profile and password screens bind to.
 * @throws at call time when the server returns a record without a user id, which
 *   is an unreadable answer rather than an empty profile.
 */
export function createSdkworkIamH5UserCenterController(
  input: SdkworkIamH5UserCenterServicePort | CreateSdkworkIamH5UserCenterControllerInput,
): SdkworkIamH5UserCenterController {
  const service = "service" in input ? input.service : input;
  const current = service.iam.users.current;

  return {
    async changePassword(draft: SdkworkIamH5UserCenterPasswordDraft): Promise<void> {
      await current.password.update({
        confirmPassword: draft.confirmPassword,
        newPassword: draft.newPassword,
        oldPassword: draft.oldPassword,
      });
    },
    async loadProfile(): Promise<SdkworkIamH5UserCenterProfile> {
      return requireProfile(toProfile(await current.retrieve()));
    },
    async loadVerificationPolicy(): Promise<SdkworkIamH5UserCenterVerificationPolicy> {
      // A deployment may not publish the policy at all; that is not a failure to
      // render the profile, so an absent answer reads as "no extra requirement".
      try {
        return toVerificationPolicy(await service.system.iam.verificationPolicy.retrieve());
      } catch {
        return {};
      }
    },
    async updateProfile(
      draft: SdkworkIamH5UserCenterProfileDraft,
    ): Promise<SdkworkIamH5UserCenterProfile> {
      const body: Record<string, unknown> = {};
      if (draft.displayName !== undefined) body.displayName = draft.displayName;
      if (draft.nickname !== undefined) body.nickname = draft.nickname;
      return requireProfile(toProfile(await current.update(body)));
    },
  };
}

function requireProfile(profile: SdkworkIamH5UserCenterProfile | undefined): SdkworkIamH5UserCenterProfile {
  if (!profile) {
    throw new Error("The user center returned a record without a user id.");
  }
  return profile;
}

function toProfile(value: unknown): SdkworkIamH5UserCenterProfile | undefined {
  const record = toRecord(value);
  const userId = readString(record.userId) ?? readString(record.user_id) ?? readString(record.id);
  if (!userId) return undefined;
  return {
    displayName: readString(record.displayName) ?? readString(record.display_name),
    email: readString(record.email),
    id: readString(record.id) ?? userId,
    nickname: readString(record.nickname),
    phone: readString(record.phone) ?? readString(record.phoneNumber) ?? readString(record.phone_number),
    userId,
    username: readString(record.username),
  };
}

function toVerificationPolicy(value: unknown): SdkworkIamH5UserCenterVerificationPolicy {
  const record = toRecord(value);
  return {
    emailVerificationRequired:
      readBoolean(record.emailVerificationRequired) ?? readBoolean(record.email_verification_required),
    phoneVerificationRequired:
      readBoolean(record.phoneVerificationRequired) ?? readBoolean(record.phone_verification_required),
  };
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

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  return undefined;
}
