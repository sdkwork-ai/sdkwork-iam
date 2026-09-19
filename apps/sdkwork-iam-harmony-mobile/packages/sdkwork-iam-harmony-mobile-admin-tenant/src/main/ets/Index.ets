// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-admin-tenant public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/AdminTenantService';
export * from './services/AdminTenantSdkPort';
export * from './state/AdminTenantState';
export * from './presentation/viewModels/AdminTenantViewModel';
export * from './presentation/controllers/AdminTenantController';
export * from './components/AdminTenantSummaryCard';
export * from './pages/AdminTenantPage';
export * from './routes/RouteContributions';
export * from './host/AdminTenantHostPort';
export * from './i18n/index';
