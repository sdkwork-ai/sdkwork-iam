import { readBootstrapAccessTokenFromProcessEnv } from '@sdkwork/iam-credential-entry';

import type { IamSessionSnapshot } from '../types.ts';

/**
 * Normalizes a credential value; blank is "no credential", never an empty token.
 * @param value - candidate token.
 * @returns the trimmed token, or `undefined` when it is empty.
 */
function normalizeToken(value: string | undefined): string | undefined {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * The public application access token of the running build.
 *
 * `APP_ACCESS_TOKEN_SPEC.md` section 1: this is the credential a generated
 * transport may hold before an interactive session exists, and it must survive
 * logout because credential entry itself needs `Access-Token`. It is resolved
 * through the shared IAM bootstrap reader so a forked env read cannot drift from
 * the canonical handoff (`APP_SDK_INTEGRATION_SPEC.md` section 4).
 */
let bootstrapAccessToken: string | undefined = normalizeToken(readBootstrapAccessTokenFromProcessEnv());

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
  /**
   * The credential a transport should send: the session access token while a
   * session exists, otherwise the seeded public application access token.
   * @returns the current access token, or `undefined` when neither exists.
   */
  getAccessToken(): string | undefined;
  /**
   * Seeds or replaces the public application access token used before login and
   * after logout. It is not a session: {@link hasSession} keeps returning false.
   * @param token - the public application access token, or `undefined` to drop it.
   */
  setAccessToken(token: string | undefined): void;
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
    getAccessToken(): string | undefined {
      return normalizeToken(session?.accessToken) ?? bootstrapAccessToken;
    },
    setAccessToken(token: string | undefined): void {
      bootstrapAccessToken = normalizeToken(token);
    },
    subscribe(listener: (session: IamSessionSnapshot | null) => void): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },
  };
}
