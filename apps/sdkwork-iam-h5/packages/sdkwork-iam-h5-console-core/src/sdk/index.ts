// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * SDK construction boundary for the sdkwork-iam-h5 client root.
 *
 * Runtime config is resolved from the checked-in public runtime document, not
 * from build-time inlined variables (APP_H5_ARCHITECTURE_SPEC §2.1). SDK clients
 * are constructed here and injected; feature packages never build their own.
 */

import { resolveBaseUrlWithAlignProtocol } from '@sdkwork/sdk-common';

export interface IamH5RuntimeEnv {
  readonly environment: string;
  readonly deploymentProfile: string;
  readonly profileId: string;
  readonly runtimeTarget: string;
  readonly browserOriginMode: string;
  readonly appKey: string;
  readonly iamIssuer: string;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly appApiBaseUrl: string;
  readonly backendApiBaseUrl: string;
  readonly driveAppApiBaseUrl: string;
  readonly appbaseAppApiBaseUrl: string;
  readonly deployAppApiBaseUrl: string;
  readonly openApiBaseUrl: string;
  readonly sdkBaseUrl: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __SDKWORK_RUNTIME_ENV__: IamH5RuntimeEnv | undefined;
}

export function readIamH5RuntimeEnv(): IamH5RuntimeEnv {
  const env = globalThis.__SDKWORK_RUNTIME_ENV__;
  if (!env) {
    throw new Error(
      'sdkwork-iam-h5: public runtime config was not loaded before SDK client construction.',
    );
  }
  return env;
}

export interface IamH5AppSdkClient {
  readonly surface: 'app-api';
  readonly baseUrl: string;
}

/**
 * Resolves the generated app SDK base origin. The protocol-adaptive alignment
 * helper from `@sdkwork/sdk-common` owns the URL composition; this factory only
 * contributes the profile-resolved origin.
 */
export function createIamH5AppSdkClient(env: IamH5RuntimeEnv): IamH5AppSdkClient {
  // `appApiBaseUrl` carries the registered API edge family, so the shared
  // §6.3 resolver — not this factory — owns member selection: it matches the
  // family against the page host, aligns the result with the page protocol
  // (http on an http page, https on an https page: the edge terminates both on
  // one host), and falls back to the primary origin for a page host that is not
  // a registered deployment host.
  const { url } = resolveBaseUrlWithAlignProtocol({
    baseUrls: env.appApiBaseUrl,
    mode: env.deploymentProfile,
  });
  return { surface: 'app-api', baseUrl: url };
}
