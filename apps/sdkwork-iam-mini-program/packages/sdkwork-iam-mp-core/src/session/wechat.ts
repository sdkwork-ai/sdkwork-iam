/**
 * Reusable WeChat mini-program session module for SDKWork IAM.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` section 7 ("platform login
 * codes, phone-number grants, profile prompts and provider-specific auth facts
 * are platform inputs; they must be exchanged through approved app-api/appbase
 * flows"), `IAM_LOGIN_INTEGRATION_SPEC.md` sections 3 and 5, and
 * `APP_SDK_INTEGRATION_SPEC.md`.
 *
 * Why this module exists: `@sdkwork/iam-mp-auth` is a generated capability stub,
 * and every product mini program (mall, im, …) otherwise re-implements the same
 * `wx.login()` -> `oauth.miniProgramSessions.create` exchange, the same persisted
 * dual-token store and the same cold-launch revalidation. This is the one
 * authored implementation:
 *
 * 1. the platform login code is supplied by the caller (host layer owns
 *    `wx.login`; this package never touches a platform global),
 * 2. the exchange goes through the generated IAM app SDK operation
 *    (`oauth.miniProgramSessions.create`),
 * 3. the session is persisted through an injected key/value storage so the same
 *    module runs in WeChat, in Alipay/DingTalk profiles and under tests.
 *
 * It is intentionally framework-free: no page, no navigation, no toast. A client
 * root composes it from its own bootstrap.
 */

/** WeChat mini program provider key registered in the IAM OAuth catalog. */
export const IAM_MP_WECHAT_PROVIDER_CODE = "wechat_mini_program" as const;

/** Default storage key of the persisted session (versioned on purpose). */
export const IAM_MP_WECHAT_SESSION_STORAGE_KEY = "sdkwork-iam-mp/wechat-session/v1";
/** Default storage key of the per-install device identity. */
export const IAM_MP_WECHAT_DEVICE_STORAGE_KEY = "sdkwork-iam-mp/wechat-device/v1";

/** Minimal key/value storage the module needs (wx storage satisfies it). */
export interface IamMpKeyValueStorage {
  get(key: string): string | null;
  remove(key: string): void;
  set(key: string, value: string): void;
}

/** Dual-token session produced by the WeChat exchange. */
export interface IamMpWechatSession {
  /** `Access-Token` header credential. */
  readonly accessToken: string;
  /** `Authorization: Bearer` credential. */
  readonly authToken: string;
  readonly deviceId?: string;
  /** Absolute epoch milliseconds; absent when the server reports no window. */
  readonly expiresAt?: number;
  readonly sessionId?: string;
  readonly tenantId?: string;
  readonly userId?: string;
}

export type IamMpWechatSessionReason = "no-session" | "rejected" | "restored" | "transient";

export interface IamMpWechatSessionRestoreResult {
  readonly authenticated: boolean;
  readonly reason: IamMpWechatSessionReason;
  readonly session: IamMpWechatSession | null;
}

/**
 * Structural slice of the generated IAM app SDK this module needs.
 *
 * Declared locally so the module type-checks against `@sdkwork/iam-app-sdk`
 * without importing its internal modules, and so a fake can satisfy it in tests.
 */
export interface IamMpWechatSessionClient {
  readonly auth: {
    readonly sessions: {
      readonly current: {
        delete(): Promise<unknown>;
        retrieve(): Promise<unknown>;
      };
    };
  };
  readonly oauth: {
    readonly miniProgramSessions: {
      create(body: {
        deviceId?: string;
        jsCode: string;
        phoneCode?: string;
        providerCode?: typeof IAM_MP_WECHAT_PROVIDER_CODE;
        surfaceCode?: string;
      }): Promise<unknown>;
    };
  };
}

export interface IamMpWechatLoginInput {
  /** One-time code returned by the host's `wx.login()` adapter. */
  readonly jsCode: string;
  /** Overrides the store's device identity for this exchange. */
  readonly deviceId?: string;
  /** One-time `getPhoneNumber` grant code, when the client collected one. */
  readonly phoneCode?: string;
  /** Registered IAM OAuth mini-program surface code. */
  readonly surfaceCode?: string;
}

export interface IamMpWechatSessionStore {
  clear(): void;
  /**
   * Stable per-install device identity.
   *
   * Resolved before the exchange so the server can replace only this device's
   * previous session instead of every session of the application.
   */
  deviceId(): string;
  isAuthenticated(): boolean;
  onExpired(listener: () => void): () => void;
  read(): IamMpWechatSession | null;
  subscribe(listener: (session: IamMpWechatSession | null) => void): () => void;
  write(session: IamMpWechatSession): IamMpWechatSession;
}

function isExpired(session: IamMpWechatSession): boolean {
  return typeof session.expiresAt === "number" && session.expiresAt > 0 && Date.now() >= session.expiresAt;
}

/** A session is usable only with both credentials: the gateway needs each plane. */
export function isIamMpWechatSessionComplete(
  session: IamMpWechatSession | null | undefined,
): session is IamMpWechatSession {
  return Boolean(session && session.accessToken && session.authToken);
}

function readString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value) {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function readExpiresAt(record: Record<string, unknown>): number | undefined {
  const absolute = record.expiresAt;
  if (typeof absolute === "number" && Number.isFinite(absolute) && absolute > 0) {
    return absolute;
  }
  const relative = record.expiresIn;
  if (typeof relative === "number" && Number.isFinite(relative) && relative > 0) {
    return Date.now() + relative * 1000;
  }
  return undefined;
}

/**
 * Extracts the session from the generated client's unwrapped response.
 *
 * `sdkworkUnwrapKind: 'item'` returns `data.item` when present and `data`
 * otherwise; the session-create operation has shipped both plus a `session`
 * wrapper, so all three are normalized here once.
 *
 * @throws when the payload carries no complete dual-token pair.
 */
export function extractIamMpWechatSessionPayload(value: unknown): IamMpWechatSession {
  const candidates: Record<string, unknown>[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object" || Array.isArray(node)) {
      return;
    }
    const record = node as Record<string, unknown>;
    candidates.push(record);
    for (const key of ["item", "session", "data"]) {
      visit(record[key]);
    }
  };
  visit(value);

  for (const candidate of candidates) {
    const accessToken = readString(candidate, ["accessToken", "access_token"]);
    const authToken = readString(candidate, ["authToken", "auth_token"]);
    if (!accessToken || !authToken) {
      continue;
    }
    const expiresAt = readExpiresAt(candidate);
    const deviceId = readString(candidate, ["deviceId", "device_id"]);
    const sessionId = readString(candidate, ["sessionId", "session_id"]);
    const tenantId = readString(candidate, ["tenantId", "tenant_id"]);
    const userId = readString(candidate, ["userId", "user_id", "subjectId"]);
    return {
      accessToken,
      authToken,
      ...(deviceId ? { deviceId } : {}),
      ...(expiresAt ? { expiresAt } : {}),
      ...(sessionId ? { sessionId } : {}),
      ...(tenantId ? { tenantId } : {}),
      ...(userId ? { userId } : {}),
    };
  }

  throw new Error("IAM mini-program session exchange returned no complete dual-token session");
}

function parseSession(raw: string | null): IamMpWechatSession | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }
    return extractIamMpWechatSessionPayload(parsed);
  } catch {
    return null;
  }
}

export interface CreateIamMpWechatSessionStoreOptions {
  readonly deviceId?: string;
  readonly deviceStorageKey?: string;
  readonly storageKey?: string;
}

/**
 * Creates the persisted session store over an injected key/value storage.
 *
 * Expiry is evaluated on every read so a session whose window already closed is
 * never handed to an SDK.
 */
export function createIamMpWechatSessionStore(
  storage: IamMpKeyValueStorage,
  options: CreateIamMpWechatSessionStoreOptions = {},
): IamMpWechatSessionStore {
  const storageKey = options.storageKey ?? IAM_MP_WECHAT_SESSION_STORAGE_KEY;
  const deviceStorageKey = options.deviceStorageKey ?? IAM_MP_WECHAT_DEVICE_STORAGE_KEY;
  const listeners = new Set<(session: IamMpWechatSession | null) => void>();
  const expiredListeners = new Set<() => void>();
  let current: IamMpWechatSession | null | undefined;
  let fallbackDeviceId = options.deviceId ?? "";

  const resolveDeviceId = (): string => {
    if (fallbackDeviceId) {
      return fallbackDeviceId;
    }
    const stored = storage.get(deviceStorageKey);
    if (stored && stored.trim()) {
      fallbackDeviceId = stored;
      return stored;
    }
    // Stable per-install identity: the IAM exchange replaces the session per
    // application per device, so a re-login must carry the same id.
    const generated = `mp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try {
      storage.set(deviceStorageKey, generated);
    } catch {
      // Storage full: an in-memory device id still beats none for this run.
    }
    fallbackDeviceId = generated;
    return generated;
  };

  const emit = (): void => {
    for (const listener of listeners) {
      listener(current ?? null);
    }
  };

  const read = (): IamMpWechatSession | null => {
    if (current === undefined) {
      current = parseSession(storage.get(storageKey));
    }
    if (current && isExpired(current)) {
      current = null;
      storage.remove(storageKey);
      for (const listener of expiredListeners) {
        listener();
      }
    }
    return current;
  };

  return {
    read,
    deviceId: resolveDeviceId,
    isAuthenticated() {
      const session = read();
      return isIamMpWechatSessionComplete(session) && !isExpired(session);
    },
    write(session) {
      const next: IamMpWechatSession = { ...session, deviceId: session.deviceId ?? resolveDeviceId() };
      current = next;
      storage.set(storageKey, JSON.stringify(next));
      emit();
      return next;
    },
    clear() {
      current = null;
      storage.remove(storageKey);
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    onExpired(listener) {
      expiredListeners.add(listener);
      return () => expiredListeners.delete(listener);
    },
  };
}

export interface CreateIamMpWechatSessionManagerOptions {
  readonly client: IamMpWechatSessionClient;
  readonly store: IamMpWechatSessionStore;
  /** Default `surfaceCode` sent with every exchange. */
  readonly surfaceCode?: string;
}

export interface IamMpWechatSessionManager {
  /** Exchanges a host-obtained login code for a persisted session. */
  login(input: IamMpWechatLoginInput): Promise<IamMpWechatSession>;
  /** Revokes the server session, then clears the local one. */
  logout(): Promise<void>;
  /** Cold-launch restore + re-validation; only a rejection clears. */
  restore(): Promise<IamMpWechatSessionRestoreResult>;
  current(): IamMpWechatSession | null;
  isAuthenticated(): boolean;
}

function isRejectedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    code?: unknown;
    httpStatus?: number;
    response?: { status?: number };
    status?: number;
    statusCode?: number;
  };
  const status = candidate.httpStatus ?? candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  if (status === 401 || status === 403) {
    return true;
  }
  if (candidate.code === 40101 || candidate.code === 40301) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\b401\b/u.test(message) || /\b403\b/u.test(message) || /unauthorized/iu.test(message);
}

/**
 * Creates the WeChat session manager over one generated client and one store.
 *
 * @param options - Injected generated client, session store and surface code.
 */
export function createIamMpWechatSessionManager(
  options: CreateIamMpWechatSessionManagerOptions,
): IamMpWechatSessionManager {
  const { client, store, surfaceCode } = options;
  let loginInFlight: Promise<IamMpWechatSession> | null = null;

  return {
    async login(input) {
      // `wx.login` codes are single-use: two codes racing into the exchange means
      // one of them fails confusingly, so concurrent attempts share one flight.
      if (loginInFlight) {
        return loginInFlight;
      }
      loginInFlight = (async () => {
        try {
          const jsCode = input.jsCode.trim();
          if (!jsCode) {
            throw new Error("IAM mini-program login requires a non-empty WeChat login code");
          }
          const resolvedSurface = input.surfaceCode ?? surfaceCode;
          // Established before the exchange: the server keys session replacement
          // on it, so it cannot be discovered afterwards.
          const deviceId = input.deviceId ?? store.deviceId();
          const response = await client.oauth.miniProgramSessions.create({
            jsCode,
            providerCode: IAM_MP_WECHAT_PROVIDER_CODE,
            deviceId,
            ...(input.phoneCode ? { phoneCode: input.phoneCode } : {}),
            ...(resolvedSurface ? { surfaceCode: resolvedSurface } : {}),
          });
          return store.write(extractIamMpWechatSessionPayload(response));
        } finally {
          loginInFlight = null;
        }
      })();
      return loginInFlight;
    },

    async logout() {
      try {
        await client.auth.sessions.current.delete();
      } catch {
        // A failed revoke must not trap the user in a signed-in shell: the local
        // session is cleared regardless and the next launch re-validates.
      } finally {
        store.clear();
      }
    },

    async restore() {
      const session = store.read();
      if (!isIamMpWechatSessionComplete(session)) {
        store.clear();
        return { authenticated: false, reason: "no-session", session: null };
      }
      try {
        await client.auth.sessions.current.retrieve();
        return { authenticated: true, reason: "restored", session };
      } catch (error) {
        if (isRejectedError(error)) {
          store.clear();
          return { authenticated: false, reason: "rejected", session: null };
        }
        // Transient (offline / 5xx) keeps the session: signing a buyer out on a
        // subway ride is worse than one failed revalidation.
        return { authenticated: true, reason: "transient", session };
      }
    },

    current: () => store.read(),

    isAuthenticated: () => store.isAuthenticated(),
  };
}

/**
 * Token manager twin of the session store.
 *
 * Structurally satisfies `AuthTokenManager` from `@sdkwork/sdk-common`, so a
 * generated SDK configured with it always reads the same session the manager
 * persists — no second token cache.
 */
export interface IamMpWechatTokenManager {
  clearAccessToken(): void;
  clearAuthToken(): void;
  clearTokens(): void;
  getAccessToken(): string | undefined;
  getAuthToken(): string | undefined;
  getRefreshToken(): string | undefined;
  getTokens(): { accessToken?: string; authToken?: string };
  hasAccessToken(): boolean;
  hasAuthToken(): boolean;
  hasToken(): boolean;
  isExpired(): boolean;
  isValid(): boolean;
  setAccessToken(token: string): void;
  setAuthToken(token: string): void;
  setRefreshToken(token: string): void;
  setTokens(tokens: { accessToken?: string; authToken?: string; expiresAt?: number; expiresIn?: number }): void;
  willExpireIn(seconds: number): boolean;
}

export function createIamMpWechatTokenManager(store: IamMpWechatSessionStore): IamMpWechatTokenManager {
  type MutableSession = Partial<{ -readonly [Key in keyof IamMpWechatSession]: IamMpWechatSession[Key] }>;
  const merge = (patch: MutableSession): void => {
    const current = store.read();
    if (!current) {
      if (!patch.accessToken || !patch.authToken) {
        return;
      }
      store.write({ ...patch, accessToken: patch.accessToken, authToken: patch.authToken });
      return;
    }
    store.write({ ...current, ...patch });
  };

  return {
    getAccessToken: () => store.read()?.accessToken || undefined,
    getAuthToken: () => store.read()?.authToken || undefined,
    getRefreshToken: () => undefined,
    getTokens() {
      const session = store.read();
      return {
        ...(session?.accessToken ? { accessToken: session.accessToken } : {}),
        ...(session?.authToken ? { authToken: session.authToken } : {}),
      };
    },
    setTokens(tokens) {
      const patch: MutableSession = {};
      if (tokens.accessToken) {
        patch.accessToken = tokens.accessToken;
      }
      if (tokens.authToken) {
        patch.authToken = tokens.authToken;
      }
      if (typeof tokens.expiresAt === "number") {
        patch.expiresAt = tokens.expiresAt;
      } else if (typeof tokens.expiresIn === "number" && tokens.expiresIn > 0) {
        patch.expiresAt = Date.now() + tokens.expiresIn * 1000;
      }
      merge(patch);
    },
    setAccessToken(token) {
      merge({ accessToken: token });
    },
    setAuthToken(token) {
      merge({ authToken: token });
    },
    setRefreshToken() {
      // The exchange issues no refresh token; re-login is the documented path.
    },
    clearTokens: () => store.clear(),
    clearAccessToken: () => store.clear(),
    clearAuthToken: () => store.clear(),
    isExpired() {
      const session = store.read();
      return Boolean(session?.expiresAt && Date.now() >= session.expiresAt);
    },
    isValid: () => store.isAuthenticated(),
    hasToken() {
      const session = store.read();
      return Boolean(session && (session.accessToken || session.authToken));
    },
    hasAccessToken: () => Boolean(store.read()?.accessToken),
    hasAuthToken: () => Boolean(store.read()?.authToken),
    willExpireIn(seconds) {
      const session = store.read();
      if (!session?.expiresAt) {
        return false;
      }
      return Date.now() + seconds * 1000 >= session.expiresAt;
    },
  };
}
