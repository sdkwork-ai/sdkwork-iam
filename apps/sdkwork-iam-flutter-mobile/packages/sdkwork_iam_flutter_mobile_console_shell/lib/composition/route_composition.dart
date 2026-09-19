// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route composition of the `console` tier.
 *
 * Joins the 4 `console` route contribution(s) of this tier's capability
 * packages into the order the tier navigator mounts them. Ids come from
 * `sdkwork_iam_flutter_mobile_console_core`, which
 * owns the registry, so this file adds no identities of its own.
 */

import 'package:sdkwork_iam_flutter_mobile_console_core/sdkwork_iam_flutter_mobile_console_core.dart';
import 'package:sdkwork_iam_flutter_mobile_console_tenant/sdkwork_iam_flutter_mobile_console_tenant.dart' as iamFlutterMobileConsoleTenant;
import 'package:sdkwork_iam_flutter_mobile_console_organization/sdkwork_iam_flutter_mobile_console_organization.dart' as iamFlutterMobileConsoleOrganization;
import 'package:sdkwork_iam_flutter_mobile_console_account_binding/sdkwork_iam_flutter_mobile_console_account_binding.dart' as iamFlutterMobileConsoleAccountBinding;
import 'package:sdkwork_iam_flutter_mobile_console_user_center/sdkwork_iam_flutter_mobile_console_user_center.dart' as iamFlutterMobileConsoleUserCenter;

/// Every route contribution of the `console` surface, in package order.
List<RouteContribution> iamFlutterMobileConsoleShellRouteContributions() {
  return <RouteContribution>[
  ...iamFlutterMobileConsoleTenant.iamFlutterMobileConsoleTenantRouteContributions,
  ...iamFlutterMobileConsoleOrganization.iamFlutterMobileConsoleOrganizationRouteContributions,
  ...iamFlutterMobileConsoleAccountBinding.iamFlutterMobileConsoleAccountBindingRouteContributions,
  ...iamFlutterMobileConsoleUserCenter.iamFlutterMobileConsoleUserCenterRouteContributions,
  ];
}

/// Route ids of the `console` surface, in composition order.
List<String> iamFlutterMobileConsoleShellRouteIds() {
  return iamFlutterMobileConsoleShellRouteContributions()
      .map((RouteContribution contribution) => contribution.id)
      .toList(growable: false);
}
