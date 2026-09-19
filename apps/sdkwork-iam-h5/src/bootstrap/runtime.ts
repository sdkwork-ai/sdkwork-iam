// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { readIamH5RuntimeEnv } from '@sdkwork/iam-h5-core';

export function describeRuntime(): { profileId: string; target: string } {
  const env = readIamH5RuntimeEnv();
  return { profileId: env.profileId, target: env.runtimeTarget };
}
