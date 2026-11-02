/**
 * Contracts of the IAM H5 organization directory.
 *
 * Route: `app.iam.organization.directory` (`/organizations`). The directory reads
 * the **app-api** `organizations.list` port, which is the only organization
 * surface an app-tier client may reach (`iam.organizations.create/update/delete`
 * belong to the backend-admin tier).
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** One organization row. */
export interface SdkworkIamH5Organization {
  readonly id: string;
  readonly name: string;
  /** Parent organization, when the row is part of a tree. */
  readonly parentId?: string;
  /** Server status vocabulary, rendered verbatim. */
  readonly status?: string;
}

/** The data port the directory reads. */
export interface SdkworkIamH5OrganizationController {
  /** One page of organizations, server-filtered by `q`. */
  fetchOrganizationsPage(
    query: SdkworkIamH5ListQuery,
  ): Promise<SdkworkIamH5Page<SdkworkIamH5Organization>>;
}

/**
 * The slice of `SdkworkIamService` this capability depends on.
 *
 * Read-only on purpose: a screen in the app tier that tried to create or delete an
 * organization would not typecheck here, which is the boundary the tiers exist to
 * enforce.
 */
export type SdkworkIamH5OrganizationServicePort = {
  iam: {
    organizations: Pick<SdkworkIamService["iam"]["organizations"], "list">;
  };
};

/** Input of {@link createSdkworkIamH5OrganizationController}. */
export interface CreateSdkworkIamH5OrganizationControllerInput {
  service: SdkworkIamH5OrganizationServicePort;
}
