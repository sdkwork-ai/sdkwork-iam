// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Module registry of the `admin` core.
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

export interface IamHarmonyMobileAdminCoreModuleRegistration {
  readonly id: string;
  readonly routeIdPrefix: string;
}

export const iamHarmonyMobileAdminCoreModuleRegistrations: IamHarmonyMobileAdminCoreModuleRegistration[] = [
  { id: 'admin-oauth', routeIdPrefix: 'admin.iam.oauth.' },
  { id: 'admin-tenant', routeIdPrefix: 'admin.iam.tenant.' },
  { id: 'admin-organization', routeIdPrefix: 'admin.iam.organization.' },
  { id: 'admin-permission', routeIdPrefix: 'admin.iam.permission.' },
  { id: 'admin-account-binding', routeIdPrefix: 'admin.iam.account-binding.' },
  { id: 'admin-user', routeIdPrefix: 'admin.iam.user.' },
  { id: 'admin-audit', routeIdPrefix: 'admin.iam.audit.' },
];

export function listIamHarmonyMobileAdminCoreModules(): IamHarmonyMobileAdminCoreModuleRegistration[] {
  return iamHarmonyMobileAdminCoreModuleRegistrations;
}

export function hasIamHarmonyMobileAdminCoreModule(moduleId: string): boolean {
  return iamHarmonyMobileAdminCoreModuleRegistrations.some(
    (entry: IamHarmonyMobileAdminCoreModuleRegistration) => entry.id === moduleId,
  );
}
