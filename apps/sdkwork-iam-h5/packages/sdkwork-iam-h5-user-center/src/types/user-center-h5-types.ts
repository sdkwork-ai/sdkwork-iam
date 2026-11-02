/**
 * Contracts of the IAM H5 self-service user center.
 *
 * Routes: `app.iam.user-center.profile` (`/user/profile`) and
 * `app.iam.user-center.password` (`/user/password`). Both read the **app-api**
 * self-service ports only: the signed-in user's own record, its password, and the
 * tenant's verification policy. No user-directory or admin resource is reachable
 * from here.
 */

import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The signed-in user's own profile. */
export interface SdkworkIamH5UserCenterProfile {
  readonly id: string;
  readonly userId: string;
  readonly username?: string;
  readonly displayName?: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
}

/** The editable subset of the profile. */
export interface SdkworkIamH5UserCenterProfileDraft {
  readonly displayName?: string;
  readonly nickname?: string;
}

/** Password change input, as the form collects it. */
export interface SdkworkIamH5UserCenterPasswordDraft {
  readonly oldPassword: string;
  readonly newPassword: string;
  readonly confirmPassword: string;
}

/** What binding changes require in this tenant. */
export interface SdkworkIamH5UserCenterVerificationPolicy {
  readonly emailVerificationRequired?: boolean;
  readonly phoneVerificationRequired?: boolean;
}

/**
 * The self-service data port.
 *
 * Query-shaped: the screens own load state through the kit hooks, so a cache here
 * would give the same record two sources of truth.
 */
export interface SdkworkIamH5UserCenterController {
  /** Read the signed-in user's profile. */
  loadProfile(): Promise<SdkworkIamH5UserCenterProfile>;
  /** Persist the editable subset and return the server's record. */
  updateProfile(draft: SdkworkIamH5UserCenterProfileDraft): Promise<SdkworkIamH5UserCenterProfile>;
  /** Change the password; rejects when the server refuses. */
  changePassword(draft: SdkworkIamH5UserCenterPasswordDraft): Promise<void>;
  /** Read the tenant's verification requirements, when the deployment exposes them. */
  loadVerificationPolicy(): Promise<SdkworkIamH5UserCenterVerificationPolicy>;
}

/**
 * The slice of `SdkworkIamService` this capability depends on, narrowed per
 * method so a test double carries only what the screens can reach.
 */
export type SdkworkIamH5UserCenterServicePort = {
  iam: {
    users: {
      current: Pick<
        SdkworkIamService["iam"]["users"]["current"],
        "retrieve" | "update" | "password"
      >;
    };
  };
  system: {
    iam: {
      verificationPolicy: Pick<SdkworkIamService["system"]["iam"]["verificationPolicy"], "retrieve">;
    };
  };
};

/** Input of {@link createSdkworkIamH5UserCenterController}. */
export interface CreateSdkworkIamH5UserCenterControllerInput {
  service: SdkworkIamH5UserCenterServicePort;
}

/**
 * Minimum accepted password length.
 *
 * Enforced client-side only as a courtesy: the server owns the real policy, and a
 * client that accepted a shorter one would just move the failure to the network.
 */
export const SDKWORK_IAM_H5_MIN_PASSWORD_LENGTH = 8;

/**
 * Validate a password change before it reaches the server.
 * @param draft - form values.
 * @returns the first problem, in the vocabulary the screen localizes, or
 *   `undefined` when the draft is submittable.
 */
export function validateSdkworkIamH5PasswordDraft(
  draft: SdkworkIamH5UserCenterPasswordDraft,
): "confirm-mismatch" | "new-password-too-short" | "old-password-required" | undefined {
  if (draft.oldPassword.trim() === "") return "old-password-required";
  if (draft.newPassword.length < SDKWORK_IAM_H5_MIN_PASSWORD_LENGTH) return "new-password-too-short";
  if (draft.newPassword !== draft.confirmPassword) return "confirm-mismatch";
  return undefined;
}
