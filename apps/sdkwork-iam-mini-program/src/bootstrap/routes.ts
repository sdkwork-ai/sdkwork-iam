// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import { IAMMP_ROUTE_CONTRIBUTIONS, type IamMpRouteContribution } from '@sdkwork/iam-mp-core';

import type { MiniProgramRoutePlacement } from './types';

export function resolveBootstrapRoutes(): readonly IamMpRouteContribution[] {
  return IAMMP_ROUTE_CONTRIBUTIONS;
}

/** Projects route contributions into app.json pages and subpackages (spec §5). */
export function projectAppJson(): {
  pages: readonly string[];
  subPackages: readonly { root: string; pages: readonly string[] }[];
} {
  const routes = resolveBootstrapRoutes();
  const pages: string[] = [];
  const subpackageMap = new Map<string, string[]>();
  for (const route of routes) {
    const placement: MiniProgramRoutePlacement | undefined = route.miniProgram;
    if (!placement) continue;
    if (!placement.subpackage) {
      pages.push(placement.pagePath);
      continue;
    }
    const bucket = subpackageMap.get(placement.subpackage) ?? [];
    bucket.push(placement.pagePath);
    subpackageMap.set(placement.subpackage, bucket);
  }
  return {
    pages,
    subPackages: [...subpackageMap.entries()].map(([root, subPages]) => ({ root: root + '/', pages: subPages })),
  };
}
