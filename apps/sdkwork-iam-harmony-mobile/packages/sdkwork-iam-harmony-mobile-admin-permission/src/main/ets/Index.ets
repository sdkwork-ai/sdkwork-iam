// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-admin-permission public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/AdminPermissionService';
export * from './services/AdminPermissionSdkPort';
export * from './state/AdminPermissionState';
export * from './presentation/viewModels/AdminPermissionViewModel';
export * from './presentation/controllers/AdminPermissionController';
export * from './components/AdminPermissionSummaryCard';
export * from './pages/AdminPermissionPage';
export * from './routes/RouteContributions';
export * from './host/AdminPermissionHostPort';
export * from './i18n/index';
