import type { IamSession, IamUser, SdkworkIamService } from '@sdkwork/iam-service';

import type {
  SdkworkIamUserCenterMeContextSummary,
  SdkworkIamUserCenterMeMenuFactory,
  SdkworkIamUserCenterMeMenuInput,
  SdkworkIamUserCenterMeMenuSection,
  SdkworkIamUserCenterMeProfile,
  SdkworkIamUserCenterMeState,
} from '../types/me-view-model';
import { SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS } from '../types/me-view-model';

const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;

export interface CreateSdkworkIamUserCenterMeControllerInput {
  /** Injected service port. The controller never builds its own client. */
  service: SdkworkIamService;
  /** Optional menu override; receives the loaded profile and context. */
  menuSections?: SdkworkIamUserCenterMeMenuFactory;
  /** Per-request timeout; external awaits must be bounded. Default 15s. */
  requestTimeoutMs?: number;
}

export interface SdkworkIamUserCenterMeController {
  getState(): SdkworkIamUserCenterMeState;
  /** Loads the current profile and session context into `ready`. */
  refresh(signal?: AbortSignal): Promise<void>;
  /** Replaces the menu factory; takes effect on the next refresh or immediately. */
  setMenuSections(factory: SdkworkIamUserCenterMeMenuFactory): void;
  /** Deletes the current session and clears every sensitive page field. */
  signOut(): Promise<void>;
  subscribe(listener: (state: SdkworkIamUserCenterMeState) => void): () => void;
}

/**
 * Headless state controller for the "Me" page. Surfaces bind it to their own
 * rendering layer; all IAM access flows through the injected
 * {@link SdkworkIamService}. Sign-out clears profile, context and menu so no
 * sensitive view state survives logout (APP_MOBILE_REACT_UI_SPEC.md §6).
 */
export function createSdkworkIamUserCenterMeController(
  input: CreateSdkworkIamUserCenterMeControllerInput,
): SdkworkIamUserCenterMeController {
  const { service } = input;
  const requestTimeoutMs = input.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  let menuFactory = input.menuSections ?? createDefaultSdkworkIamUserCenterMeMenuSections;

  let state: SdkworkIamUserCenterMeState = {
    menu: menuFactory({}),
    signedOut: false,
    signingOut: false,
    status: 'idle',
  };

  const listeners = new Set<(state: SdkworkIamUserCenterMeState) => void>();

  function apply(patch: Partial<SdkworkIamUserCenterMeState>): void {
    state = { ...state, ...patch };
    const snapshot = getState();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function getState(): SdkworkIamUserCenterMeState {
    return {
      ...state,
      context: state.context ? { ...state.context } : undefined,
      menu: state.menu,
      profile: state.profile ? { ...state.profile } : undefined,
    };
  }

  async function refresh(signal?: AbortSignal): Promise<void> {
    apply({ lastError: undefined, signedOut: false, status: 'loading' });
    try {
      const [user, session] = await Promise.all([
        awaitWithTimeout(service.iam.users.current.retrieve(), requestTimeoutMs, 'iam.users.current.retrieve'),
        awaitWithTimeout(service.auth.sessions.current.retrieve(), requestTimeoutMs, 'iam.auth.sessions.current.retrieve'),
      ]);
      if (signal?.aborted) {
        return;
      }
      const profile = toProfile(user);
      const context = toContextSummary(session);
      apply({
        context,
        lastError: undefined,
        menu: menuFactory({ context, profile }),
        profile,
        signingOut: false,
        status: 'ready',
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }
      apply({
        lastError: error instanceof Error ? error.message : 'Failed to load the Me page',
        status: 'error',
      });
    }
  }

  async function signOut(): Promise<void> {
    apply({ lastError: undefined, signingOut: true });
    try {
      await awaitWithTimeout(service.auth.sessions.current.delete(), requestTimeoutMs, 'iam.auth.sessions.current.delete');
      apply({
        context: undefined,
        lastError: undefined,
        menu: createDefaultSdkworkIamUserCenterMeMenuSections({}),
        profile: undefined,
        signedOut: true,
        signingOut: false,
        status: 'idle',
      });
    } catch (error) {
      apply({
        lastError: error instanceof Error ? error.message : 'Failed to sign out',
        signingOut: false,
      });
      throw error;
    }
  }

  return {
    getState,
    refresh,
    setMenuSections(factory) {
      menuFactory = factory;
      const input: SdkworkIamUserCenterMeMenuInput = {
        context: state.context,
        profile: state.profile,
      };
      apply({ menu: factory(input) });
    },
    signOut,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/**
 * Canonical navigation menu: account and bindings sections. Session commands
 * such as sign-out belong to the surface's actions region, not the menu.
 */
export function createDefaultSdkworkIamUserCenterMeMenuSections(
  input: SdkworkIamUserCenterMeMenuInput,
): readonly SdkworkIamUserCenterMeMenuSection[] {
  const { profile } = input;
  return [
    {
      id: 'account',
      items: [
        {
          id: 'profile',
          intent: { kind: 'screen', screenId: 'profile' },
          messageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.profile,
        },
        {
          id: 'password',
          intent: { kind: 'screen', screenId: 'password' },
          messageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.password,
        },
      ],
      titleMessageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.sectionAccount,
    },
    {
      id: 'bindings',
      items: [
        {
          id: 'email-bindings',
          intent: { kind: 'screen', screenId: 'email-bindings' },
          messageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.emailBindings,
          value: profile?.email,
        },
        {
          id: 'phone-bindings',
          intent: { kind: 'screen', screenId: 'phone-bindings' },
          messageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.phoneBindings,
          value: profile?.phone,
        },
        {
          id: 'third-party-accounts',
          intent: { kind: 'screen', screenId: 'third-party-accounts' },
          messageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.thirdPartyAccounts,
        },
      ],
      titleMessageKey: SDKWORK_IAM_USER_CENTER_ME_MESSAGE_KEYS.sectionBindings,
    },
  ];
}

function toProfile(user: IamUser): SdkworkIamUserCenterMeProfile {
  const avatarUrl = user.avatar?.publicUrl ?? user.avatar?.url;
  return {
    avatarUrl: avatarUrl === '' ? undefined : avatarUrl,
    displayName: user.displayName,
    email: normalizeOptional(user.email),
    // `phone` is not part of the IamUser contract yet; read it guarded until
    // the API authority promotes it into the type.
    phone:
      readOptionalString(user, 'phone')
      ?? readOptionalString(user, 'phoneNumber')
      ?? readOptionalString(user, 'phone_number'),
    userId: normalizeOptional(user.id) ?? '',
    username: normalizeOptional(user.username),
  };
}

function toContextSummary(session: IamSession): SdkworkIamUserCenterMeContextSummary | undefined {
  const context = session.context;
  if (!context) {
    return undefined;
  }
  return {
    authLevel: normalizeOptional(context.authLevel),
    organizationId: normalizeOptional(context.organizationId),
    tenantId: normalizeOptional(context.tenantId),
    userId: normalizeOptional(context.userId) ?? '',
  };
}

/** Guarded optional-string read for fields the IAM user contract may add. */
function readOptionalString(source: object, key: string): string | undefined {
  const value: unknown = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? normalizeOptional(value) : undefined;
}

function normalizeOptional(value: string | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

async function awaitWithTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Request timed out after ${String(timeoutMs)}ms: ${label}`));
    }, timeoutMs);
  });
  timeout.catch(() => undefined);
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
