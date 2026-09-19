export * from "./composition/index.js";

export {
  isSdkworkAuthLoginMethod,
  isSdkworkAuthOAuthProviderRegion,
  isSdkworkAuthRecoveryMethod,
  isSdkworkAuthRegisterMethod,
  resolveSdkworkAuthRuntimeConfigFromMetadata,
  type SdkworkAuthLoginMethod,
  type SdkworkAuthOAuthProviderRegion,
  type SdkworkAuthRecoveryMethod,
  type SdkworkAuthRegisterMethod,
  type SdkworkAuthRuntimeConfig,
  type SdkworkAuthVerificationPolicyConfig,
  type SdkworkCanonicalAuthMetadataLike,
} from "@sdkwork/iam-contracts";
export * from './modules/index.js';
export * from './sdk/index.js';
export * from './host/index.js';
export * from './session/index.js';
export * from './composition/surface-composition.js';
