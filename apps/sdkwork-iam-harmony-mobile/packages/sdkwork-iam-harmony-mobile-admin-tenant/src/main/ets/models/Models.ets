// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-tenant`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminTenantSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminTenantSdkPortResolver = () => AdminTenantSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminTenantRoutes {
  /** Route id of `/admin/iam/tenants`. */
  static readonly list: string = 'admin.iam.tenant.list';
}

/** Route parameters the `admin-tenant` pages read. */
export interface AdminTenantRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-tenant` capability. */
export interface AdminTenantViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminTenantListItem {
  readonly id: string;
  readonly labelKey: string;
}
