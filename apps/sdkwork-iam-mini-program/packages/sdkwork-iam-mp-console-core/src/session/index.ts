// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamMpConsoleSessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamMpConsoleSessionListener = (snapshot: IamMpConsoleSessionSnapshot | undefined) => void;

export interface IamMpConsoleSessionStore {
  clear(): void;
  get(): IamMpConsoleSessionSnapshot | undefined;
  set(snapshot: IamMpConsoleSessionSnapshot): void;
  subscribe(listener: IamMpConsoleSessionListener): () => void;
}

export function createIamMpConsoleSessionStore(): IamMpConsoleSessionStore {
  let current: IamMpConsoleSessionSnapshot | undefined;
  const listeners = new Set<IamMpConsoleSessionListener>();
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
