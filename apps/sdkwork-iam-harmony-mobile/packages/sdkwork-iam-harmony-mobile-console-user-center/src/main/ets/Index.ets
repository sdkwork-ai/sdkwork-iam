// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-console-user-center public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/ConsoleUserCenterService';
export * from './services/ConsoleUserCenterSdkPort';
export * from './state/ConsoleUserCenterState';
export * from './presentation/viewModels/ConsoleUserCenterViewModel';
export * from './presentation/controllers/ConsoleUserCenterController';
export * from './components/ConsoleUserCenterSummaryCard';
export * from './pages/ConsoleUserCenterPage';
export * from './routes/RouteContributions';
export * from './host/ConsoleUserCenterHostPort';
export * from './i18n/index';
