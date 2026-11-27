// SDKWORK-IAM-H5-SESSION: authored dual-token session store.
/**
 * Session and token context store. One global token store per authenticated
 * session context (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §8).
 */

import { createIamAppContext, type IamAppContext } from "@sdkwork/iam-contracts";
import { isSdkworkIamSessionAuthenticated } from "@sdkwork/iam-runtime";
import type { SdkworkIamService } from "@sdkwork/iam-service";

export { isSdkworkIamSessionAuthenticated } from "@sdkwork/iam-runtime";

export interface IamH5SessionSnapshot {
  accessToken?: string;
  authToken?: string;
  context?: IamAppContext;
  expiresAt?: number | string;
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

/**
 * Validate a persisted session through the canonical current-session resource.
 *
 * Cached tokens and context are never accepted on their own. Any rejection or
 * malformed response clears the store and leaves the caller anonymous.
 */
export async function restoreValidatedIamH5Session(
  service: SdkworkIamService,
  store: IamH5SessionStore,
): Promise<boolean> {
  const snapshot = store.get();
  if (!snapshot || !isSdkworkIamSessionAuthenticated(snapshot)) {
    store.clear();
    return false;
  }
  try {
    const session = await service.auth.sessions.current.retrieve();
    if (!isSdkworkIamSessionAuthenticated(session)) {
      store.clear();
      return false;
    }
    return true;
  } catch {
    store.clear();
    return false;
  }
}

const SESSION_STORAGE_KEY = "sdkwork.sdkwork-iam-h5.iamSession.v1";

function readPersistedSession(): IamH5SessionSnapshot | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return undefined;
    return normalizeSession(JSON.parse(raw));
  } catch {
    // Corrupt or inaccessible storage is never an authentication source.
    removePersistedSession();
    return undefined;
  }
}

function removePersistedSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage can be disabled by browser policy; the in-memory store still clears.
  }
}

function persistSession(snapshot: IamH5SessionSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Storage can be disabled or full. Keep the authenticated in-memory session;
    // bootstrap validation still governs whether it may be restored next load.
  }
}

function normalizeToken(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function normalizeContext(value: unknown): IamAppContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const appId = normalizeToken(candidate.appId);
  const authLevel = normalizeToken(candidate.authLevel);
  const dataScope = candidate.dataScope;
  const deploymentMode = normalizeToken(candidate.deploymentMode);
  const environment = normalizeToken(candidate.environment);
  const loginScope = normalizeToken(candidate.loginScope);
  const organizationId = normalizeToken(candidate.organizationId);
  const permissionScope = candidate.permissionScope;
  const sessionId = normalizeToken(candidate.sessionId);
  const standardRoleCodes = candidate.standardRoleCodes;
  const tenantId = normalizeToken(candidate.tenantId);
  const userId = normalizeToken(candidate.userId);
  if (
    !appId || !authLevel || !deploymentMode || !environment || !sessionId || !tenantId || !userId
    || !Array.isArray(dataScope) || !dataScope.every((entry) => typeof entry === "string")
    || !Array.isArray(permissionScope) || !permissionScope.every((entry) => typeof entry === "string")
    || (standardRoleCodes !== undefined
      && (!Array.isArray(standardRoleCodes)
        || !standardRoleCodes.every((entry) => typeof entry === "string")))
  ) {
    return undefined;
  }
  try {
    return createIamAppContext({
      appId,
      authLevel: authLevel as IamAppContext["authLevel"],
      dataScope,
      deploymentMode: deploymentMode as IamAppContext["deploymentMode"],
      environment: environment as IamAppContext["environment"],
      ...(loginScope ? { loginScope: loginScope as IamAppContext["loginScope"] } : {}),
      ...(organizationId ? { organizationId } : {}),
      permissionScope,
      sessionId,
      ...(standardRoleCodes ? { standardRoleCodes } : {}),
      tenantId,
      userId,
    });
  } catch {
    return undefined;
  }
}

function normalizeSession(value: unknown): IamH5SessionSnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const candidate = value as Record<string, unknown>;
  const accessToken = normalizeToken(candidate.accessToken);
  const authToken = normalizeToken(candidate.authToken);
  if (!isSdkworkIamSessionAuthenticated({ accessToken, authToken })) return undefined;
  const context = normalizeContext(candidate.context);
  const refreshToken = normalizeToken(candidate.refreshToken);
  const sessionId = normalizeToken(candidate.sessionId);
  const expiresAt = typeof candidate.expiresAt === "number" || typeof candidate.expiresAt === "string"
    ? candidate.expiresAt
    : undefined;
  return {
    accessToken,
    authToken,
    ...(context ? { context } : {}),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(sessionId || context?.sessionId ? { sessionId: sessionId ?? context?.sessionId } : {}),
    ...(context?.tenantId ? { tenantId: context.tenantId } : {}),
    ...(context?.organizationId ? { organizationId: context.organizationId } : {}),
    ...(context?.userId ? { userId: context.userId } : {}),
  };
}

export function createIamH5SessionStore(): IamH5SessionStore {
  let current = readPersistedSession();
  const listeners = new Set<IamH5SessionListener>();
  const emit = () => {
    for (const listener of listeners) listener(current);
  };
  return {
    clear() {
      current = undefined;
      removePersistedSession();
      emit();
    },
    get() {
      return current;
    },
    set(snapshot) {
      const normalized = normalizeSession(snapshot);
      if (!normalized) {
        removePersistedSession();
        current = undefined;
        emit();
        return;
      }
      current = normalized;
      persistSession(normalized);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
