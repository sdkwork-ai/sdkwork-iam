import type {
  IamAppSdkAuthPort,
  IamAuthStatus,
  IamContextStore,
  IamLoginInput,
  IamSensitiveClearReason,
  IamSessionSnapshot,
  IamSwitchAccountInput,
  IamSwitchTenantInput,
  IamTokenManager,
} from '@sdkwork/iam-uniappx-core';

import type { IamAuthFailure, IamAuthState } from '../types.ts';

export interface IamAuthSessionDeps {
  gateway: IamAppSdkAuthPort;
  tokenManager: IamTokenManager;
  contextStore: IamContextStore;
  /** Called after sensitive state is dropped; storage/realtime bridges clear here. */
  onSensitiveStateCleared?: (reason: IamSensitiveClearReason) => void;
}

export interface IamAuthSessionMachine {
  getState(): IamAuthState;
  subscribe(listener: (state: IamAuthState) => void): () => void;
  restore(): Promise<IamAuthState>;
  login(input: IamLoginInput): Promise<IamAuthState>;
  refresh(): Promise<IamAuthState>;
  logout(): Promise<IamAuthState>;
  switchTenant(input: IamSwitchTenantInput): Promise<IamAuthState>;
  switchAccount(input: IamSwitchAccountInput): Promise<IamAuthState>;
}

function describeAuthError(error: unknown): IamAuthFailure {
  if (error !== null && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    const message = (error as { message?: unknown }).message;
    if (typeof code === 'string') {
      const known: string[] = [
        'invalid-credentials',
        'session-expired',
        'network',
        'unsupported',
        'unknown',
      ];
      const normalized = known.includes(code) ? code : 'unknown';
      return {
        code: normalized as IamAuthFailure['code'],
        message: typeof message === 'string' && message.trim() ? message : normalized,
      };
    }
    if (typeof message === 'string' && message.trim()) {
      return { code: 'unknown', message };
    }
  }
  return { code: 'unknown', message: 'IAM authentication failed.' };
}

export function createIamAuthSessionMachine(deps: IamAuthSessionDeps): IamAuthSessionMachine {
  const listeners = new Set<(state: IamAuthState) => void>();
  let state: IamAuthState = {
    status: 'signed-out',
    session: null,
    error: null,
    generation: 0,
  };

  const emit = (): void => {
    for (const listener of [...listeners]) {
      listener(state);
    }
  };

  const setStatus = (status: IamAuthStatus): void => {
    state = { ...state, status };
    emit();
  };

  const markCleared = (reason: IamSensitiveClearReason): void => {
    deps.tokenManager.clear();
    deps.contextStore.clear();
    deps.onSensitiveStateCleared?.(reason);
    state = {
      ...state,
      status: 'signed-out',
      session: null,
      error: null,
      generation: state.generation + 1,
    };
    emit();
  };

  const applySession = (session: IamSessionSnapshot): void => {
    deps.tokenManager.setSession(session);
    deps.contextStore.set({
      userId: session.userId,
      tenantId: session.tenantId,
      organizationId: session.organizationId,
      displayName: session.displayName,
    });
    state = {
      ...state,
      status: 'authenticated',
      session,
      error: null,
    };
    emit();
  };

  const fail = (error: unknown): IamAuthState => {
    state = {
      ...state,
      status: 'failed',
      error: describeAuthError(error),
    };
    emit();
    return state;
  };

  return {
    getState: () => state,

    subscribe(listener: (next: IamAuthState) => void): () => void {
      listeners.add(listener);
      return (): void => {
        listeners.delete(listener);
      };
    },

    async restore(): Promise<IamAuthState> {
      setStatus('refreshing');
      try {
        const session = await deps.gateway.loadSession();
        if (!session) {
          markCleared('session-expired');
          return state;
        }
        applySession(session);
        return state;
      } catch (error) {
        markCleared('session-expired');
        return fail(error);
      }
    },

    async login(input: IamLoginInput): Promise<IamAuthState> {
      if (state.status === 'authenticating' || state.status === 'refreshing') {
        return state;
      }
      setStatus('authenticating');
      try {
        const session = await deps.gateway.login(input);
        applySession(session);
        return state;
      } catch (error) {
        return fail(error);
      }
    },

    async refresh(): Promise<IamAuthState> {
      const current = state.session ?? deps.tokenManager.getSession();
      if (!current) {
        markCleared('session-expired');
        return fail({ code: 'session-expired', message: 'No session to refresh.' });
      }
      if (!current.refreshToken) {
        markCleared('session-expired');
        return fail({ code: 'session-expired', message: 'Session has no refresh token.' });
      }
      setStatus('refreshing');
      try {
        const session = await deps.gateway.refresh(current.refreshToken);
        applySession(session);
        return state;
      } catch (error) {
        markCleared('refresh-failed');
        return fail(error);
      }
    },

    async logout(): Promise<IamAuthState> {
      const current = state.session ?? deps.tokenManager.getSession();
      setStatus('signed-out');
      if (current) {
        try {
          await deps.gateway.logout(current);
        } catch {
          // Server-side logout is best effort; local clearing is mandatory.
        }
      }
      markCleared('logout');
      return state;
    },

    async switchTenant(input: IamSwitchTenantInput): Promise<IamAuthState> {
      setStatus('refreshing');
      try {
        const session = await deps.gateway.switchTenant(input);
        markCleared('tenant-switch');
        applySession(session);
        return state;
      } catch (error) {
        return fail(error);
      }
    },

    async switchAccount(input: IamSwitchAccountInput): Promise<IamAuthState> {
      setStatus('refreshing');
      try {
        const session = await deps.gateway.switchAccount(input);
        markCleared('account-switch');
        applySession(session);
        return state;
      } catch (error) {
        return fail(error);
      }
    },
  };
}
