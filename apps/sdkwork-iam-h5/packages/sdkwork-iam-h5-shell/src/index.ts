// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamH5RouteContribution } from '@sdkwork/iam-h5-core';

export interface iamH5ShellRouteGroup {
  surface: 'app';
  routes: readonly IamH5RouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamH5ShellRoutes(
  routes: readonly IamH5RouteContribution[],
): iamH5ShellRouteGroup {
  return {
    surface: 'app',
    routes,
  };
}
