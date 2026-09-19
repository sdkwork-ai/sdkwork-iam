// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * User-safe error view.
 *
 * Domain-neutral primitive owned by commons (section 3).
 */

import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

/// Renders a user-safe error with an optional retry action.
class SdkworkErrorView extends StatelessWidget {
  const SdkworkErrorView({super.key, required this.message, this.retryLabel, this.onRetry});

  /// User-safe message.
  final String message;

  /// Locale key of the retry label.
  final String? retryLabel;

  /// Retry callback, omitted when the failure is not retryable.
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          Text(message, textAlign: TextAlign.center),
          if (onRetry != null)
            Padding(
              padding: const EdgeInsets.only(top: SdkworkDesignTokens.spaceMd),
              child: TextButton(
                onPressed: onRetry,
                child: Text(retryLabel ?? 'retry'),
              ),
            ),
        ],
      ),
    );
  }
}
