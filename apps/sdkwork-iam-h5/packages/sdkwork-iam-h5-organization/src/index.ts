// SDKWORK-IAM-H5-ORGANIZATION: authored barrel.
/**
 * Public surface of `@sdkwork/iam-h5-organization`.
 *
 * The route contribution stays generated (route identity is model-owned); the
 * controller, screen, types and catalog are authored here.
 */

export * from "./routes/route-contribution.js";
export * from "./i18n/index.js";
export * from "./types/organization-h5-types.js";
export { createSdkworkIamH5OrganizationController } from "./services/organization-h5-controller.js";
export { SdkworkIamH5OrganizationDirectoryScreen } from "./pages/OrganizationDirectoryScreen.js";
export type { SdkworkIamH5OrganizationDirectoryScreenProps } from "./pages/OrganizationDirectoryScreen.js";
