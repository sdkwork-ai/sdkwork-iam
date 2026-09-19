// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { createIamH5AppSdkClient, readIamH5RuntimeEnv } from '@sdkwork/iam-h5-core';

/** Builds the generated app SDK boundary once per bootstrap. */
export function createSdkClients() {
  return { app: createIamH5AppSdkClient(readIamH5RuntimeEnv()) };
}
