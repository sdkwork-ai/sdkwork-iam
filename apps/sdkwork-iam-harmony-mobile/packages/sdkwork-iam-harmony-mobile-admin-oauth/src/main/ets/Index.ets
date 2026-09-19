// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-admin-oauth public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/AdminOauthService';
export * from './services/AdminOauthSdkPort';
export * from './state/AdminOauthState';
export * from './presentation/viewModels/AdminOauthViewModel';
export * from './presentation/controllers/AdminOauthController';
export * from './components/AdminOauthSummaryCard';
export * from './pages/AdminOauthPage';
export * from './routes/RouteContributions';
export * from './host/AdminOauthHostPort';
export * from './i18n/index';
