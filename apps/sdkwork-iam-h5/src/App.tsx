// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { ReactElement } from 'react';
import type { IamH5RouteContribution } from '@sdkwork/iam-h5-core';

import { AuthGate } from './AuthGate';

export interface AppProps {
  routes: readonly IamH5RouteContribution[];
}

/**
 * Root composition boundary: providers, AuthGate and route assembly only.
 * Business screens live in `packages/**`.
 */
export function App({ routes }: AppProps): ReactElement {
  return (
    <AuthGate routes={routes}>
      <div id="sdkwork-iam-h5-surface-root" data-route-count={routes.length} />
    </AuthGate>
  );
}
