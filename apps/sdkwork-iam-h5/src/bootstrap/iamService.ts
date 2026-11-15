// SDKWORK-IAM-H5-BOOTSTRAP: authored runtime service composition.
/**
 * Builds the one IAM service the whole H5 surface shares, and keeps its bearer
 * token in step with the session store.
 *
 * The session can be established *after* the client exists (the login screen posts
 * credentials, then the bridge commits the session), so the bootstrap subscribes
 * to the store and pushes the token onto the client instead of freezing it at
 * construction. Sign-out reverts to the injected public application access token
 * for the same reason: every access-token-only call (sessions, registrations,
 * password resets, OAuth sessions) still needs a token before login.
 */

import { readBootstrapAccessTokenFromProcessEnv } from "@sdkwork/iam-credential-entry";
import {
  createIamH5AppSdkClient,
  createIamH5RuntimeService,
  readIamH5RuntimeEnv,
  type IamH5RuntimeService,
  type IamH5SessionSnapshot,
  type IamH5SessionStore,
} from "@sdkwork/iam-h5-core";
import {
  createIamH5AdminBackendAdminSdkClient,
  createIamH5AdminService,
} from "@sdkwork/iam-h5-admin-core";

/**
 * Compose the runtime service for this page load.
 * @param sessionStore - the shell's session store.
 * @returns the runtime triple plus a detach function for the subscription.
 */
export function createIamH5BootstrapRuntime(sessionStore: IamH5SessionStore): {
  adminService: ReturnType<typeof createIamH5AdminService>;
  detach: () => void;
  runtime: IamH5RuntimeService;
} {
  const env = readIamH5RuntimeEnv();
  const { baseUrl } = createIamH5AppSdkClient(env);

  // The renderer is served with the selected profile's committed public
  // application access token injected as a browser global before any application
  // module runs (IAM_CREDENTIAL_ENTRY_SPEC.md section 4, APP_ACCESS_TOKEN_SPEC.md
  // section 1). It is the credential every access-token-only request needs before
  // an interactive session exists, so it seeds the runtime here and stays the
  // fallback after sign-out instead of degrading to an empty token.
  const bootstrapAccessToken = readBootstrapAccessTokenFromProcessEnv();
  const resolveAccessToken = (snapshot: IamH5SessionSnapshot | undefined): string | undefined =>
    snapshot?.accessToken || bootstrapAccessToken;
  const initialAccessToken = resolveAccessToken(sessionStore.get());

  const runtime = createIamH5RuntimeService({
    baseUrl,
    ...(initialAccessToken ? { accessToken: initialAccessToken } : {}),
    clearSession: () => {
      sessionStore.clear();
    },
    commitSession: (session) => {
      sessionStore.set(toSessionSnapshot(session));
    },
  });

  // Re-apply the token after every session change, including the one the commit
  // callback just made: the generated client holds its own copy and a stale copy
  // is an unauthenticated request that looks like a permission failure. A sign-out
  // emits no session, so this falls back to the injected bootstrap token.
  const applySession = (snapshot: IamH5SessionSnapshot | undefined) => {
    runtime.setAccessToken(resolveAccessToken(snapshot));
  };
  applySession(sessionStore.get());
  const unsubscribe = sessionStore.subscribe(applySession);

  // The admin surface reads backend-api resources through the same IAM service, with
  // the generated backend client attached. The credential is read at request time from
  // the one session store, so the admin console cannot drift onto a different identity
  // than the app tab it sits beside; the backend enforces the admin permission itself.
  // The injected bootstrap token is the same fallback as the app client, so an
  // access-token-only backend call before login is never sent credential-free.
  const backendClient = createIamH5AdminBackendAdminSdkClient({
    baseUrl: env.backendApiBaseUrl || baseUrl,
    getAccessToken: () => resolveAccessToken(sessionStore.get()),
  });
  const adminService = createIamH5AdminService({
    appbaseAppClient: runtime.client,
    backendClient,
  });

  return {
    adminService,
    detach: unsubscribe,
    runtime,
  };
}

/**
 * Project the IAM session onto the shell's session snapshot.
 * @param session - the session the service returned.
 * @returns the snapshot the store keeps.
 */
function toSessionSnapshot(session: {
  accessToken: string;
  context?: { organizationId?: string; tenantId?: string };
  refreshToken?: string;
  sessionId?: string;
  user?: { id?: string };
}): IamH5SessionSnapshot {
  return {
    accessToken: session.accessToken,
    ...(session.refreshToken ? { refreshToken: session.refreshToken } : {}),
    ...(session.sessionId ? { sessionId: session.sessionId } : {}),
    ...(session.context?.tenantId ? { tenantId: session.context.tenantId } : {}),
    ...(session.context?.organizationId ? { organizationId: session.context.organizationId } : {}),
    ...(session.user?.id ? { userId: session.user.id } : {}),
  };
}
