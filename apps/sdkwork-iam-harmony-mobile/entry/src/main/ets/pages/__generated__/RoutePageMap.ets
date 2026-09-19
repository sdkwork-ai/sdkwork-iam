// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Generated route-to-page projection of this root.
 *
 * `HARMONY_APP_MOBILE_ARCHITECTURE_SPEC.md` section 2 names
 * `entry/src/main/ets/pages/__generated__/` as the projection target once route and
 * page generation exists. It does: every route this root ships is declared by a
 * capability package, so this table is derived from the same model that emits those
 * contributions, and an id added there appears here without anyone editing the root
 * page.
 *
 * The page components stay in their packages. Nothing in this file renders UI of its
 * own beyond delegating, which is what section 1 means by keeping `entry/` thin.
 */
import { ScreenStateView } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';

import { AuthPage } from '@sdkwork/sdkwork-iam-harmony-mobile-auth';
import { UserCenterPage } from '@sdkwork/sdkwork-iam-harmony-mobile-user-center';
import { AccountBindingPage } from '@sdkwork/sdkwork-iam-harmony-mobile-account-binding';
import { UserPage } from '@sdkwork/sdkwork-iam-harmony-mobile-user';
import { TenantPage } from '@sdkwork/sdkwork-iam-harmony-mobile-tenant';
import { OrganizationPage } from '@sdkwork/sdkwork-iam-harmony-mobile-organization';
import { OauthPage } from '@sdkwork/sdkwork-iam-harmony-mobile-oauth';
import { ConsoleTenantPage } from '@sdkwork/sdkwork-iam-harmony-mobile-console-tenant';
import { ConsoleOrganizationPage } from '@sdkwork/sdkwork-iam-harmony-mobile-console-organization';
import { ConsoleAccountBindingPage } from '@sdkwork/sdkwork-iam-harmony-mobile-console-account-binding';
import { ConsoleUserCenterPage } from '@sdkwork/sdkwork-iam-harmony-mobile-console-user-center';
import { AdminOauthPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-oauth';
import { AdminTenantPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-tenant';
import { AdminOrganizationPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-organization';
import { AdminPermissionPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-permission';
import { AdminAccountBindingPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-account-binding';
import { AdminUserPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-user';
import { AdminAuditPage } from '@sdkwork/sdkwork-iam-harmony-mobile-admin-audit';

/** Route ids this projection can mount, in declaration order. */
export const IAM_HARMONY_ROUTE_PAGE_IDS: string[] = [
  'app.iam.auth.login',
  'app.iam.auth.register',
  'app.iam.auth.forgot-password',
  'app.iam.auth.oauth-callback',
  'app.iam.auth.context-selection',
  'app.iam.user-center.profile',
  'app.iam.user-center.password',
  'app.iam.account-binding.list',
  'app.iam.user.list',
  'app.iam.tenant.overview',
  'app.iam.organization.directory',
  'app.iam.oauth.providers',
  'console.iam.tenant.overview',
  'console.iam.organization.directory',
  'console.iam.account-binding.list',
  'console.iam.user-center.profile',
  'admin.iam.oauth.providers',
  'admin.iam.tenant.list',
  'admin.iam.organization.tree',
  'admin.iam.permission.roles',
  'admin.iam.permission.permissions',
  'admin.iam.permission.policies',
  'admin.iam.permission.authorizations',
  'admin.iam.account-binding.list',
  'admin.iam.user.list',
  'admin.iam.audit.events',
];

/**
 * Mounts the page of one route id.
 *
 * An unknown id renders the shared unknown-error state rather than nothing: an empty
 * branch would present as a blank screen, and a blank screen is the one failure a
 * user cannot report.
 */
@Component
export struct IamHarmonyRoutePageMap {
  routeId: string = '';
  locale: string = 'en-US';
  offline: boolean = false;
  permissionDenied: boolean = false;

  build() {
    Column() {
            if (this.routeId === 'app.iam.auth.login') {
        AuthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.auth.register') {
        AuthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.auth.forgot-password') {
        AuthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.auth.oauth-callback') {
        AuthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.auth.context-selection') {
        AuthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.user-center.profile') {
        UserCenterPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.user-center.password') {
        UserCenterPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.account-binding.list') {
        AccountBindingPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.user.list') {
        UserPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.tenant.overview') {
        TenantPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.organization.directory') {
        OrganizationPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'app.iam.oauth.providers') {
        OauthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'console.iam.tenant.overview') {
        ConsoleTenantPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'console.iam.organization.directory') {
        ConsoleOrganizationPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'console.iam.account-binding.list') {
        ConsoleAccountBindingPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'console.iam.user-center.profile') {
        ConsoleUserCenterPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.oauth.providers') {
        AdminOauthPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.tenant.list') {
        AdminTenantPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.organization.tree') {
        AdminOrganizationPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.permission.roles') {
        AdminPermissionPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.permission.permissions') {
        AdminPermissionPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.permission.policies') {
        AdminPermissionPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.permission.authorizations') {
        AdminPermissionPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.account-binding.list') {
        AdminAccountBindingPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.user.list') {
        AdminUserPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
            } else if (this.routeId === 'admin.iam.audit.events') {
        AdminAuditPage({
          locale: this.locale,
          offline: this.offline,
          permissionDenied: this.permissionDenied,
        })
      } else {
        ScreenStateView({
          status: 'unknown-error',
          message: '',
          retryLabel: '',
        })
      }
    }
    .width('100%')
    .height('100%')
  }
}
