// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-tenant public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/TenantService';
export * from './services/TenantSdkPort';
export * from './state/TenantState';
export * from './presentation/viewModels/TenantViewModel';
export * from './presentation/controllers/TenantController';
export * from './components/TenantSummaryCard';
export * from './pages/TenantPage';
export * from './routes/RouteContributions';
export * from './host/TenantHostPort';
export * from './i18n/index';
