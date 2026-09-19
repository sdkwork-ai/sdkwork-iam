// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMH5CONSOLE_ROUTE_CONTRIBUTIONS } from '@sdkwork/iam-h5-console-core';

/** Route contributions owned by `@sdkwork/iam-h5-console-account-binding`, taken from its tier registry. */
export const IAMH5CONSOLEACCOUNTBINDING_ROUTE_CONTRIBUTIONS = IAMH5CONSOLE_ROUTE_CONTRIBUTIONS.filter(
  (route) => route.id === 'console.iam.account-binding.list',
);

export const IAMH5CONSOLEACCOUNTBINDING_ROUTE_IDS = [
  'console.iam.account-binding.list',
] as const;
