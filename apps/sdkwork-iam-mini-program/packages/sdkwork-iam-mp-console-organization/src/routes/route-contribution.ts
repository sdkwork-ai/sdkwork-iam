// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-console-core';

/** Route contributions owned by `@sdkwork/iam-mp-console-organization`, taken from its tier registry. */
export const IAMMPCONSOLEORGANIZATION_ROUTE_CONTRIBUTIONS = IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.organization.directory',
);

export const IAMMPCONSOLEORGANIZATION_ROUTE_IDS = [
  'console.iam.organization.directory',
] as const;
