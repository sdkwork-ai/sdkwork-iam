// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { createIamH5SessionStore } from '@sdkwork/iam-h5-core';

/**
 * IAM runtime wiring. Appbase IAM owns login, session, refresh, logout and
 * token propagation; this module only binds the shared stores.
 */
export function createIamRuntime() {
  const sessionStore = createIamH5SessionStore();
  return {
    sessionStore,
    clear: () => sessionStore.clear(),
  };
}
