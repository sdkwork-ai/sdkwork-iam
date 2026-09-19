// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

export interface IamMpAdminSessionSnapshot {
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  tenantId?: string;
  organizationId?: string;
  userId?: string;
}

export type IamMpAdminSessionListener = (snapshot: IamMpAdminSessionSnapshot | undefined) => void;

export interface IamMpAdminSessionStore {
  clear(): void;
  get(): IamMpAdminSessionSnapshot | undefined;
  set(snapshot: IamMpAdminSessionSnapshot): void;
  subscribe(listener: IamMpAdminSessionListener): () => void;
}

export function createIamMpAdminSessionStore(): IamMpAdminSessionStore {
  let current: IamMpAdminSessionSnapshot | undefined;
  const listeners = new Set<IamMpAdminSessionListener>();
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
