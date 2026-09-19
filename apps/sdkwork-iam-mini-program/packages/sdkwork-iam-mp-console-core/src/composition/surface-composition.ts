// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Dependency composition entry for the `console` surface of the
 * sdkwork-iam-mini-program client root (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §3).
 */

export const IAMMPCONSOLE_COMPONENT_SPEC_PATH = '../../../../specs/component.spec.json' as const;

/** Every authored package of this surface, in dependency order. */
export const IAMMPCONSOLE_PACKAGE_ENTRYPOINTS = [
  '../sdkwork-iam-mp-console-shell/src/index.ts',
  '../sdkwork-iam-mp-console-tenant/src/index.ts',
  '../sdkwork-iam-mp-console-organization/src/index.ts',
  '../sdkwork-iam-mp-console-account-binding/src/index.ts',
  '../sdkwork-iam-mp-console-user-center/src/index.ts',
] as const;

export const IAMMPCONSOLE_SDK_DEPENDENCIES = [
  { workspace: 'sdkwork-iam-app-sdk', surface: 'app-api', credentialMode: 'authenticated-app-api' },
] as const;
