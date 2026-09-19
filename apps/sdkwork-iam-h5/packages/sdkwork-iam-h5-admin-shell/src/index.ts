// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamH5AdminRouteContribution } from '@sdkwork/iam-h5-admin-core';

export interface iamH5AdminShellRouteGroup {
  surface: 'admin';
  routes: readonly IamH5AdminRouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamH5AdminShellRoutes(
  routes: readonly IamH5AdminRouteContribution[],
): iamH5AdminShellRouteGroup {
  return {
    surface: 'admin',
    routes,
  };
}
