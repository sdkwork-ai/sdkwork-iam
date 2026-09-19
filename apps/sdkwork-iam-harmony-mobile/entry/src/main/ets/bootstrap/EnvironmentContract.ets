// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Runtime environment document contract of `sdkwork-iam-harmony-mobile`.
 *
 * Authority: `ENVIRONMENT_SPEC.md` sections 5.1.2 (required identity keys) and
 * 5.1.3 (native HarmonyOS materializes
 * `config/app/runtime-env.<profile-id>.json`).
 *
 * The types are re-exported from `sdkwork-iam-harmony-mobile-core` rather than redeclared here. The core
 * owns both the declaration and the validator, so a copy in the entry module could
 * only ever be a second source of truth for the same shape.
 *
 * This module exists anyway because `generated/RuntimeConfig.ets` and
 * `bootstrap/Environment.ets` both need the contract, and
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 5 forbids cyclic dependencies:
 * both reach the core through this module instead of each importing it directly.
 */
export {
  IAM_HARMONY_RUNTIME_TARGET,
  type IamHarmonyEnvironment,
  type IamHarmonyRuntimeEnvDocument,
} from '@sdkwork/sdkwork-iam-harmony-mobile-core';
