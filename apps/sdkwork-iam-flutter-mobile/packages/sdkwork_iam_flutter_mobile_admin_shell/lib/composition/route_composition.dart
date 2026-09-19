// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `admin` tier.
 *
 * Joins the 10 `admin` route contribution(s) of this tier's capability
 * packages into the order the tier navigator mounts them. Ids come from
 * `sdkwork_iam_flutter_mobile_admin_core`, which
 * owns the registry, so this file adds no identities of its own.
 */

import 'package:sdkwork_iam_flutter_mobile_admin_core/sdkwork_iam_flutter_mobile_admin_core.dart';
import 'package:sdkwork_iam_flutter_mobile_admin_oauth/sdkwork_iam_flutter_mobile_admin_oauth.dart' as iamFlutterMobileAdminOauth;
import 'package:sdkwork_iam_flutter_mobile_admin_tenant/sdkwork_iam_flutter_mobile_admin_tenant.dart' as iamFlutterMobileAdminTenant;
import 'package:sdkwork_iam_flutter_mobile_admin_organization/sdkwork_iam_flutter_mobile_admin_organization.dart' as iamFlutterMobileAdminOrganization;
import 'package:sdkwork_iam_flutter_mobile_admin_permission/sdkwork_iam_flutter_mobile_admin_permission.dart' as iamFlutterMobileAdminPermission;
import 'package:sdkwork_iam_flutter_mobile_admin_account_binding/sdkwork_iam_flutter_mobile_admin_account_binding.dart' as iamFlutterMobileAdminAccountBinding;
import 'package:sdkwork_iam_flutter_mobile_admin_user/sdkwork_iam_flutter_mobile_admin_user.dart' as iamFlutterMobileAdminUser;
import 'package:sdkwork_iam_flutter_mobile_admin_audit/sdkwork_iam_flutter_mobile_admin_audit.dart' as iamFlutterMobileAdminAudit;

/// Every route contribution of the `admin` surface, in package order.
List<RouteContribution> iamFlutterMobileAdminShellRouteContributions() {
  return <RouteContribution>[
  ...iamFlutterMobileAdminOauth.iamFlutterMobileAdminOauthRouteContributions,
  ...iamFlutterMobileAdminTenant.iamFlutterMobileAdminTenantRouteContributions,
  ...iamFlutterMobileAdminOrganization.iamFlutterMobileAdminOrganizationRouteContributions,
  ...iamFlutterMobileAdminPermission.iamFlutterMobileAdminPermissionRouteContributions,
  ...iamFlutterMobileAdminAccountBinding.iamFlutterMobileAdminAccountBindingRouteContributions,
  ...iamFlutterMobileAdminUser.iamFlutterMobileAdminUserRouteContributions,
  ...iamFlutterMobileAdminAudit.iamFlutterMobileAdminAuditRouteContributions,
  ];
}

/// Route ids of the `admin` surface, in composition order.
List<String> iamFlutterMobileAdminShellRouteIds() {
  return iamFlutterMobileAdminShellRouteContributions()
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
