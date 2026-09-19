// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Dependency composition entry for the `admin` surface of the
 * sdkwork-iam-mini-program client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const IAMMPADMIN_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const IAMMPADMIN_PACKAGE_ENTRYPOINTS = [

] as const;

export const IAMMPADMIN_BACKEND_ADMIN_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-backend-sdk', surface: 'backend-api', credentialMode: 'authenticated-backend-admin' },
] as const;
