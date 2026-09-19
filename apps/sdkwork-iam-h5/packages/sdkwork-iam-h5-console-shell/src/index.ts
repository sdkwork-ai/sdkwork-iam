// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamH5ConsoleRouteContribution } from '@sdkwork/iam-h5-console-core';

export interface iamH5ConsoleShellRouteGroup {
  surface: 'console';
  routes: readonly IamH5ConsoleRouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamH5ConsoleShellRoutes(
  routes: readonly IamH5ConsoleRouteContribution[],
): iamH5ConsoleShellRouteGroup {
  return {
    surface: 'console',
    routes,
  };
}
