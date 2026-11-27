// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Standard page scaffold.
 *
 * Domain-neutral primitive: more than one capability package renders it, which is
 * why it lives in commons (section 3).
 */

import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';
import 'sdkwork_loading_view.dart';

/// Page scaffold every capability screen builds on.
class SdkworkScaffold extends StatelessWidget {
  const SdkworkScaffold({
    super.key,
    required this.titleKey,
    required this.body,
    this.loading = false,
    this.fullBleedBody = false,
  });

  /// Locale key of the page title.
  final String titleKey;

  /// Page content.
  final Widget body;

  /// True while the page is still fetching.
  final bool loading;

  /// True when [body] owns its own padding, safe area and scroll view.
  ///
  /// Auth screens wrap their form in a full-bleed layout so a phone keyboard
  /// cannot leave the submit field under a fixed inset; the scaffold then only
  /// contributes the route frame.
  final bool fullBleedBody;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(titleKey)),
      body: loading
          ? const SdkworkLoadingView()
          : fullBleedBody
              ? body
              : Padding(
                  padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
                  child: body,
                ),
    );
  }
}
