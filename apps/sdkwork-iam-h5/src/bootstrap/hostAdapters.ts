// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { createIamH5FallbackHostAdapter, type IamH5HostAdapter } from '@sdkwork/iam-h5-core';

/**
 * Browser fallback host. Capacitor host implementations replace it in the
 * `sdkwork-iam-h5-capacitor` package without touching feature code.
 */
export function createHostAdapters(): IamH5HostAdapter {
  return createIamH5FallbackHostAdapter();
}
