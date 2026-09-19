// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Loading state view.
 *
 * Domain-neutral primitive owned by commons (section 3).
 */

import 'package:flutter/material.dart';

/// Loading state shown while a capability fetches its first page.
class SdkworkLoadingView extends StatelessWidget {
  const SdkworkLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(child: CircularProgressIndicator());
  }
}
