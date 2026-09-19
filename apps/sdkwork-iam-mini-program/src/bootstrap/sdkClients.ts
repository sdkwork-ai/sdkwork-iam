// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { createIamMpAppSdkClient, readIamMpRuntimeEnv } from '@sdkwork/iam-mp-core';

export function createSdkClients() {
  return { app: createIamMpAppSdkClient(readIamMpRuntimeEnv()) };
}
