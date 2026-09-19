// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamH5AdminSessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamH5AdminSessionListener = (snapshot: IamH5AdminSessionSnapshot | undefined) => void;

export interface IamH5AdminSessionStore {
  clear(): void;
  get(): IamH5AdminSessionSnapshot | undefined;
  set(snapshot: IamH5AdminSessionSnapshot): void;
  subscribe(listener: IamH5AdminSessionListener): () => void;
}

export function createIamH5AdminSessionStore(): IamH5AdminSessionStore {
  let current: IamH5AdminSessionSnapshot | undefined;
  const listeners = new Set<IamH5AdminSessionListener>();
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
