// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Composition test of `sdkwork_iam_flutter_mobile_console_shell`.
 *
 * Proves the package publishes the composition surface its component spec declares.
 */

import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_iam_flutter_mobile_console_shell/sdkwork_iam_flutter_mobile_console_shell.dart';

void main() {
  test('the public boundary exposes the package composition', () {
    expect(iamFlutterMobileConsoleShellComponentSpecPath, endsWith('specs/component.spec.json'));
  });
}
