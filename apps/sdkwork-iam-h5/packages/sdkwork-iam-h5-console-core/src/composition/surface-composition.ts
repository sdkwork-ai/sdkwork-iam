// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Dependency composition entry for the `console` surface of the
 * sdkwork-iam-h5 client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const IAMH5CONSOLE_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const IAMH5CONSOLE_PACKAGE_ENTRYPOINTS = [
  '../sdkwork-iam-h5-console-shell/src/index.ts',
  '../sdkwork-iam-h5-console-tenant/src/index.ts',
  '../sdkwork-iam-h5-console-organization/src/index.ts',
  '../sdkwork-iam-h5-console-account-binding/src/index.ts',
  '../sdkwork-iam-h5-console-user-center/src/index.ts',
] as const;

export const IAMH5CONSOLE_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
] as const;
