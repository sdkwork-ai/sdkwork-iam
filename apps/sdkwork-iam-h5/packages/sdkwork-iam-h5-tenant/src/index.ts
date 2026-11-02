// SDKWORK-IAM-H5-TENANT: authored surface barrel.
/**
 * Public surface of `@sdkwork/iam-h5-tenant`.
 *
 * The route contribution stays generated (route identity is model-owned); the
 * controller, the screen, its types and its catalog are authored here.
 */

export * from "./routes/route-contribution.js";
export * from "./i18n/index.js";
export * from "./types/tenant-h5-types.js";
export { createSdkworkIamH5TenantController } from "./services/tenant-h5-controller.js";
export { SdkworkIamH5TenantOverviewScreen } from "./pages/TenantOverviewScreen.js";
export type { SdkworkIamH5TenantOverviewScreenProps } from "./pages/TenantOverviewScreen.js";
