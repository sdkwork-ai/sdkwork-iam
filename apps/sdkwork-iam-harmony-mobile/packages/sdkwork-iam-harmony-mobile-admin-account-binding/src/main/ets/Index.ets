// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-admin-account-binding public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/AdminAccountBindingService';
export * from './services/AdminAccountBindingSdkPort';
export * from './state/AdminAccountBindingState';
export * from './presentation/viewModels/AdminAccountBindingViewModel';
export * from './presentation/controllers/AdminAccountBindingController';
export * from './components/AdminAccountBindingSummaryCard';
export * from './pages/AdminAccountBindingPage';
export * from './routes/RouteContributions';
export * from './host/AdminAccountBindingHostPort';
export * from './i18n/index';
