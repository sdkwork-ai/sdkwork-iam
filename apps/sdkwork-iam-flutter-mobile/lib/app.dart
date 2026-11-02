// SDKWORK-IAM-FLUTTER: authored application root.
import 'package:flutter/material.dart';

import 'shell/app_shell.dart';

/// SDKWork IAM Flutter mobile application.
///
/// The shell owns the `MaterialApp` (it is the only place that knows the route
/// table), so the root hands it the home widget and nothing else.
class IamApp extends StatelessWidget {
  const IamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const IamHomeShell();
  }
}
