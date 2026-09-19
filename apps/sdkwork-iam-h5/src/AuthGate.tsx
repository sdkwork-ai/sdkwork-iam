// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { ReactElement, ReactNode } from 'react';
import type { IamH5RouteContribution } from '@sdkwork/iam-h5-core';

import { createIamH5SessionStore } from '@sdkwork/iam-h5-core';

const sessionStore = createIamH5SessionStore();

export interface AuthGateProps {
  children: ReactNode;
  routes: readonly IamH5RouteContribution[];
}

/**
 * AuthGate reads the shared session store and renders the public route set
 * while the session is empty. Route guards stay in shell/runtime, never in
 * capability packages (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §7).
 */
export function AuthGate({ children, routes }: AuthGateProps): ReactElement {
  const session = sessionStore.get();
  const visible = session
    ? routes
    : routes.filter((route) => route.auth === 'public');
  return (
    <div data-authenticated={session ? 'true' : 'false'} data-visible-routes={visible.length}>
      {children}
    </div>
  );
}
