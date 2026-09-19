// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { readIamMpRuntimeEnv } from '@sdkwork/iam-mp-core';

export function describeRuntime(): { profileId: string; target: string } {
  const env = readIamMpRuntimeEnv();
  return { profileId: env.SDKWORK_PROFILE_ID, target: env.SDKWORK_RUNTIME_TARGET };
}
