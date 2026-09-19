// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamMpRouteContribution } from '@sdkwork/iam-mp-core';

export interface iamMpShellRouteGroup {
  surface: 'app';
  routes: readonly IamMpRouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamMpShellRoutes(
  routes: readonly IamMpRouteContribution[],
): iamMpShellRouteGroup {
  return {
    surface: 'app',
    routes,
  };
}
