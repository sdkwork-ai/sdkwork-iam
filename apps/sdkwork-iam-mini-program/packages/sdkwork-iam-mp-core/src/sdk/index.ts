// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * SDK construction boundary for the sdkwork-iam-mini-program client root.
 *
 * Runtime config is resolved from the checked-in public runtime document, not
 * from build-time inlined variables (APP_H5_ARCHITECTURE_SPEC §2.1). SDK clients
 * are constructed here and injected; feature packages never build their own.
 */

export interface IamMpRuntimeEnv {
  SDKWORK_ENVIRONMENT: string;
  SDKWORK_DEPLOYMENT_PROFILE: string;
  SDKWORK_PROFILE_ID: string;
  SDKWORK_RUNTIME_TARGET: string;
  SDKWORK_APP_ID: string;
  SDKWORK_API_BASE_URL: string;
  SDKWORK_APP_API_BASE_URL: string;
  SDKWORK_OPEN_API_BASE_URL: string;
  SDKWORK_IAM_ISSUER: string;
  SDKWORK_FEATURE_APP_SURFACE: boolean;
  SDKWORK_FEATURE_CONSOLE_SURFACE: boolean;
  SDKWORK_FEATURE_ADMIN_SURFACE: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __SDKWORK_RUNTIME_ENV__: IamMpRuntimeEnv | undefined;
}

export function readIamMpRuntimeEnv(): IamMpRuntimeEnv {
  const env = globalThis.__SDKWORK_RUNTIME_ENV__;
  if (!env) {
    throw new Error(
      'sdkwork-iam-mini-program: public runtime config was not loaded before SDK client construction.',
    );
  }
  return env;
}

export interface IamMpAppSdkClient {
  readonly surface: 'app-api';
  readonly baseUrl: string;
}

/**
 * Resolves the generated app SDK base origin. The protocol-adaptive alignment
 * helper from `@sdkwork/sdk-common` owns the URL composition; this factory only
 * contributes the profile-resolved origin.
 */
export function createIamMpAppSdkClient(env: IamMpRuntimeEnv): IamMpAppSdkClient {
  return { surface: 'app-api', baseUrl: env.SDKWORK_APP_API_BASE_URL };
}
