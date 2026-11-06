import type { IamSessionSnapshot } from '../types.ts';

/**
 * One global token manager per authenticated session context.
 *
 * Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §9. The same instance is shared
 * by the appbase IAM runtime, every authenticated app-api SDK client, and any
 * approved `backend-admin` client. Clearing the manager is the only supported
 * way to drop a session; listeners let storage/session bridges clear in step.
 */
export interface IamTokenManager {
  getSession(): IamSessionSnapshot | null;
  hasSession(): boolean;
  setSession(next: IamSessionSnapshot): void;
  clear(): void;
  subscribe(listener: (session: IamSessionSnapshot | null) => void): () => void;
}

export function createIamTokenManager(
  initial: IamSessionSnapshot | null = null,
): IamTokenManager {
  let session: IamSessionSnapshot | null = initial;
  const listeners = new Set<(session: IamSessionSnapshot | null) => void>();

  const notify = (): void => {
    for (const listener of [...listeners]) {
      listener(session);
    }
  };

  return {
    getSession: () => session,
    hasSession: () => session !== null,
    setSession(next: IamSessionSnapshot): void {
      session = next;
      notify();
    },
    clear(): void {
      if (session === null) return;
      session = null;
      notify();
    },
    subscribe(listener: (session: IamSessionSnapshot | null) => void): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}
