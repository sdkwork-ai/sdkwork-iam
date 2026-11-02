// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import 'package:flutter/material.dart';

import 'app.dart';
import 'bootstrap/runtime.dart';
import 'bootstrap/sdkwork_tls_trust.dart';

/// Application entry point.
Future<void> main() async {
  // The HTTPS trust layer must be installed before any HTTP client is
  // created, so it runs ahead of binding initialization and services.
  SdkworkTlsTrust.installForApp();

  WidgetsFlutterBinding.ensureInitialized();
  await bootstrap();
  runApp(const IamApp());
}
