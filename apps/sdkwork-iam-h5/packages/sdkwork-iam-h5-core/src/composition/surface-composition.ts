// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Dependency composition entry for the `app` surface of the
 * sdkwork-iam-h5 client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const IAMH5_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const IAMH5_PACKAGE_ENTRYPOINTS = [
  '../sdkwork-iam-h5-commons/src/index.ts',
  '../sdkwork-iam-h5-shell/src/index.ts',
  '../sdkwork-iam-h5-capacitor/src/index.ts',
  '../sdkwork-iam-h5-auth/src/index.ts',
  '../sdkwork-iam-h5-user-center/src/index.ts',
  '../sdkwork-iam-h5-account-binding/src/index.ts',
  '../sdkwork-iam-h5-user/src/index.ts',
  '../sdkwork-iam-h5-tenant/src/index.ts',
  '../sdkwork-iam-h5-organization/src/index.ts',
  '../sdkwork-iam-h5-oauth/src/index.ts',
] as const;

export const IAMH5_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
] as const;
