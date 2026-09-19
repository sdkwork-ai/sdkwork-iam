// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `app` tier.
 *
 * Joins the 12 `app` route contribution(s) of this tier's capability
 * packages into the order the tier navigator mounts them. Ids come from
 * `sdkwork_iam_flutter_mobile_core`, which
 * owns the registry, so this file adds no identities of its own.
 */

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:sdkwork_iam_flutter_mobile_auth/sdkwork_iam_flutter_mobile_auth.dart' as iamFlutterMobileAuth;
import 'package:sdkwork_iam_flutter_mobile_user_center/sdkwork_iam_flutter_mobile_user_center.dart' as iamFlutterMobileUserCenter;
import 'package:sdkwork_iam_flutter_mobile_account_binding/sdkwork_iam_flutter_mobile_account_binding.dart' as iamFlutterMobileAccountBinding;
import 'package:sdkwork_iam_flutter_mobile_user/sdkwork_iam_flutter_mobile_user.dart' as iamFlutterMobileUser;
import 'package:sdkwork_iam_flutter_mobile_tenant/sdkwork_iam_flutter_mobile_tenant.dart' as iamFlutterMobileTenant;
import 'package:sdkwork_iam_flutter_mobile_organization/sdkwork_iam_flutter_mobile_organization.dart' as iamFlutterMobileOrganization;
import 'package:sdkwork_iam_flutter_mobile_oauth/sdkwork_iam_flutter_mobile_oauth.dart' as iamFlutterMobileOauth;

/// Every route contribution of the `app` surface, in package order.
List<RouteContribution> iamFlutterMobileShellRouteContributions() {
  return <RouteContribution>[
  ...iamFlutterMobileAuth.iamFlutterMobileAuthRouteContributions,
  ...iamFlutterMobileUserCenter.iamFlutterMobileUserCenterRouteContributions,
  ...iamFlutterMobileAccountBinding.iamFlutterMobileAccountBindingRouteContributions,
  ...iamFlutterMobileUser.iamFlutterMobileUserRouteContributions,
  ...iamFlutterMobileTenant.iamFlutterMobileTenantRouteContributions,
  ...iamFlutterMobileOrganization.iamFlutterMobileOrganizationRouteContributions,
  ...iamFlutterMobileOauth.iamFlutterMobileOauthRouteContributions,
  ];
}

/// Route ids of the `app` surface, in composition order.
List<String> iamFlutterMobileShellRouteIds() {
  return iamFlutterMobileShellRouteContributions()
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
