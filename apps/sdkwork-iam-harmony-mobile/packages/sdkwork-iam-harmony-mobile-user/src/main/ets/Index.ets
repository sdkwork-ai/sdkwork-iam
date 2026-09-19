// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-user public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/UserService';
export * from './services/UserSdkPort';
export * from './state/UserState';
export * from './presentation/viewModels/UserViewModel';
export * from './presentation/controllers/UserController';
export * from './components/UserSummaryCard';
export * from './pages/UserPage';
export * from './routes/RouteContributions';
export * from './host/UserHostPort';
export * from './i18n/index';
