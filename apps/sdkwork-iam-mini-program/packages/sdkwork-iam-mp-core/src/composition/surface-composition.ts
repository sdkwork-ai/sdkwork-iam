// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Dependency composition entry for the `app` surface of the
 * sdkwork-iam-mini-program client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const IAMMP_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const IAMMP_PACKAGE_ENTRYPOINTS = [
  '../sdkwork-iam-mp-commons/src/index.ts',
  '../sdkwork-iam-mp-shell/src/index.ts',
  '../sdkwork-iam-mp-host/src/index.ts',
  '../sdkwork-iam-mp-auth/src/index.ts',
  '../sdkwork-iam-mp-user-center/src/index.ts',
  '../sdkwork-iam-mp-account-binding/src/index.ts',
  '../sdkwork-iam-mp-user/src/index.ts',
  '../sdkwork-iam-mp-tenant/src/index.ts',
  '../sdkwork-iam-mp-organization/src/index.ts',
  '../sdkwork-iam-mp-oauth/src/index.ts',
] as const;

export const IAMMP_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
] as const;
