// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Component spec test of `sdkwork_iam_flutter_mobile_admin_shell`.
 *
 * Proves the package ships the component spec its manifest references.
 */

import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

void main() {
  test('the package ships its component spec', () {
    expect(File('specs/component.spec.json').existsSync(), isTrue);
  });
}
