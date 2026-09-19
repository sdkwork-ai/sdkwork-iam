// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `app` core.
 *
 * The root bootstrap reads this registry to learn which capability modules exist
 * and which route id prefix each one owns.
 *
 * Section 5 forbids a core from depending on a capability package, so this module
 * holds static descriptors only: it must not import a capability to count its
 * routes, because that would create the ohpm cycle section 5 forbids. The
 * bootstrap, which is allowed to depend on both, resolves counts by calling the
 * capability package directly.
 */

export interface IamHarmonyMobileCoreModuleRegistration {
  readonly id: string;
  readonly routeIdPrefix: string;
}

export const iamHarmonyMobileCoreModuleRegistrations: IamHarmonyMobileCoreModuleRegistration[] = [
  { id: 'auth', routeIdPrefix: 'app.iam.auth.' },
  { id: 'user-center', routeIdPrefix: 'app.iam.user-center.' },
  { id: 'account-binding', routeIdPrefix: 'app.iam.account-binding.' },
  { id: 'user', routeIdPrefix: 'app.iam.user.' },
  { id: 'tenant', routeIdPrefix: 'app.iam.tenant.' },
  { id: 'organization', routeIdPrefix: 'app.iam.organization.' },
  { id: 'oauth', routeIdPrefix: 'app.iam.oauth.' },
];

export function listIamHarmonyMobileCoreModules(): IamHarmonyMobileCoreModuleRegistration[] {
  return iamHarmonyMobileCoreModuleRegistrations;
}

export function hasIamHarmonyMobileCoreModule(moduleId: string): boolean {
  return iamHarmonyMobileCoreModuleRegistrations.some(
    (entry: IamHarmonyMobileCoreModuleRegistration) => entry.id === moduleId,
  );
}
