// SDKWORK-IAM-H5-USER-CENTER: authored barrel.
/**
 * Public surface of `@sdkwork/iam-h5-user-center`.
 *
 * The route contribution stays generated (route identity is model-owned); the
 * controller, screens, types and catalog are authored here.
 */

export * from "./routes/route-contribution.js";
export * from "./i18n/index.js";
export * from "./types/user-center-h5-types.js";
export { createSdkworkIamH5UserCenterController } from "./services/user-center-h5-controller.js";
export { SdkworkIamH5UserCenterPasswordScreen } from "./pages/UserCenterPasswordScreen.js";
export type { SdkworkIamH5UserCenterPasswordScreenProps } from "./pages/UserCenterPasswordScreen.js";
export { SdkworkIamH5UserCenterProfileScreen } from "./pages/UserCenterProfileScreen.js";
export type { SdkworkIamH5UserCenterProfileScreenProps } from "./pages/UserCenterProfileScreen.js";
