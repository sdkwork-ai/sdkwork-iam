// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-auth public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/AuthService';
export * from './services/AuthSdkPort';
export * from './state/AuthState';
export * from './presentation/viewModels/AuthViewModel';
export * from './presentation/controllers/AuthController';
export * from './components/AuthSummaryCard';
export * from './pages/AuthPage';
export * from './routes/RouteContributions';
export * from './host/AuthHostPort';
export * from './i18n/index';
