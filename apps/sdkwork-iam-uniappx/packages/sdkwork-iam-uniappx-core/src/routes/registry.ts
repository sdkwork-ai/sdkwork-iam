/**
 * Route identity and `pages.json` projection for the SDKWork IAM uni-app x root.
 *
 * Authority: `APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md` §7 and
 * `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §11. Route ids are shared with the PC, H5,
 * mini program, and native IAM roots; platform placement is uni-app x specific.
 */

export type IamRouteSurface = 'app' | 'console' | 'admin';

export interface IamRoutePresentation {
  uniappx: 'page' | 'tab' | 'subpackagePage';
}

export interface IamRouteContribution {
  id: string;
  surface: IamRouteSurface;
  domain: string;
  capability: string;
  screen: string;
  titleKey: string;
  auth: 'public' | 'required';
  permissionHint?: string;
  path: string;
  presentation: IamRoutePresentation;
}

export const IAM_ROUTE_IDS = {
  login: 'app.iam.auth.login',
  account: 'app.iam.account.index',
  error: 'app.iam.error.index',
} as const;

export const IAM_UNIAPPX_ROUTES: readonly IamRouteContribution[] = [
  {
    id: IAM_ROUTE_IDS.login,
    surface: 'app',
    domain: 'iam',
    capability: 'auth',
    screen: 'login',
    titleKey: 'iam.auth.login.title',
    auth: 'public',
    path: 'pages/login/index',
    presentation: { uniappx: 'page' },
  },
  {
    id: IAM_ROUTE_IDS.account,
    surface: 'app',
    domain: 'iam',
    capability: 'account',
    screen: 'index',
    titleKey: 'iam.account.index.title',
    auth: 'required',
    permissionHint: 'iam:self',
    path: 'pages/account/index',
    presentation: { uniappx: 'page' },
  },
  {
    id: IAM_ROUTE_IDS.error,
    surface: 'app',
    domain: 'iam',
    capability: 'error',
    screen: 'index',
    titleKey: 'iam.error.index.title',
    auth: 'public',
    path: 'pages/error/index',
    presentation: { uniappx: 'page' },
  },
];

export interface IamRouteRegistry {
  list(): readonly IamRouteContribution[];
  get(id: string): IamRouteContribution | null;
  bySurface(surface: IamRouteSurface): readonly IamRouteContribution[];
}

export function createIamRouteRegistry(
  routes: readonly IamRouteContribution[] = IAM_UNIAPPX_ROUTES,
): IamRouteRegistry {
  return {
    list: () => routes,
    get(id: string): IamRouteContribution | null {
      return routes.find((route) => route.id === id) ?? null;
    },
    bySurface(surface: IamRouteSurface): readonly IamRouteContribution[] {
      return routes.filter((route) => route.surface === surface);
    },
  };
}

export interface IamPagesJsonEntry {
  path: string;
  style?: Record<string, string>;
}

export interface IamPagesJsonProjection {
  pages: IamPagesJsonEntry[];
}

/**
 * Projects route contributions into `pages.json` page entries.
 *
 * The subscription/subpackage projection is added when the root ships
 * `subPackages`; the current root ships root-package pages only.
 */
export function projectIamPagesJson(
  routes: readonly IamRouteContribution[] = IAM_UNIAPPX_ROUTES,
): IamPagesJsonProjection {
  return {
    pages: routes.map((route) => ({
      path: route.path,
      style: {
        navigationBarTitleText: route.titleKey,
      },
    })),
  };
}
