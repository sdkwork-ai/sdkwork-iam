// SDKWORK-IAM-H5-OAUTH: authored barrel.
/**
 * Public surface of `@sdkwork/iam-h5-oauth`.
 *
 * The route contribution stays generated (route identity is model-owned); the
 * controller, screen, types and catalog are authored here.
 */

export * from "./routes/route-contribution.js";
export * from "./i18n/index.js";
export * from "./types/oauth-h5-types.js";
export { createSdkworkIamH5OAuthProviderController } from "./services/oauth-h5-controller.js";
export { SdkworkIamH5OAuthProviderScreen } from "./pages/OAuthProviderScreen.js";
