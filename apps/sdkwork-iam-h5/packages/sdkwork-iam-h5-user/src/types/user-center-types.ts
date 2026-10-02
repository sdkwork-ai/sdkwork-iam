/**
 * Type-only re-exports of the headless user-center core so H5 consumers can
 * stay on this package's public surface. Values (controller factory, theme
 * builders) are imported from `@sdkwork/iam-user-center-core` directly.
 */
export type {
  SdkworkIamUserCenterMeContextSummary,
  SdkworkIamUserCenterMeController,
  SdkworkIamUserCenterMeMenuFactory,
  SdkworkIamUserCenterMeMenuInput,
  SdkworkIamUserCenterMeMenuIntent,
  SdkworkIamUserCenterMeMenuItem,
  SdkworkIamUserCenterMeMenuSection,
  SdkworkIamUserCenterMeProfile,
  SdkworkIamUserCenterMeScreenId,
  SdkworkIamUserCenterMeState,
} from "@sdkwork/iam-user-center-core";
export { SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS } from "@sdkwork/iam-user-center-core";
export { SDKWORK_IAM_USER_CENTER_ME_SCREENS } from "@sdkwork/iam-user-center-core";
