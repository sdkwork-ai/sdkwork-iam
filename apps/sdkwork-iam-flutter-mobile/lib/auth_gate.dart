// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter/material.dart';

import 'bootstrap/iam_runtime.dart';

/// Sends the user to the sign-in flow until a complete session exists.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    if (!IamRuntime.instance.hasSession) {
      return const SdkworkSignInPlaceholder();
    }
    return const SizedBox.shrink();
  }
}

/// Placeholder shown until the auth capability package is mounted.
///
/// The auth capability owns the real sign-in screen
/// (`sdkwork_iam_flutter_mobile_auth`); the root only decides whether a session
/// exists, which is what keeps the root `lib/` thin (section 2).
class SdkworkSignInPlaceholder extends StatelessWidget {
  const SdkworkSignInPlaceholder({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}
