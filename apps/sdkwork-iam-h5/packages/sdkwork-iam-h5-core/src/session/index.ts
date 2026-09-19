// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamH5SessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamH5SessionListener = (snapshot: IamH5SessionSnapshot | undefined) => void;

export interface IamH5SessionStore {
  clear(): void;
  get(): IamH5SessionSnapshot | undefined;
  set(snapshot: IamH5SessionSnapshot): void;
  subscribe(listener: IamH5SessionListener): () => void;
}

export function createIamH5SessionStore(): IamH5SessionStore {
  let current: IamH5SessionSnapshot | undefined;
  const listeners = new Set<IamH5SessionListener>();
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
