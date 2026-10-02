/**
 * `@sdkwork/iam-user-center-core` — cross-architecture headless core for the
 * user-center "Me" page: view models, canonical menu, appearance/theme-token
 * contracts, and the page state controller over an injected
 * `SdkworkIamService`. No rendering and no SDK construction live here.
 */
export * from './types/me-view-model.js';
export * from './theme/me-theme-tokens.js';
export * from './controller/me-controller.js';
