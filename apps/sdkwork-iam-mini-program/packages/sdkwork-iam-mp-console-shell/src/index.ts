// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamMpConsoleRouteContribution } from '@sdkwork/iam-mp-console-core';

export interface iamMpConsoleShellRouteGroup {
  surface: 'console';
  routes: readonly IamMpConsoleRouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamMpConsoleShellRoutes(
  routes: readonly IamMpConsoleRouteContribution[],
): iamMpConsoleShellRouteGroup {
  return {
    surface: 'console',
    routes,
  };
}
