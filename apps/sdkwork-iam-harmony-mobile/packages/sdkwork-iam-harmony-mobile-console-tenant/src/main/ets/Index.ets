// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-console-tenant public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/ConsoleTenantService';
export * from './services/ConsoleTenantSdkPort';
export * from './state/ConsoleTenantState';
export * from './presentation/viewModels/ConsoleTenantViewModel';
export * from './presentation/controllers/ConsoleTenantController';
export * from './components/ConsoleTenantSummaryCard';
export * from './pages/ConsoleTenantPage';
export * from './routes/RouteContributions';
export * from './host/ConsoleTenantHostPort';
export * from './i18n/index';
