// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-console-organization public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from './models/Models';
export * from './services/ConsoleOrganizationService';
export * from './services/ConsoleOrganizationSdkPort';
export * from './state/ConsoleOrganizationState';
export * from './presentation/viewModels/ConsoleOrganizationViewModel';
export * from './presentation/controllers/ConsoleOrganizationController';
export * from './components/ConsoleOrganizationSummaryCard';
export * from './pages/ConsoleOrganizationPage';
export * from './routes/RouteContributions';
export * from './host/ConsoleOrganizationHostPort';
export * from './i18n/index';
