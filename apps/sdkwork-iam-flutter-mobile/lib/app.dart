// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_shell/sdkwork_iam_flutter_mobile_shell.dart';

import 'shell/app_shell.dart';

/// SDKWork IAM Flutter mobile application.
class IamApp extends StatelessWidget {
  const IamApp({super.key});

  @override
  Widget build(BuildContext context) {
    return IamFlutterMobileShell(
      title: 'SDKWork IAM',
      home: const IamHomeShell(),
    );
  }
}
