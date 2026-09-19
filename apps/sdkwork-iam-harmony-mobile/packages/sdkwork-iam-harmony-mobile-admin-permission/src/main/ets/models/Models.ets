// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-permission`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminPermissionSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminPermissionSdkPortResolver = () => AdminPermissionSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminPermissionRoutes {
  /** Route id of `/admin/iam/roles`. */
  static readonly roles: string = 'admin.iam.permission.roles';

  /** Route id of `/admin/iam/permissions`. */
  static readonly permissions: string = 'admin.iam.permission.permissions';

  /** Route id of `/admin/iam/policies`. */
  static readonly policies: string = 'admin.iam.permission.policies';

  /** Route id of `/admin/iam/authorizations`. */
  static readonly authorizations: string = 'admin.iam.permission.authorizations';
}

/** Route parameters the `admin-permission` pages read. */
export interface AdminPermissionRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-permission` capability. */
export interface AdminPermissionViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminPermissionListItem {
  readonly id: string;
  readonly labelKey: string;
}
