// SDKWORK-IAM-H5-BOOTSTRAP: authored runtime service composition.
/**
 * Builds the one IAM service the whole H5 surface shares, and keeps its bearer
 * token in step with the session store.
 *
 * The session can be established *after* the client exists (the login screen posts
 * credentials, then the bridge commits the session), so the bootstrap subscribes
 * to the store and pushes the token onto the client instead of freezing it at
 * construction. Sign-out clears it for the same reason.
 */

import {
  createIamH5AppSdkClient,
  createIamH5RuntimeService,
  readIamH5RuntimeEnv,
  type IamH5RuntimeService,
  type IamH5SessionSnapshot,
  type IamH5SessionStore,
} from "@sdkwork/iam-h5-core";

/**
 * Compose the runtime service for this page load.
 * @param sessionStore - the shell's session store.
 * @returns the runtime triple plus a detach function for the subscription.
 */
export function createIamH5BootstrapRuntime(sessionStore: IamH5SessionStore): {
  detach: () => void;
  runtime: IamH5RuntimeService;
} {
  const env = readIamH5RuntimeEnv();
  const { baseUrl } = createIamH5AppSdkClient(env);

  const runtime = createIamH5RuntimeService({
    baseUrl,
    ...(sessionStore.get()?.accessToken ? { accessToken: sessionStore.get()?.accessToken } : {}),
    clearSession: () => {
      sessionStore.clear();
    },
    commitSession: (session) => {
      sessionStore.set(toSessionSnapshot(session));
    },
  });

  // Re-apply the token after every session change, including the one the commit
  // callback just made: the generated client holds its own copy and a stale copy
  // is an unauthenticated request that looks like a permission failure.
  const applySession = (snapshot: IamH5SessionSnapshot | undefined) => {
    runtime.setAccessToken(snapshot?.accessToken);
  };
  applySession(sessionStore.get());
  const unsubscribe = sessionStore.subscribe(applySession);

  return {
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
