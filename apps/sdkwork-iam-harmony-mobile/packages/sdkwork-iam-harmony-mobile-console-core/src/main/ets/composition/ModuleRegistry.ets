// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `console` core.
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

export interface IamHarmonyMobileConsoleCoreModuleRegistration {
  readonly id: string;
  readonly routeIdPrefix: string;
}

export const iamHarmonyMobileConsoleCoreModuleRegistrations: IamHarmonyMobileConsoleCoreModuleRegistration[] = [
  { id: 'console-tenant', routeIdPrefix: 'console.iam.tenant.' },
  { id: 'console-organization', routeIdPrefix: 'console.iam.organization.' },
  { id: 'console-account-binding', routeIdPrefix: 'console.iam.account-binding.' },
  { id: 'console-user-center', routeIdPrefix: 'console.iam.user-center.' },
];

export function listIamHarmonyMobileConsoleCoreModules(): IamHarmonyMobileConsoleCoreModuleRegistration[] {
  return iamHarmonyMobileConsoleCoreModuleRegistrations;
}

export function hasIamHarmonyMobileConsoleCoreModule(moduleId: string): boolean {
  return iamHarmonyMobileConsoleCoreModuleRegistrations.some(
    (entry: IamHarmonyMobileConsoleCoreModuleRegistration) => entry.id === moduleId,
  );
}
