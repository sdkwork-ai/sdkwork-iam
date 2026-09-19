// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamMpSessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamMpSessionListener = (snapshot: IamMpSessionSnapshot | undefined) => void;

export interface IamMpSessionStore {
  clear(): void;
  get(): IamMpSessionSnapshot | undefined;
  set(snapshot: IamMpSessionSnapshot): void;
  subscribe(listener: IamMpSessionListener): () => void;
}

export function createIamMpSessionStore(): IamMpSessionStore {
  let current: IamMpSessionSnapshot | undefined;
  const listeners = new Set<IamMpSessionListener>();
  const emit = () => {
    for (const listener of listeners) listener(current);
  };
  return {
    clear() {
      current = undefined;
      emit();
    },
    get() {
      return current;
    },
    set(snapshot) {
      current = snapshot;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
