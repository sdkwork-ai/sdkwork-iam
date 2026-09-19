// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * HarmonyOS runtime environment resolution.
 *
 * Authority: `ENVIRONMENT_SPEC.md` sections 5.1.2, 5.1.3 and 5.1.4.2. The HAP
 * packages all ten non-secret runtime documents; this module selects one and hands
 * it to the core's validator.
 *
 * Selection is by value rather than by build-time code generation: one artifact can
 * then be validated against every profile, and an unknown profile id fails loudly
 * instead of silently falling back to development endpoints in a production build.
 *
 * This module reads no file and no `process.env`: the ten documents are projected
 * into `generated/RuntimeConfig.ets`, and selection happens here.
 */
import { createIamHarmonyEnvironment } from '@sdkwork/sdkwork-iam-harmony-mobile-core';

import {
  IAM_HARMONY_DEFAULT_PROFILE_ID,
  IAM_HARMONY_RUNTIME_ENV_DOCUMENTS,
} from '../generated/RuntimeConfig';
import {
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
} from './EnvironmentContract';

export {
  IAM_HARMONY_DEFAULT_PROFILE_ID,
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
};

/** Lists the profile ids packaged into this build, in stable order. */
export function listIamHarmonyProfileIds(): string[] {
  return IAM_HARMONY_RUNTIME_ENV_DOCUMENTS.map(
    (document: IamHarmonyRuntimeEnvDocument) => document.profileId,
  );
}

/** Selects a tracked runtime document, or fails naming the packaged profiles. */
export function selectIamHarmonyRuntimeEnvDocument(
  profileId: string = IAM_HARMONY_DEFAULT_PROFILE_ID,
): IamHarmonyRuntimeEnvDocument {
  const requested: string = profileId.trim();
  if (requested.length === 0) {
    throw new Error('Harmony runtime config requires a profile id');
  }
  const found: IamHarmonyRuntimeEnvDocument | undefined = IAM_HARMONY_RUNTIME_ENV_DOCUMENTS.find(
    (document: IamHarmonyRuntimeEnvDocument) => document.profileId === requested,
  );
  if (found === undefined) {
    throw new Error(
      'Harmony runtime config has no profile ' + requested
      + '; packaged profiles: ' + listIamHarmonyProfileIds().join(', '),
    );
  }
  return found;
}

/** Selects and validates in one step. */
export function resolveIamHarmonyEnvironment(
  profileId: string = IAM_HARMONY_DEFAULT_PROFILE_ID,
): IamHarmonyEnvironment {
  return createIamHarmonyEnvironment(selectIamHarmonyRuntimeEnvDocument(profileId));
}
