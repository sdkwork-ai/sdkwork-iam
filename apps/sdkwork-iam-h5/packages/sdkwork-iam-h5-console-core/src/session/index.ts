// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamH5ConsoleSessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamH5ConsoleSessionListener = (snapshot: IamH5ConsoleSessionSnapshot | undefined) => void;

export interface IamH5ConsoleSessionStore {
  clear(): void;
  get(): IamH5ConsoleSessionSnapshot | undefined;
  set(snapshot: IamH5ConsoleSessionSnapshot): void;
  subscribe(listener: IamH5ConsoleSessionListener): () => void;
}

export function createIamH5ConsoleSessionStore(): IamH5ConsoleSessionStore {
  let current: IamH5ConsoleSessionSnapshot | undefined;
  const listeners = new Set<IamH5ConsoleSessionListener>();
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
