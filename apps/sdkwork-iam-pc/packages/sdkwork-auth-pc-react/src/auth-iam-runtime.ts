import {
  createSdkworkAuthController,
  type CreateSdkworkAuthControllerOptions,
  type SdkworkAuthController,
} from "./auth-controller.ts";
import { isBlank, isSdkWorkSuccessCode } from "@sdkwork/utils";
import {
  buildOrganizationLoginContextSelectionBody,
  buildPersonalLoginContextSelectionBody,
  buildTenantCurrentSessionUpdateBody,
  normalizeIamLoginContextSelectionChallenge,
  PLATFORM_ORGANIZATION_ID,
  resolveSessionOrganizationId,
} from "@sdkwork/iam-contracts";
import {
  createSdkworkAuthUserFromIdentity,
  SdkworkAuthOrganizationSelectionRequiredError,
  type SdkworkAuthEmailLoginInput,
  type SdkworkAuthLoginInput,
  type SdkworkAuthLoginQrCode,
  type SdkworkAuthLoginQrCodeCallbackInput,
  type SdkworkAuthLoginQrCodeCheckOptions,
  type SdkworkAuthLoginQrCodeConfirmInput,
  type SdkworkAuthLoginQrCodeCreateInput,
  type SdkworkAuthLoginQrCodeStatusResult,
  type SdkworkAuthScanLoginMode,
  type SdkworkAuthOAuthAuthorizationInput,
  type SdkworkAuthOAuthAuthorizationCompletion,
  type SdkworkAuthOAuthLoginInput,
  type SdkworkAuthLoginContextSelectionInput,
  type SdkworkAuthOrganizationChoice,
  type SdkworkAuthOrganizationSelectionChallenge,
  type SdkworkAuthOrganizationSelectionInput,
  type SdkworkAuthPasswordResetInput,
  type SdkworkAuthPasswordResetRequestInput,
  type SdkworkAuthPhoneLoginInput,
  type SdkworkAuthRefreshSessionInput,
  type SdkworkAuthRegisterInput,
  type SdkworkAuthSendVerifyCodeInput,
  type SdkworkAuthService,
  type SdkworkAuthSession,
  type SdkworkAuthSessionCommitOptions,
  type SdkworkAuthSessionBridgeLoginInput,
  type SdkworkAuthUpdateCurrentSessionInput,
  type SdkworkAuthUser,
  type SdkworkAuthVerifyCodeInput,
} from "./auth-service.ts";
import {
  DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY,
  normalizeSdkworkAuthOAuthProvider,
  type SdkworkAuthResolvedVerificationPolicy,
} from "./auth-runtime-config.ts";
import {
  readSdkworkMediaResource,
  type SdkworkMediaResource,
} from "@sdkwork/runtime-bootstrap";

export interface SdkworkIamRuntimeAuthStoredSessionLike {
  accessToken?: string;
  authToken?: string;
  expiresAt?: number | string;
  refreshToken?: string;
}

export interface SdkworkIamRuntimeAuthUserLike {
  avatar?: unknown;
  displayName?: unknown;
  email?: unknown;
  firstName?: unknown;
  id?: unknown;
  lastName?: unknown;
  name?: unknown;
  nickname?: unknown;
  userId?: unknown;
  username?: unknown;
}

export interface SdkworkIamRuntimeAuthSessionLike
  extends SdkworkIamRuntimeAuthStoredSessionLike {
  context?: unknown;
  sessionId?: string;
  user?: SdkworkIamRuntimeAuthUserLike;
}

export interface SdkworkIamRuntimeQrContentLike {
  content?: unknown;
  mode?: unknown;
}

export interface SdkworkIamRuntimeQrAuthSessionLike extends SdkworkAuthLoginQrCodeStatusResult {
  description?: unknown;
  deviceAuthorizationId?: unknown;
  expireTime?: unknown;
  expiresAt?: unknown;
  fallbackUrl?: unknown;
  id?: unknown;
  qrCode?: unknown;
  qrContent?: SdkworkIamRuntimeQrContentLike | unknown;
  sessionKey?: unknown;
  title?: unknown;
  type?: unknown;
}

export interface SdkworkIamRuntimeAuthRuntimeLike {
  contextStore?: {
    clear?: () => Promise<void> | void;
  };
  service: {
    auth: {
      passwordResetRequests: {
        create(body: Record<string, unknown>): Promise<unknown>;
      };
      passwordResets: {
        create(body: Record<string, unknown>): Promise<unknown>;
      };
      registrations: {
        create(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
      };
      sessions: {
        create(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
        current: {
          delete(): Promise<void>;
          logout?(body: { refreshToken: string }): Promise<void>;
          retrieve(): Promise<SdkworkIamRuntimeAuthSessionLike>;
          update?(body?: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
        };
        loginContextSelection?: {
          create?(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
        };
        organizationSelection?: {
          create?(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
        };
        refresh?(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
      };
    };
    oauth?: {
      providers?: {
        list?(): Promise<unknown>;
      };
      scanLoginModes?: {
        list?(): Promise<unknown>;
      };
      authorizationUrls?: {
        create?(params?: Record<string, unknown>): Promise<unknown>;
      };
      sessions?: {
        create?(body: Record<string, unknown>): Promise<SdkworkIamRuntimeAuthSessionLike>;
      };
      deviceAuthorizations?: {
        create?(payload?: Record<string, unknown>): Promise<SdkworkIamRuntimeQrAuthSessionLike | unknown>;
        retrieve?(deviceAuthorizationId: string): Promise<SdkworkIamRuntimeQrAuthSessionLike | unknown>;
        passwordCompletions?: {
          create?(
            deviceAuthorizationId: string,
            payload: Record<string, unknown>,
          ): Promise<SdkworkIamRuntimeQrAuthSessionLike | unknown>;
        };
        scans?: {
          create?(
            deviceAuthorizationId: string,
            payload?: Record<string, unknown>,
          ): Promise<SdkworkIamRuntimeQrAuthSessionLike | unknown>;
        };
        sessionExchanges?: {
          create?(
            deviceAuthorizationId: string,
            payload: Record<string, unknown>,
          ): Promise<unknown>;
        };
      };
      authorizations?: {
        completions?: {
          create?(
            authorizationStateId: string,
            payload?: Record<string, unknown>,
          ): Promise<unknown>;
        };
      };
    };
    messaging?: {
      verificationCodes?: {
        create?(body: Record<string, unknown>): Promise<unknown>;
        verify?(body: Record<string, unknown>): Promise<unknown>;
      };
    };
    system?: {
      iam?: {
        verificationPolicy?: {
          retrieve?(): Promise<unknown>;
        };
      };
    };
    iam: {
      users: {
        current: {
          retrieve(): Promise<SdkworkIamRuntimeAuthUserLike>;
        };
      };
    };
  };
  tokenStore?: {
    clear?: () => Promise<void> | void;
    get?: () =>
      | Promise<SdkworkIamRuntimeAuthStoredSessionLike>
      | SdkworkIamRuntimeAuthStoredSessionLike;
    set?: (session: SdkworkIamRuntimeAuthStoredSessionLike) => Promise<void> | void;
  };
}

export interface CreateSdkworkIamRuntimeAuthControllerOptions
  extends Omit<CreateSdkworkAuthControllerOptions, "service"> {
  getRuntime: () =>
    | Promise<SdkworkIamRuntimeAuthRuntimeLike>
    | SdkworkIamRuntimeAuthRuntimeLike;
  methodUnavailableMessage?: string;
  /**
   * Called after the pre-expiry refresh fails and the local session is
   * cleared, so a host can react (the runtime controller resets itself to
   * anonymous).
   */
  onSessionExpired?: () => void;
}

const DEFAULT_METHOD_UNAVAILABLE_MESSAGE =
  "This SDKWork IAM runtime auth method is not available in the current app contract.";
const SESSION_BRIDGE_TOKEN_REQUIRED_MESSAGE = "Session bridge token is required.";
const VERIFICATION_CODE_REJECTED_MESSAGE = "Failed to verify code.";
const PASSWORDS_DO_NOT_MATCH_MESSAGE = "Passwords do not match.";
/** Refresh this long before the access token expires (clock-skew allowance). */
const ACCESS_TOKEN_REFRESH_THRESHOLD_MS = 60_000;

let tokenRefreshTimer: ReturnType<typeof setTimeout> | undefined;
let sessionExpiredHandler: (() => void) | undefined;

function clearTokenRefreshTimer(): void {
  if (tokenRefreshTimer !== undefined) {
    clearTimeout(tokenRefreshTimer);
    tokenRefreshTimer = undefined;
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | undefined {
  const payload = token.split(".")[1];
  if (!payload) {
    return undefined;
  }
  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === "object" && parsed !== null
      ? parsed as Record<string, unknown>
      : undefined;
  } catch {
    return undefined;
  }
}

function accessTokenExpiryMs(token: string | undefined): number | undefined {
  if (!token) {
    return undefined;
  }
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === "number" && Number.isFinite(exp) ? exp * 1000 : undefined;
}

interface AuthRefreshLockManager {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

/**
 * Serialize refresh across tabs when the Web Locks API is available.
 *
 * Every tab schedules its own pre-expiry refresh. Without a lock, two tabs
 * present the same refresh token at the same time; the rotation lets only one
 * win and signs the other tab out. The lock is a no-op in environments without
 * `navigator.locks` (the tests and older webviews).
 */
function withAuthRefreshLock<T>(callback: () => Promise<T>): Promise<T> {
  const locks = (globalThis.navigator as Navigator & { locks?: AuthRefreshLockManager })?.locks;
  if (locks?.request) {
    return locks.request("sdkwork.auth.refresh", callback);
  }
  return callback();
}

const AUTH_SESSION_CHANNEL_NAME = "sdkwork.auth.session.v1";

interface AuthSessionChannel {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown): void;
  close?(): void;
  unref?(): void;
}

/**
 * Notify the other tabs of this origin after an explicit sign-out.
 *
 * Tokens live in shared `localStorage`, so the other tab's next request fails,
 * but its controller would keep rendering the signed-in shell until that
 * happens. The channel lets each tab clear its copy and reset its controller
 * immediately. It is intentionally not used for a failed refresh (a transient
 * network error must not sign every tab out).
 */
function openAuthSessionChannel(onSignedOut: () => void): AuthSessionChannel | undefined {
  if (typeof BroadcastChannel === "undefined") {
    return undefined;
  }
  const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL_NAME) as AuthSessionChannel;
  channel.onmessage = (event) => {
    const data = event.data as { type?: unknown } | null;
    if (data?.type === "signed-out") {
      onSignedOut();
    }
  };
  channel.unref?.();
  return channel;
}

/**
 * Refresh the stored session shortly before its access token expires.
 *
 * Without this, every API call starts failing after the one-hour access token
 * lifetime even though a valid 30-day refresh token is stored. The timer is
 * cleared on sign-out/session clear and rescheduled after every commit.
 */
function scheduleTokenRefresh(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  session: SdkworkIamRuntimeAuthStoredSessionLike,
): void {
  clearTokenRefreshTimer();
  const expiry = accessTokenExpiryMs(
    typeof session.accessToken === "string" ? session.accessToken : undefined,
  );
  if (expiry === undefined || !normalizeOptionalScalar(session.refreshToken)) {
    return;
  }
  const delay = Math.max(0, expiry - Date.now() - ACCESS_TOKEN_REFRESH_THRESHOLD_MS);
  if (delay > 2_147_483_647) {
    return;
  }
  tokenRefreshTimer = setTimeout(() => {
    tokenRefreshTimer = undefined;
    void runScheduledRefresh(runtime, session, 0);
  }, delay);
  const timer = tokenRefreshTimer as { unref?: () => void };
  timer.unref?.();
}

/**
 * A refresh failure is transient when the server was unreachable or reported a
 * retryable status. Clearing the session for these turns a brief network blip
 * into a forced re-login; the 30-day refresh token is still valid.
 */
function isTransientRefreshError(error: unknown): boolean {
  if (error === null || typeof error !== "object") {
    return false;
  }
  const candidate = error as {
    message?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  const status = candidate.status ?? candidate.statusCode;
  if (typeof status === "number" && (status === 429 || status >= 500)) {
    return true;
  }
  const message = typeof candidate.message === "string" ? candidate.message : "";
  return /failed to fetch|fetch failed|network\s*error|networkerror|timeout|timed out|econnreset|econnrefused|etimedout/i.test(
    message,
  );
}

function scheduleRefreshRetry(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  session: SdkworkIamRuntimeAuthStoredSessionLike,
  attempt: number,
): void {
  clearTokenRefreshTimer();
  const delay = Math.min(5_000 * 2 ** Math.min(attempt, 4), 60_000);
  tokenRefreshTimer = setTimeout(() => {
    tokenRefreshTimer = undefined;
    void runScheduledRefresh(runtime, session, attempt + 1);
  }, delay);
  const timer = tokenRefreshTimer as { unref?: () => void };
  timer.unref?.();
}

async function runScheduledRefresh(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  session: SdkworkIamRuntimeAuthStoredSessionLike,
  attempt: number,
): Promise<void> {
  try {
    await withAuthRefreshLock(async () => {
      const latest = await readStoredSession(runtime);
      if (
        typeof latest.accessToken === "string"
        && latest.accessToken !== ""
        && latest.accessToken !== session.accessToken
      ) {
        // Another tab refreshed while this timer waited for the lock:
        // adopt its tokens instead of rotating the refresh token again.
        await runtime.tokenStore?.set?.(latest);
        scheduleTokenRefresh(runtime, latest);
        return;
      }
      await refreshStoredSession(runtime, {}, DEFAULT_METHOD_UNAVAILABLE_MESSAGE);
    });
  } catch (error) {
    if (isTransientRefreshError(error)) {
      // Keep the session: retry with capped exponential backoff. A revoked or
      // expired refresh token produces a 4xx and still falls through to the
      // signed-out path.
      scheduleRefreshRetry(runtime, session, attempt);
      return;
    }
    // The refresh token is gone or rejected: drop the local session so the
    // next bootstrap/API call surfaces a signed-out state.
    await clearStoredSession(runtime);
    sessionExpiredHandler?.();
  }
}

/**
 * Schedule the pre-expiry refresh for a session committed outside the auth
 * service (the desktop browser-login exchange commits the redeemed session
 * directly). Keeping this export beside the scheduler prevents every host from
 * reimplementing JWT-expiry parsing.
 */
export function scheduleSdkworkAuthSessionRefresh(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  session: SdkworkIamRuntimeAuthStoredSessionLike,
): void {
  scheduleTokenRefresh(runtime, session);
}

export function createSdkworkIamRuntimeAuthController(
  options: CreateSdkworkIamRuntimeAuthControllerOptions,
): SdkworkAuthController {
  let controller: SdkworkAuthController;
  const service = createSdkworkIamRuntimeAuthService({
    ...options,
    onSessionExpired: () => {
      options.onSessionExpired?.();
      controller.handleSessionExpired();
    },
  });
  controller = createSdkworkAuthController({
    initialState: options.initialState,
    service,
  });
  return controller;
}

export function createSdkworkIamRuntimeAuthService(
  options: CreateSdkworkIamRuntimeAuthControllerOptions,
): SdkworkAuthService {
  const methodUnavailableMessage =
    options.methodUnavailableMessage ?? DEFAULT_METHOD_UNAVAILABLE_MESSAGE;
  sessionExpiredHandler = options.onSessionExpired;
  const readRuntime = () => Promise.resolve(options.getRuntime());
  const sessionChannel = openAuthSessionChannel(() => {
    void (async () => {
      try {
        const runtime = await readRuntime();
        await clearStoredSession(runtime);
      } finally {
        options.onSessionExpired?.();
      }
    })();
  });

  async function getCurrentSession(): Promise<SdkworkAuthSession | null> {
    const runtime = await readRuntime();
    const storedSession = await readStoredSession(runtime);
    if (runtime.tokenStore?.get && !hasStoredSession(storedSession)) {
      if (hasAnyStoredSessionToken(storedSession)) {
        await clearStoredSession(runtime);
      }
      return null;
    }

    try {
      const session = toAuthSession(await runtime.service.auth.sessions.current.retrieve());
      return commitStoredSession(runtime, session, { preserveRefreshToken: true });
    } catch {
      await clearStoredSession(runtime);
      return null;
    }
  }

  async function getCurrentUser(): Promise<SdkworkAuthUser | null> {
    const runtime = await readRuntime();
    const storedSession = await readStoredSession(runtime);
    if (runtime.tokenStore?.get && !hasStoredSession(storedSession)) {
      if (hasAnyStoredSessionToken(storedSession)) {
        await clearStoredSession(runtime);
      }
      return null;
    }

    return toAuthUser(await runtime.service.iam.users.current.retrieve());
  }

  async function signIn(input: SdkworkAuthLoginInput): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    const session = toAuthSession(await runtime.service.auth.sessions.create({
      grantType: "password",
      password: input.password,
      username: input.username.trim(),
    }));
    return commitStoredSession(runtime, session);
  }

  async function signInWithSessionBridge(
    input: SdkworkAuthSessionBridgeLoginInput,
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    const bridgeToken = normalizeOptionalScalar(input.bridgeToken);
    if (!bridgeToken) {
      throw new Error(SESSION_BRIDGE_TOKEN_REQUIRED_MESSAGE);
    }
    const session = toAuthSession(await runtime.service.auth.sessions.create({
      bridgeToken,
      email: input.email.trim(),
      grantType: "session_bridge",
      name: normalizeOptionalScalar(input.name),
      subject: normalizeOptionalScalar(input.subject),
    }));
    return commitStoredSession(runtime, session);
  }

  async function signInWithEmailCode(
    input: SdkworkAuthEmailLoginInput,
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    await ensureVerificationCodeAccepted(runtime, {
      code: input.code,
      scene: "LOGIN",
      target: input.email,
      verifyType: "EMAIL",
    });
    const session = toAuthSession(await runtime.service.auth.sessions.create({
      appVersion: normalizeOptionalScalar(input.appVersion),
      code: input.code.trim(),
      deviceId: normalizeOptionalScalar(input.deviceId),
      deviceName: normalizeOptionalScalar(input.deviceName),
      deviceType: normalizeOptionalScalar(input.deviceType),
      email: input.email.trim(),
      grantType: "email_code",
    }));
    return commitStoredSession(runtime, session);
  }

  async function signInWithPhoneCode(
    input: SdkworkAuthPhoneLoginInput,
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    await ensureVerificationCodeAccepted(runtime, {
      code: input.code,
      scene: "LOGIN",
      target: input.phone,
      verifyType: "PHONE",
    });
    const session = toAuthSession(await runtime.service.auth.sessions.create({
      appVersion: normalizeOptionalScalar(input.appVersion),
      code: input.code.trim(),
      deviceId: normalizeOptionalScalar(input.deviceId),
      deviceName: normalizeOptionalScalar(input.deviceName),
      deviceType: normalizeOptionalScalar(input.deviceType),
      grantType: "phone_code",
      phone: input.phone.trim(),
    }));
    return commitStoredSession(runtime, session);
  }

  async function register(input: SdkworkAuthRegisterInput): Promise<SdkworkAuthSession> {
    assertMatchingPasswordConfirmation(
      input.password,
      input.confirmPassword,
      PASSWORDS_DO_NOT_MATCH_MESSAGE,
    );

    const runtime = await readRuntime();
    const verificationCode = normalizeOptionalScalar(input.verificationCode);
    if (verificationCode) {
      await ensureVerificationCodeAccepted(
        runtime,
        resolveRegistrationVerificationRequest(input, verificationCode),
      );
    }
    const session = toAuthSession(await runtime.service.auth.registrations.create({
      channel: input.channel,
      confirmPassword: input.confirmPassword,
      email: normalizeOptionalScalar(input.email),
      password: input.password,
      phone: normalizeOptionalScalar(input.phone),
      username: input.username.trim(),
      ...(normalizeOptionalScalar(input.tenantId)
        ? { tenantId: normalizeOptionalScalar(input.tenantId) }
        : {}),
      ...(verificationCode ? { verificationCode } : {}),
    }));
    return commitStoredSession(runtime, session);
  }

  async function getVerificationPolicy(): Promise<SdkworkAuthResolvedVerificationPolicy> {
    const runtime = await readRuntime();
    const retrieveVerificationPolicy = runtime.service.system?.iam?.verificationPolicy?.retrieve;
    if (!retrieveVerificationPolicy) {
      return { ...DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY };
    }

    return toVerificationPolicy(await retrieveVerificationPolicy());
  }

  async function listOAuthProviders(): Promise<string[]> {
    const runtime = await readRuntime();
    const listOAuthProvidersMethod = runtime.service.oauth?.providers?.list;
    if (!listOAuthProvidersMethod) {
      return [];
    }

    const payload = unwrapRuntimeResponse(await listOAuthProvidersMethod());
    const record = toRecord(payload);
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(record.items)
        ? record.items
        : [];

    const providers: string[] = [];
    const seen = new Set<string>();
    for (const item of items) {
      const provider = normalizeOAuthProviderListItem(item);
      if (!provider || seen.has(provider)) {
        continue;
      }
      seen.add(provider);
      providers.push(provider);
    }

    return providers;
  }

  async function sendVerifyCode(input: SdkworkAuthSendVerifyCodeInput): Promise<void> {
    const runtime = await readRuntime();
    const createVerificationCode = runtime.service.messaging?.verificationCodes?.create;
    if (!createVerificationCode) {
      throw new Error(methodUnavailableMessage);
    }
    await createVerificationCode({
      scene: input.scene,
      target: input.target.trim(),
      verifyType: input.verifyType,
    });
  }

  async function verifyCode(input: SdkworkAuthVerifyCodeInput): Promise<boolean> {
    const runtime = await readRuntime();
    return verifyCodeWithRuntime(runtime, input);
  }

  async function verifyCodeWithRuntime(
    runtime: SdkworkIamRuntimeAuthRuntimeLike,
    input: SdkworkAuthVerifyCodeInput,
  ): Promise<boolean> {
    const verifyVerificationCode = runtime.service.messaging?.verificationCodes?.verify;
    if (!verifyVerificationCode) {
      throw new Error(methodUnavailableMessage);
    }
    const result = await verifyVerificationCode({
      code: input.code.trim(),
      scene: input.scene,
      target: input.target.trim(),
      verifyType: input.verifyType,
    });
    const record = toRecord(unwrapRuntimeResponse(result));
    return Boolean(record.verified ?? record.valid);
  }

  async function ensureVerificationCodeAccepted(
    runtime: SdkworkIamRuntimeAuthRuntimeLike,
    input: SdkworkAuthVerifyCodeInput,
  ): Promise<void> {
    if (!await verifyCodeWithRuntime(runtime, input)) {
      throw new Error(VERIFICATION_CODE_REJECTED_MESSAGE);
    }
  }

  function resolveRegistrationVerificationRequest(
    input: SdkworkAuthRegisterInput,
    code: string,
  ): SdkworkAuthVerifyCodeInput {
    const verifyType = input.channel === "PHONE" || (!input.channel && normalizeOptionalScalar(input.phone))
      ? "PHONE"
      : "EMAIL";
    const target = verifyType === "PHONE"
      ? normalizeOptionalScalar(input.phone)
      : normalizeOptionalScalar(input.email);
    if (!target) {
      throw new Error(VERIFICATION_CODE_REJECTED_MESSAGE);
    }

    return {
      code,
      scene: "REGISTER",
      target,
      verifyType,
    };
  }

  async function requestPasswordReset(
    input: SdkworkAuthPasswordResetRequestInput,
  ): Promise<void> {
    const runtime = await readRuntime();
    const verifyType = input.channel === "SMS" ? "PHONE" : "EMAIL";
    await sendVerifyCode({
      scene: "RESET_PASSWORD",
      target: input.account.trim(),
      verifyType,
    });
    await runtime.service.auth.passwordResetRequests.create({
      account: input.account.trim(),
      channel: input.channel,
    });
  }

  async function resetPassword(input: SdkworkAuthPasswordResetInput): Promise<void> {
    assertMatchingPasswordConfirmation(
      input.newPassword,
      input.confirmPassword,
      PASSWORDS_DO_NOT_MATCH_MESSAGE,
    );

    const runtime = await readRuntime();
    await runtime.service.auth.passwordResets.create({
      account: input.account.trim(),
      code: input.code.trim(),
      confirmPassword: input.confirmPassword,
      newPassword: input.newPassword,
    });
  }

  async function refreshSession(
    input: SdkworkAuthRefreshSessionInput = {},
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    return refreshStoredSession(runtime, input, methodUnavailableMessage);
  }

  async function selectLoginContext(
    input: SdkworkAuthLoginContextSelectionInput,
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    if (!runtime.service.auth.sessions.loginContextSelection?.create) {
      throw new Error(methodUnavailableMessage);
    }
    const body = input.loginScope === "ORGANIZATION"
      ? buildOrganizationLoginContextSelectionBody(
          input.continuationToken.trim(),
          input.organizationId?.trim() ?? "",
        )
      : buildPersonalLoginContextSelectionBody(input.continuationToken.trim());
    const session = toAuthSession(await runtime.service.auth.sessions.loginContextSelection.create(body));
    return commitStoredSession(runtime, session);
  }

  async function selectOrganization(
    input: SdkworkAuthOrganizationSelectionInput,
  ): Promise<SdkworkAuthSession> {
    return selectLoginContext({
      continuationToken: input.continuationToken,
      loginScope: "ORGANIZATION",
      organizationId: input.organizationId,
    });
  }

  async function selectPersonalLogin(
    input: Pick<SdkworkAuthLoginContextSelectionInput, "continuationToken">,
  ): Promise<SdkworkAuthSession> {
    return selectLoginContext({
      continuationToken: input.continuationToken,
      loginScope: "TENANT",
      organizationId: PLATFORM_ORGANIZATION_ID,
    });
  }

  async function updateCurrentSession(
    input: SdkworkAuthUpdateCurrentSessionInput = {},
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    if (!runtime.service.auth.sessions.current.update) {
      throw new Error(methodUnavailableMessage);
    }
    const loginScope = normalizeOptionalScalar(input.loginScope)?.toUpperCase();
    const payload: SdkworkAuthUpdateCurrentSessionInput = loginScope === "TENANT"
      ? { ...input, ...buildTenantCurrentSessionUpdateBody() }
      : { ...input };
    const session = toAuthSession(await runtime.service.auth.sessions.current.update(payload));
    return commitStoredSession(runtime, session, { preserveRefreshToken: true });
  }

  async function getOAuthAuthorizationUrl(
    input: SdkworkAuthOAuthAuthorizationInput,
  ): Promise<string> {
    const runtime = await readRuntime();
    const createAuthorizationUrl = runtime.service.oauth?.authorizationUrls?.create;
    if (!createAuthorizationUrl) {
      throw new Error(methodUnavailableMessage);
    }
    const result = await createAuthorizationUrl({
      provider: mapSocialProvider(input.provider),
      redirectUri: input.redirectUri.trim(),
      scope: normalizeOptionalScalar(input.scope),
      state: normalizeOptionalScalar(input.state),
    });
    const record = toRecord(result);
    const authUrl =
      normalizeOptionalScalar(record.authUrl)
      || normalizeOptionalScalar(record.url)
      || (typeof result === "string" ? result.trim() : "");
    if (!authUrl) {
      throw new Error("Third-party login link is missing from the SDKWork IAM runtime response.");
    }

    return authUrl;
  }

  async function signInWithOAuth(
    input: SdkworkAuthOAuthLoginInput,
  ): Promise<SdkworkAuthSession> {
    const runtime = await readRuntime();
    const createSession = runtime.service.oauth?.sessions?.create;
    if (!createSession) {
      throw new Error(methodUnavailableMessage);
    }
    const session = toAuthSession(await createSession({
      code: input.code.trim(),
      deviceId: normalizeOptionalScalar(input.deviceId),
      deviceType: normalizeOptionalScalar(input.deviceType),
      provider: mapSocialProvider(input.provider),
      redirectUri: normalizeOptionalScalar(input.redirectUri),
      state: normalizeOptionalScalar(input.state),
    }));
    return commitStoredSession(runtime, session);
  }

  async function signOut(): Promise<void> {
    const runtime = await readRuntime();
    try {
      // Prefer the refresh-token revocation path: it still revokes the server
      // session after the short-lived access token expired. Fall back to the
      // dual-token delete for sessions without a refresh token (or an SDK
      // generated before the logout operation existed).
      const stored = await readStoredSession(runtime);
      const refreshToken = typeof stored.refreshToken === "string"
        ? stored.refreshToken.trim()
        : "";
      const logout = runtime.service.auth.sessions.current.logout;
      if (refreshToken !== "" && typeof logout === "function") {
        await logout({ refreshToken });
        return;
      }
      await runtime.service.auth.sessions.current.delete();
    } finally {
      await clearStoredSession(runtime);
      sessionChannel?.postMessage({ type: "signed-out" });
    }
  }

  async function generateLoginQrCode(
    input: SdkworkAuthLoginQrCodeCreateInput = {},
  ): Promise<SdkworkAuthLoginQrCode> {
    const runtime = await readRuntime();
    const createSession = runtime.service.oauth?.deviceAuthorizations?.create;
    if (!createSession) {
      throw new Error(methodUnavailableMessage);
    }
    const qrMode = normalizeOptionalScalar(input.qrMode);

    return toPlatformLoginQrCode(await createSession({
      purpose: resolveQrAuthPurpose(input),
      ...(qrMode ? { qrMode } : {}),
    }));
  }

  async function listScanLoginModes(): Promise<SdkworkAuthScanLoginMode[]> {
    const runtime = await readRuntime();
    const listModes = runtime.service.oauth?.scanLoginModes?.list;
    if (!listModes) {
      return [];
    }
    const payload = unwrapRuntimeResponse(await listModes());
    const record = toRecord(payload);
    const entries = Array.isArray(payload)
      ? payload
      : Array.isArray(record.modes)
        ? record.modes
        : [];
    return entries
      .map((entry): SdkworkAuthScanLoginMode | undefined => {
        const mode = toRecord(entry);
        const qrMode = normalizeOptionalScalar(mode.qrMode);
        if (!qrMode) {
          return undefined;
        }
        return {
          displayName: normalizeOptionalScalar(mode.displayName),
          enabled: typeof mode.enabled === "boolean" ? mode.enabled : true,
          mode: normalizeOptionalScalar(mode.mode) || "url",
          providerCode: normalizeOptionalScalar(mode.providerCode),
          qrMode,
          sortOrder: typeof mode.sortOrder === "number" ? mode.sortOrder : 999,
        };
      })
      .filter((mode): mode is SdkworkAuthScanLoginMode => Boolean(mode))
      .filter((mode) => mode.enabled)
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }

  async function checkLoginQrCodeStatus(
    sessionKey: string,
    options: SdkworkAuthLoginQrCodeCheckOptions = {},
  ): Promise<SdkworkAuthLoginQrCodeStatusResult> {
    const runtime = await readRuntime();
    const retrieveSession = runtime.service.oauth?.deviceAuthorizations?.retrieve;
    if (!retrieveSession) {
      throw new Error(methodUnavailableMessage);
    }

    let result: SdkworkAuthLoginQrCodeStatusResult;
    let retrievedRecord: Record<string, unknown>;
    try {
      const retrieved = await retrieveSession(sessionKey.trim());
      retrievedRecord = toRecord(unwrapRuntimeResponse(retrieved));
      result = toPlatformLoginQrCodeStatus(retrieved);
    } catch (error) {
      if (isExpiredQrLoginCodeError(error)) {
        return {
          status: "expired",
        };
      }
      throw error;
    }

    if (result.organizationSelection) {
      return result;
    }

    let sessionSource = resolveRuntimeQrAuthSessionSource(retrievedRecord);
    if (
      !sessionSource
      && result.status === "confirmed"
      && retrievedRecord.sessionReady === true
      && normalizeOptionalScalar(options.pollSecret)
    ) {
      const createSessionExchange =
        runtime.service.oauth?.deviceAuthorizations?.sessionExchanges?.create;
      if (!createSessionExchange) {
        throw new Error(methodUnavailableMessage);
      }

      sessionSource = resolveRuntimeQrAuthSessionSource(
        toRecord(unwrapRuntimeResponse(await createSessionExchange(sessionKey.trim(), {
          pollSecret: options.pollSecret?.trim(),
        }))),
      );
    }

    if (result.status === "confirmed" && sessionSource && hasRuntimeQrAuthSessionTokens(sessionSource)) {
      const session = await commitStoredSession(runtime, toAuthSession(sessionSource));
      return {
        ...result,
        session,
        user: session.user ?? result.user,
      };
    }

    return result;
  }

  async function callbackLoginQrCode(
    input: SdkworkAuthLoginQrCodeCallbackInput,
  ): Promise<SdkworkAuthLoginQrCodeStatusResult> {
    const runtime = await readRuntime();
    const createScan = runtime.service.oauth?.deviceAuthorizations?.scans?.create;
    if (!createScan) {
      throw new Error(methodUnavailableMessage);
    }

    return toPlatformLoginQrCodeStatus(await createScan(input.sessionKey.trim(), {
      ...(input.accountId ? { accountId: input.accountId.trim() } : {}),
      ...(input.entryId ? { entryId: input.entryId.trim() } : {}),
      ...(input.externalUserId ? { externalUserId: input.externalUserId.trim() } : {}),
      ...(input.ipHash ? { ipHash: input.ipHash.trim() } : {}),
      ...(input.pollSecret ? { pollSecret: input.pollSecret.trim() } : {}),
      scanSource: resolveQrScanSource(input.scanSource),
      ...(input.userAgent ? { userAgent: input.userAgent.trim() } : {}),
    }), "scanned");
  }

  async function confirmLoginQrCode(
    input: SdkworkAuthLoginQrCodeConfirmInput,
  ): Promise<SdkworkAuthLoginQrCodeStatusResult> {
    const runtime = await readRuntime();
    const username = normalizeQrCredential(input.username, "username");
    const password = normalizeQrCredential(input.password, "password");
    const completeWithPassword = runtime.service.oauth?.deviceAuthorizations?.passwordCompletions?.create;
    if (!completeWithPassword) {
      throw new Error(methodUnavailableMessage);
    }

    const result = toPlatformLoginQrCodeStatus(await completeWithPassword(input.sessionKey.trim(), {
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.confirmPassword ? { confirmPassword: input.confirmPassword } : {}),
      ...(input.email ? { email: input.email.trim() } : {}),
      password,
      ...(input.phone ? { phone: input.phone.trim() } : {}),
      username,
      ...(input.verificationCode ? { verificationCode: input.verificationCode.trim() } : {}),
    }), "confirmed");

    if (result.session) {
      const session = await commitStoredSession(runtime, result.session);
      return {
        ...result,
        session,
        user: session.user ?? result.user,
      };
    }

    return result;
  }

  async function completeOAuthAuthorization(
    authorizationStateId: string,
  ): Promise<SdkworkAuthOAuthAuthorizationCompletion> {
    const normalizedStateId = authorizationStateId.trim();
    if (!normalizedStateId) {
      throw new Error(methodUnavailableMessage);
    }

    const runtime = await readRuntime();
    const createCompletion = runtime.service.oauth?.authorizations?.completions?.create;
    if (!createCompletion) {
      throw new Error(methodUnavailableMessage);
    }

    const completion = toRecord(unwrapRuntimeResponse(await createCompletion(normalizedStateId, {})));
    const redirectUrl = normalizeOptionalScalar(completion.redirectUrl);
    if (!redirectUrl) {
      throw new Error(methodUnavailableMessage);
    }

    return {
      authorizationCode: normalizeOptionalScalar(completion.authorizationCode),
      redirectUrl,
    };
  }

  return {
    callbackLoginQrCode,
    checkLoginQrCodeStatus,
    confirmLoginQrCode,
    completeOAuthAuthorization,
    generateLoginQrCode,
    getCurrentSession,
    getCurrentUser,
    getVerificationPolicy,
    listOAuthProviders,
    listScanLoginModes,
    getOAuthAuthorizationUrl,
    register,
    requestPasswordReset,
    resetPassword,
    refreshSession,
    selectLoginContext,
    selectOrganization,
    selectPersonalLogin,
    sendVerifyCode,
    signIn,
    signInWithEmailCode,
    signInWithOAuth,
    signInWithPhoneCode,
    signInWithSessionBridge,
    signOut,
    updateCurrentSession,
    verifyCode,
  };
}

async function readStoredSession(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
): Promise<SdkworkIamRuntimeAuthStoredSessionLike> {
  return runtime.tokenStore?.get ? (await runtime.tokenStore.get()) ?? {} : {};
}

async function commitStoredSession(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  session: SdkworkAuthSession,
  options: SdkworkAuthSessionCommitOptions = {},
): Promise<SdkworkAuthSession> {
  const storedSession = options.preserveRefreshToken ? await readStoredSession(runtime) : {};
  const refreshToken = normalizeOptionalScalar(session.refreshToken)
    || (options.preserveRefreshToken
      ? normalizeOptionalScalar(storedSession.refreshToken)
      : undefined);
  const committedSession = {
    accessToken: session.accessToken,
    authToken: session.authToken,
    ...(session.expiresAt ? { expiresAt: session.expiresAt } : {}),
    ...(session.context ? { context: session.context } : {}),
    ...(refreshToken ? { refreshToken } : {}),
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
    ...(session.user ? { user: session.user } : {}),
  };
  await runtime.tokenStore?.set?.(committedSession);
  scheduleTokenRefresh(runtime, committedSession);
  return committedSession;
}

async function clearStoredSession(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
): Promise<void> {
  clearTokenRefreshTimer();
  await Promise.all([
    runtime.tokenStore?.clear?.(),
    runtime.contextStore?.clear?.(),
  ]);
}

/**
 * Refresh the stored session through the runtime's `sessions.refresh` call.
 *
 * Shared by the user-triggered refresh and the pre-expiry timer so both paths
 * commit the new tokens and reschedule the next refresh identically.
 */
async function refreshStoredSession(
  runtime: SdkworkIamRuntimeAuthRuntimeLike,
  input: SdkworkAuthRefreshSessionInput = {},
  methodUnavailableMessage: string = DEFAULT_METHOD_UNAVAILABLE_MESSAGE,
): Promise<SdkworkAuthSession> {
  if (!runtime.service.auth.sessions.refresh) {
    throw new Error(methodUnavailableMessage);
  }
  const storedSession = await readStoredSession(runtime);
  const refreshToken = normalizeOptionalScalar(input.refreshToken)
    || normalizeOptionalScalar(storedSession.refreshToken);
  const session = toAuthSession(await runtime.service.auth.sessions.refresh(
    refreshToken ? { refreshToken } : {},
  ));
  return commitStoredSession(runtime, session, { preserveRefreshToken: true });
}

function hasStoredSession(session: SdkworkIamRuntimeAuthStoredSessionLike): boolean {
  return Boolean(
    normalizeOptionalScalar(session.authToken)
    && normalizeOptionalScalar(session.accessToken),
  ) && !isStoredSessionExpired(session);
}

function hasAnyStoredSessionToken(session: SdkworkIamRuntimeAuthStoredSessionLike): boolean {
  return Boolean(
    normalizeOptionalScalar(session.authToken)
    || normalizeOptionalScalar(session.accessToken)
    || normalizeOptionalScalar(session.refreshToken),
  );
}

function isStoredSessionExpired(session: SdkworkIamRuntimeAuthStoredSessionLike): boolean {
  const expiresAt = normalizeOptionalScalar(session.expiresAt);
  if (!expiresAt) {
    return false;
  }

  const timestamp = Number(expiresAt);
  const resolvedTimestamp = Number.isFinite(timestamp) ? timestamp : Date.parse(expiresAt);
  return Number.isFinite(resolvedTimestamp) && Date.now() >= resolvedTimestamp;
}

function assertMatchingPasswordConfirmation(
  password: string,
  confirmPassword: string | undefined,
  message: string,
): void {
  if (typeof confirmPassword === "string" && confirmPassword !== password) {
    throw new Error(message);
  }
}

function toAuthSession(session: SdkworkIamRuntimeAuthSessionLike): SdkworkAuthSession {
  throwIfTenantSelectionChallenge(session);
  throwIfOrganizationSelectionChallenge(session);
  const accessToken = normalizeOptionalScalar(session.accessToken);
  const authToken = normalizeOptionalScalar(session.authToken);

  if (!accessToken) {
    throw new Error("SDKWork IAM runtime session is missing accessToken");
  }

  if (!authToken) {
    throw new Error("SDKWork IAM runtime session is missing authToken");
  }

  const userSource = session.user;
  const context = toAuthAppContext(session.context);
  return {
    accessToken,
    authToken,
    ...(context ? { context } : {}),
    ...(normalizeOptionalScalar(session.refreshToken)
      ? { refreshToken: normalizeOptionalScalar(session.refreshToken) }
      : {}),
    ...(normalizeOptionalScalar(session.sessionId)
      ? { sessionId: normalizeOptionalScalar(session.sessionId) }
      : context?.sessionId ? { sessionId: context.sessionId } : {}),
    ...(userSource ? { user: toAuthUser(userSource) } : {}),
  };
}

function toAuthAppContext(value: unknown): SdkworkAuthSession["context"] | undefined {
  const record = toRecord(value);
  const context: SdkworkAuthSession["context"] = {
    ...(normalizeOptionalScalar(record.appId) || normalizeOptionalScalar(record.app_id)
      ? { appId: normalizeOptionalScalar(record.appId) || normalizeOptionalScalar(record.app_id) }
      : {}),
    ...(normalizeOptionalScalar(record.authLevel) || normalizeOptionalScalar(record.auth_level)
      ? { authLevel: normalizeOptionalScalar(record.authLevel) || normalizeOptionalScalar(record.auth_level) }
      : {}),
    ...(normalizeStringArray(record.dataScope).length > 0 || normalizeStringArray(record.data_scope).length > 0
      ? {
          dataScope:
            normalizeStringArray(record.dataScope).length > 0
              ? normalizeStringArray(record.dataScope)
              : normalizeStringArray(record.data_scope),
        }
      : {}),
    ...(normalizeOptionalScalar(record.deploymentMode) || normalizeOptionalScalar(record.deployment_mode)
      ? {
          deploymentMode:
            normalizeOptionalScalar(record.deploymentMode)
            || normalizeOptionalScalar(record.deployment_mode),
        }
      : {}),
    ...(normalizeOptionalScalar(record.environment)
      ? { environment: normalizeOptionalScalar(record.environment) }
      : {}),
    ...(normalizeOptionalScalar(record.loginScope) || normalizeOptionalScalar(record.login_scope)
      ? {
          loginScope:
            normalizeOptionalScalar(record.loginScope)
            || normalizeOptionalScalar(record.login_scope),
        }
      : {}),
    ...(normalizeNullableScalar(record.organizationId) !== undefined
      || normalizeNullableScalar(record.organization_id) !== undefined
      || normalizeOptionalScalar(record.loginScope)
      || normalizeOptionalScalar(record.login_scope)
      ? {
          organizationId: resolveSessionOrganizationId({
            loginScope:
              normalizeOptionalScalar(record.loginScope)
              || normalizeOptionalScalar(record.login_scope),
            organizationId:
              normalizeNullableScalar(record.organizationId)
              ?? normalizeNullableScalar(record.organization_id)
              ?? null,
          }),
        }
      : {}),
    ...(normalizeStringArray(record.permissionScope).length > 0
      || normalizeStringArray(record.permission_scope).length > 0
      ? {
          permissionScope:
            normalizeStringArray(record.permissionScope).length > 0
              ? normalizeStringArray(record.permissionScope)
              : normalizeStringArray(record.permission_scope),
        }
      : {}),
    ...(normalizeOptionalScalar(record.sessionId) || normalizeOptionalScalar(record.session_id)
      ? { sessionId: normalizeOptionalScalar(record.sessionId) || normalizeOptionalScalar(record.session_id) }
      : {}),
    ...(normalizeOptionalScalar(record.tenantId) || normalizeOptionalScalar(record.tenant_id)
      ? { tenantId: normalizeOptionalScalar(record.tenantId) || normalizeOptionalScalar(record.tenant_id) }
      : {}),
    ...(normalizeOptionalScalar(record.userId) || normalizeOptionalScalar(record.user_id)
      ? { userId: normalizeOptionalScalar(record.userId) || normalizeOptionalScalar(record.user_id) }
      : {}),
  };

  return Object.keys(context).length > 0 ? context : undefined;
}

function normalizeNullableScalar(value: unknown): string | null | undefined {
  if (value === null) {
    return null;
  }

  return normalizeOptionalScalar(value);
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(normalizeOptionalScalar).filter((item): item is string => Boolean(item))
    : [];
}

function throwIfOrganizationSelectionChallenge(value: unknown): void {
  const challenge = normalizeOrganizationSelectionChallenge(value);
  if (challenge) {
    throw new SdkworkAuthOrganizationSelectionRequiredError(challenge);
  }
}

function throwIfTenantSelectionChallenge(value: unknown): void {
  const record = toRecord(value);
  if (normalizeOptionalScalar(record.challengeType) === "TENANT_SELECTION") {
    throw new Error(
      "tenant selection is no longer supported; tenant is bound by the bootstrap Access-Token",
    );
  }
}

function normalizeOrganizationSelectionChallenge(
  value: unknown,
): SdkworkAuthOrganizationSelectionChallenge | undefined {
  return normalizeIamLoginContextSelectionChallenge(value);
}

function toAuthUser(user: SdkworkIamRuntimeAuthUserLike): SdkworkAuthUser {
  return createSdkworkAuthUserFromIdentity({
    avatar: readSdkworkMediaResource(user.avatar),
    displayName:
      normalizeOptionalScalar(user.displayName)
      || normalizeOptionalScalar(user.name)
      || normalizeOptionalScalar(user.nickname),
    email: normalizeOptionalScalar(user.email),
    firstName: normalizeOptionalScalar(user.firstName),
    id: normalizeOptionalScalar(user.userId) || normalizeOptionalScalar(user.id),
    lastName: normalizeOptionalScalar(user.lastName),
    username: normalizeOptionalScalar(user.username) || normalizeOptionalScalar(user.email),
  });
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isExpiredQrLoginCodeError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || "");
  return /invalid or expired qr login code/i.test(message);
}

function unwrapRuntimeResponse(value: unknown): unknown {
  const record = toRecord(value);
  if (!("data" in record) && !("code" in record)) {
    return value;
  }

  if (!isSuccessCode(record.code)) {
    throw new Error(String(record.message || record.msg || "SDKWork IAM runtime request failed"));
  }

  return record.data;
}

function isSuccessCode(code: unknown): boolean {
  if (code === undefined || code === null) {
    return true;
  }

  const parsed = Number(String(code).trim());
  return Number.isFinite(parsed) && isSdkWorkSuccessCode(parsed);
}

function resolveQrAuthPurpose(
  input: SdkworkAuthLoginQrCodeCreateInput,
): "login" | "register" {
  const purpose = normalizeOptionalScalar(input.purpose);
  if (!purpose) {
    return "login";
  }
  if (purpose === "login" || purpose === "register") {
    return purpose;
  }
  throw new Error("QR auth purpose must be login or register");
}

function resolveQrScanSource(value: unknown): string {
  const normalized = normalizeOptionalScalar(value);
  if (!normalized) {
    return "browser";
  }
  if (
    normalized === "app"
    || normalized === "browser"
    || normalized === "mini_app"
    || normalized === "official_account"
    || normalized === "webhook"
  ) {
    return normalized;
  }

  throw new Error("QR auth scan source must be app, browser, mini_app, official_account, or webhook");
}

function normalizeQrCredential(value: unknown, label: "password" | "username"): string {
  if (typeof value !== "string") {
    throw new Error(`QR auth ${label} is required`);
  }
  if (label === "password") {
    if (isBlank(value)) {
      throw new Error("QR auth password is required");
    }
    return value;
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("QR auth username is required");
  }
  return normalized;
}

function toPlatformLoginQrCode(value: unknown): SdkworkAuthLoginQrCode {
  const record = toRecord(unwrapRuntimeResponse(value));
  const sessionKey =
    normalizeOptionalScalar(record.sessionKey)
    || normalizeOptionalScalar(record.deviceAuthorizationId)
    || normalizeOptionalScalar(record.id);
  if (!sessionKey) {
    throw new Error("SDKWork IAM runtime QR auth session response is missing sessionKey");
  }

  return {
    description: normalizeOptionalScalar(record.description),
    expireTime: resolveQrExpireTime(record),
    pollSecret: normalizeOptionalScalar(record.pollSecret),
    qrCode: readSdkworkMediaResource(record.qrCode)
      || readSdkworkQrImageUrlResource(record.qrCode),
    qrContent: resolvePlatformQrContent(record),
    sessionKey,
    title: normalizeOptionalScalar(record.title),
    type: resolvePlatformQrContentMode(record),
  };
}

function resolvePlatformQrContent(record: Record<string, unknown>): string | undefined {
  const qrContent = record.qrContent;
  let content: string | undefined;
  if (typeof qrContent === "string") {
    content = normalizeOptionalScalar(qrContent);
  } else {
    const qrContentRecord = toRecord(qrContent);
    content = normalizeOptionalScalar(qrContentRecord.content)
      || normalizeOptionalScalar(record.fallbackUrl);
  }

  if (content && !isUserOpenableQrAuthContent(content)) {
    throw new Error("QR auth content must be a mobile-openable login entry URL");
  }

  return content;
}

function isUserOpenableQrAuthContent(value: string): boolean {
  if (isQrAuthSessionStatusApiUrl(value)) {
    return false;
  }

  return true;
}

function isQrAuthSessionStatusApiUrl(value: string): boolean {
  try {
    const parsed = new URL(value, "http://sdkwork.local");
    return parsed.pathname.startsWith("/app/v3/api/oauth/device_authorizations");
  } catch {
    return value.includes("/app/v3/api/oauth/device_authorizations");
  }
}

function resolvePlatformQrContentMode(record: Record<string, unknown>): string | undefined {
  const qrContent = record.qrContent;
  if (typeof qrContent === "string") {
    return normalizeOptionalScalar(record.type);
  }

  return normalizeOptionalScalar(toRecord(qrContent).mode)
    || normalizeOptionalScalar(record.type);
}

/**
 * Official-account scan login returns the QR code as a plain image URL
 * string in `qrCode` (the WeChat temp-QR image). Keep it as an image media
 * resource so the login page renders the image directly instead of
 * re-encoding the URL as QR content.
 */
function readSdkworkQrImageUrlResource(value: unknown): SdkworkMediaResource | undefined {
  const url = normalizeOptionalScalar(value);
  return url
    ? {
        kind: "image",
        publicUrl: url,
        source: "external_url",
        url,
      }
    : undefined;
}

function resolveQrExpireTime(record: Record<string, unknown>): number | undefined {
  if (typeof record.expireTime === "number" && Number.isFinite(record.expireTime)) {
    return record.expireTime;
  }

  const expiresAt = normalizeOptionalScalar(record.expiresAt);
  if (!expiresAt) {
    return undefined;
  }

  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

function toPlatformLoginQrCodeStatus(
  value: unknown,
  fallbackStatus: SdkworkAuthLoginQrCodeStatusResult["status"] = "pending",
): SdkworkAuthLoginQrCodeStatusResult {
  const record = toRecord(unwrapRuntimeResponse(value));
  const status = normalizePlatformQrCodeStatus(
    normalizeOptionalScalar(record.status),
    fallbackStatus,
  );
  const organizationSelection = normalizeOrganizationSelectionChallenge(record);
  const sessionSource = resolveRuntimeQrAuthSessionSource(record);
  const session = sessionSource ? toAuthSession(sessionSource) : undefined;
  const userSource = record.user;

  return {
    ...(organizationSelection ? { organizationSelection } : {}),
    status: organizationSelection && !normalizeOptionalScalar(record.status)
      ? "organizationSelectionRequired"
      : status,
    ...(session ? { session } : {}),
    ...(session?.user ? { user: session.user } : userSource ? { user: toAuthUser(userSource as SdkworkIamRuntimeAuthUserLike) } : {}),
  };
}

function resolveRuntimeQrAuthSessionSource(record: Record<string, unknown>): SdkworkIamRuntimeAuthSessionLike | undefined {
  if (hasRuntimeQrAuthSessionTokens(record)) {
    return record as SdkworkIamRuntimeAuthSessionLike;
  }

  const sessionSource = record.session;
  return hasRuntimeQrAuthSessionTokens(sessionSource)
    ? sessionSource as SdkworkIamRuntimeAuthSessionLike
    : undefined;
}

function hasRuntimeQrAuthSessionTokens(value: unknown): boolean {
  const record = toRecord(value);
  return Boolean(
    normalizeOptionalScalar(record.accessToken)
    && normalizeOptionalScalar(record.authToken),
  );
}

function toVerificationPolicy(value: unknown): SdkworkAuthResolvedVerificationPolicy {
  const record = toRecord(value);
  const accountBinding = toRecord(record.accountBinding ?? record.account_binding);
  const oauthLogin = toRecord(accountBinding.oauthLogin ?? accountBinding.oauth_login);
  const remoteOauthLoginEnabled = typeof record.oauthLoginEnabled === "boolean"
    ? record.oauthLoginEnabled
    : typeof oauthLogin.enabled === "boolean"
      ? oauthLogin.enabled
      : undefined;

  return {
    emailCodeLoginEnabled:
      typeof record.emailCodeLoginEnabled === "boolean"
        ? record.emailCodeLoginEnabled
        : DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY.emailCodeLoginEnabled,
    emailRegistrationVerificationRequired:
      typeof record.emailRegistrationVerificationRequired === "boolean"
        ? record.emailRegistrationVerificationRequired
        : typeof record.emailRegisterVerificationRequired === "boolean"
          ? record.emailRegisterVerificationRequired
          : DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY.emailRegistrationVerificationRequired,
    phoneCodeLoginEnabled:
      typeof record.phoneCodeLoginEnabled === "boolean"
        ? record.phoneCodeLoginEnabled
        : DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY.phoneCodeLoginEnabled,
    phoneRegistrationVerificationRequired:
      typeof record.phoneRegistrationVerificationRequired === "boolean"
        ? record.phoneRegistrationVerificationRequired
        : typeof record.phoneRegisterVerificationRequired === "boolean"
          ? record.phoneRegisterVerificationRequired
          : DEFAULT_SDKWORK_AUTH_VERIFICATION_POLICY.phoneRegistrationVerificationRequired,
    ...(typeof remoteOauthLoginEnabled === "boolean"
      ? { oauthLoginEnabled: remoteOauthLoginEnabled }
      : {}),
  };
}

function normalizeOAuthProviderListItem(value: unknown): string | null {
  if (typeof value === "string") {
    return normalizeSdkworkAuthOAuthProvider(value);
  }

  const record = toRecord(value);
  const providerCode = normalizeOptionalScalar(record.providerCode)
    ?? normalizeOptionalScalar(record.provider_code)
    ?? normalizeOptionalScalar(record.provider);
  return providerCode ? normalizeSdkworkAuthOAuthProvider(providerCode) : null;
}

function normalizePlatformQrCodeStatus(
  status: string | undefined,
  fallbackStatus: SdkworkAuthLoginQrCodeStatusResult["status"],
): SdkworkAuthLoginQrCodeStatusResult["status"] {
  if (status === "completed") {
    return "confirmed";
  }

  if (status === "cancelled") {
    return "failed";
  }

  if (status === "organization_selection_required"
    || status === "login_context_selection_required") {
    return "organizationSelectionRequired";
  }

  return status === "bindRequired"
    || status === "confirmed"
    || status === "expired"
    || status === "failed"
    || status === "organizationSelectionRequired"
    || status === "passwordRequired"
    || status === "pending"
    || status === "scanned"
    ? status
    : fallbackStatus;
}

function normalizeOptionalScalar(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function mapSocialProvider(provider: string): string {
  const normalized = provider.trim().replace(/[\s-]+/g, "_").toUpperCase();
  if (!normalized) {
    throw new Error("Third-party login method is required.");
  }

  return normalized;
}
