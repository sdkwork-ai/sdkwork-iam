import type { IamAppContext } from "@sdkwork/iam-contracts";

export const IAM_MP_SESSION_STORAGE_KEY = "sdkwork-iam-mp/session/v2";

export interface IamMpPersistentSession {
  accessToken: string;
  authToken: string;
  context?: IamAppContext;
  expiresAt?: number | string;
  refreshToken?: string;
  sessionId?: string;
}

export interface IamMpSessionStorage {
  get(key: string): string | null;
  remove(key: string): void;
  set(key: string, value: string): void;
}

export interface IamMpPersistentSessionStore {
  clear(): void;
  get(): IamMpPersistentSession | undefined;
  set(session: IamMpPersistentSession): void;
  subscribe(listener: (session: IamMpPersistentSession | undefined) => void): () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized ? normalized : undefined;
}

export function isIamMpPersistentSession(value: unknown): value is IamMpPersistentSession {
  if (!isRecord(value)) return false;
  return Boolean(readString(value.accessToken) && readString(value.authToken));
}

export function createIamMpPersistentSessionStore(
  storage: IamMpSessionStorage,
  storageKey = IAM_MP_SESSION_STORAGE_KEY,
): IamMpPersistentSessionStore {
  let current: IamMpPersistentSession | undefined;
  const listeners = new Set<(session: IamMpPersistentSession | undefined) => void>();

  const emit = () => {
    for (const listener of listeners) listener(current);
  };

  const read = (): IamMpPersistentSession | undefined => {
    if (current !== undefined) return current;
    try {
      const parsed: unknown = JSON.parse(storage.get(storageKey) ?? "null");
      if (!isIamMpPersistentSession(parsed)) {
        storage.remove(storageKey);
        return undefined;
      }
      current = parsed;
      return current;
    } catch {
      storage.remove(storageKey);
      return undefined;
    }
  };

  return {
    clear() {
      current = undefined;
      storage.remove(storageKey);
      emit();
    },
    get: read,
    set(session) {
      if (!isIamMpPersistentSession(session)) {
        throw new Error("IAM mini-program session requires both accessToken and authToken");
      }
      current = session;
      storage.set(storageKey, JSON.stringify(session));
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
