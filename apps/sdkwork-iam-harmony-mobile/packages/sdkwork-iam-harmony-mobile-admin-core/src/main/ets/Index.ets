// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * @sdkwork/sdkwork-iam-harmony-mobile-admin-core public integration boundary.
 *
 * Authority: `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 4. Every subpath
 * declared in `package.json#exports` resolves through here, so a consumer
 * importing the package root sees the same surface as one importing a subpath.
 */

export * from '../../composition/index';
export * from './composition/DependencyManifest';
export * from './composition/ModuleRegistry';
export * from './composition/RouteRegistry';
export * from './composition/SdkInventory';
export * from './composition/HostRegistry';
export * from './sdk/SdkInventory';
export * from './sdk/AppSdkClient';
export * from './session/SessionStore';
export * from './host/HostAdapterContracts';
