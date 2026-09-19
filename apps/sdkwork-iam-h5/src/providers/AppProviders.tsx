// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { ReactElement, ReactNode } from 'react';

export interface AppProvidersProps {
  children: ReactNode;
}

/** Provider composition boundary. SDK/session providers are wired here. */
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return <>{children}</>;
}
