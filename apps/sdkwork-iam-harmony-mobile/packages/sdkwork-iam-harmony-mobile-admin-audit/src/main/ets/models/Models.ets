// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * View models, route parameters and SDK port shapes of `sdkwork-iam-harmony-mobile-admin-audit`.
 *
 * Section 4 gives `models/` view models, screen models and route params only; API
 * DTOs come from the generated ArkTS app SDK, so this module declares no transport
 * shape.
 */

/** SDK surface this capability consumes, satisfied by the injected generated client. */
export interface AdminAuditSdkPort {
  readonly baseUrl: string;
  readonly platform: string;
}

/** Resolver the capability services are constructed with. */
export type AdminAuditSdkPortResolver = () => AdminAuditSdkPort;

/** Route identity owned by this package, for typed navigation calls. */
export class AdminAuditRoutes {
  /** Route id of `/admin/iam/audit`. */
  static readonly events: string = 'admin.iam.audit.events';
}

/** Route parameters the `admin-audit` pages read. */
export interface AdminAuditRouteParams {
  readonly [key: string]: string;
}

/** Presentation state of the `admin-audit` capability. */
export interface AdminAuditViewModel {
  readonly titleKey: string;
  readonly loading: boolean;
  readonly errorKey?: string;
}

/** One list row the capability renders. */
export interface AdminAuditListItem {
  readonly id: string;
  readonly labelKey: string;
}
