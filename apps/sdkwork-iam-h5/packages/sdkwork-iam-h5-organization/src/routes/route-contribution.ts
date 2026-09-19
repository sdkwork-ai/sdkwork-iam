// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-core';

/** Route contributions owned by `@sdkwork/iam-h5-organization`, taken from its tier registry. */
export const IAMH5ORGANIZATION_ROUTE_CONTRIBUTIONS = IAMH5_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'app.iam.organization.directory',
);

export const IAMH5ORGANIZATION_ROUTE_IDS = [
  'app.iam.organization.directory',
] as const;
