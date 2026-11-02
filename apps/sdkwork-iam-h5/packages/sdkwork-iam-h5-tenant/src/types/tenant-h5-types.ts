/**
 * Contracts of the IAM H5 tenant overview surface.
 *
 * Route identity: `app.iam.tenant.overview` (`/tenant`). The screen answers the
 * question a tenant member actually has on a phone — which tenant am I acting in,
 * what organizations does it expose, and which memberships do I hold — from the
 * **app-api** read surfaces only. `service.iam.tenants.*` is a backend-admin
 * resource and is deliberately unreachable from this tier.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** Runtime context the app-api reports for the signed-in caller. */
export interface SdkworkIamH5TenantRuntime {
  /** Deployment the request landed on (`standalone` / `cloud`), when reported. */
  readonly deploymentMode?: string;
  /** Lifecycle environment, when reported. */
  readonly environment?: string;
  /** Tenant the session is pinned to. */
  readonly tenantId?: string;
  /** Signed-in user id. */
  readonly userId?: string;
}

/** One organization the tenant exposes. */
export interface SdkworkIamH5TenantOrganization {
  readonly id: string;
  readonly name: string;
  /** Parent organization, when the row is part of a tree. */
  readonly parentId?: string;
  /** Server status vocabulary, rendered verbatim. */
  readonly status?: string;
}

/** One membership of the signed-in user. */
export interface SdkworkIamH5TenantMembership {
  readonly id: string;
  readonly userId: string;
  readonly displayName?: string;
  readonly organizationId?: string;
  /** Role the membership grants, in the server's vocabulary. */
  readonly roleCode?: string;
}

/**
 * The data port the tenant screens read.
 *
 * It is a query port without internal state: the screen owns load state through
 * the kit hooks, so a controller that also cached would give two sources of
 * truth for the same list.
 */
export interface SdkworkIamH5TenantController {
  /** Runtime context of the current session. */
  loadRuntime(): Promise<SdkworkIamH5TenantRuntime>;
  /** One page of the tenant's organizations. */
  fetchOrganizationsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5TenantOrganization>>;
  /** One page of the caller's memberships. */
  fetchMembershipsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5TenantMembership>>;
}

/**
 * The slice of `SdkworkIamService` this capability depends on.
 *
 * Narrowed per method, not per resource group: the screen only lists, so a test
 * double does not have to fabricate `create`, `update` or `tree`, and a change
 * that starts mutating from this read-only surface fails to typecheck here
 * instead of being discovered in review.
 */
export type SdkworkIamH5TenantServicePort = {
  iam: {
    organizations: Pick<SdkworkIamService["iam"]["organizations"], "list">;
    organizationMemberships: Pick<SdkworkIamService["iam"]["organizationMemberships"], "list">;
  };
  system: {
    iam: {
      runtime: Pick<SdkworkIamService["system"]["iam"]["runtime"], "retrieve">;
    };
  };
};

/** Input of {@link createSdkworkIamH5TenantController}. */
export interface CreateSdkworkIamH5TenantControllerInput {
  service: SdkworkIamH5TenantServicePort;
}
