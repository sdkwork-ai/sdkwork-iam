// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import type { IamMpAdminRouteContribution } from '@sdkwork/iam-mp-admin-core';

export interface iamMpAdminShellRouteGroup {
  surface: 'admin';
  routes: readonly IamMpAdminRouteContribution[];
}

/**
 * Shell route composition. The shell assembles route contributions and layout
 * only; it never owns business services (APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC §5).
 */
export function groupIamMpAdminShellRoutes(
  routes: readonly IamMpAdminRouteContribution[],
): iamMpAdminShellRouteGroup {
  return {
    surface: 'admin',
    routes,
  };
}
