// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { createIamMpSessionStore } from '@sdkwork/iam-mp-core';

export function createIamRuntime() {
  const sessionStore = createIamMpSessionStore();
  return { sessionStore, clear: () => sessionStore.clear() };
}
