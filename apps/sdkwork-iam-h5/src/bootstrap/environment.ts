// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamH5RuntimeEnv } from '@sdkwork/iam-h5-core';

declare global {
  // eslint-disable-next-line no-var
  var __SDKWORK_RUNTIME_ENV__: IamH5RuntimeEnv | undefined;
}

/**
 * Loads the browser-visible public runtime document before any SDK client is
 * constructed. The document is non-secret by contract.
 */
export async function loadRuntimeEnv(url = '/runtime-env.json'): Promise<IamH5RuntimeEnv> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('sdkwork-iam-h5: public runtime config request failed with ' + response.status);
  }
  const env = (await response.json()) as IamH5RuntimeEnv;
  globalThis.__SDKWORK_RUNTIME_ENV__ = env;
  return env;
}
