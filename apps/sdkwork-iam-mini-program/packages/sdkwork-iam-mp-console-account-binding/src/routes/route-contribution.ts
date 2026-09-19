// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMPCONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-mp-console-core';

/** Route contributions owned by `@sdkwork/iam-mp-console-account-binding`, taken from its tier registry. */
export const IAMMPCONSOLEACCOUNTBINDING_ROUTE_CONTRIBUTIONS = IAMMPCONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.account-binding.list',
);

export const IAMMPCONSOLEACCOUNTBINDING_ROUTE_IDS = [
  'console.iam.account-binding.list',
] as const;
