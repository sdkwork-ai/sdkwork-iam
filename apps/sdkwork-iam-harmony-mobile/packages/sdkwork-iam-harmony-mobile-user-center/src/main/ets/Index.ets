// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-user-center public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/UserCenterService';
export * from './services/UserCenterSdkPort';
export * from './state/UserCenterState';
export * from './presentation/viewModels/UserCenterViewModel';
export * from './presentation/controllers/UserCenterController';
export * from './components/UserCenterSummaryCard';
export * from './pages/UserCenterPage';
export * from './routes/RouteContributions';
export * from './host/UserCenterHostPort';
export * from './i18n/index';
