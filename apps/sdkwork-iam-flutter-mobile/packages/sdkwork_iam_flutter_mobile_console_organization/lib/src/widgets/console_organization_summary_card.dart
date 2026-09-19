// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Reusable widget of the `sdkwork_iam_flutter_mobile_console_organization` capability.
 *
 * A domain-specific widget lives inside its capability package; domain-neutral
 * widgets live in `sdkwork_iam_flutter_mobile_commons` (section 3).
 */

import 'package:flutter/material.dart';

/// Compact summary card for one `console_organization` record.
class IamFlutterMobileConsoleOrganizationSummaryCard extends StatelessWidget {
  const IamFlutterMobileConsoleOrganizationSummaryCard({super.key, required this.title, required this.subtitle});

  /// Primary line.
  final String title;

  /// Supporting line.
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        title: Text(title),
        subtitle: Text(subtitle),
      ),
    );
  }
}
