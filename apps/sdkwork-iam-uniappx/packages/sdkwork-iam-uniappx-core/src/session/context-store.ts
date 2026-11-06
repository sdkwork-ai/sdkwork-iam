import type { IamAuthContext } from '../types.ts';

/**
 * Tenant/organization/user context store.
 *
 * The context is written only after a session is accepted and is cleared with
 * the token manager on logout, refresh failure, account switch, and tenant
 * switch. It carries no tokens or credentials.
 */
export interface IamContextStore {
  get(): IamAuthContext;
  set(next: IamAuthContext): void;
  update(patch: IamAuthContext): void;
  clear(): void;
}

const EMPTY_CONTEXT: IamAuthContext = {};

export function createIamContextStore(initial: IamAuthContext = EMPTY_CONTEXT): IamContextStore {
  let context: IamAuthContext = { ...initial };

  return {
    get: () => ({ ...context }),
    set(next: IamAuthContext): void {
      context = { ...next };
    },
    update(patch: IamAuthContext): void {
      context = { ...context, ...patch };
    },
    clear(): void {
      context = {};
    },
  };
}
