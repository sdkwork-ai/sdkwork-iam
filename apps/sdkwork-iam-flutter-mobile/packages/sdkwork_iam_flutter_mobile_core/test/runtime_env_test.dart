// SDKWORK-IAM-FLUTTER: authored native base-URL test.
//
// Pins the reduction a native build needs: a cloud profile document carries the
// registered API edge family as `origin1;origin2;...`, and the Flutter runtime
// must hand its HTTP clients one absolute origin (the primary member), never the
// list. A single-origin value is only trimmed, so a standalone profile is
// unaffected.

import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:test/test.dart';

void main() {
  test('a single origin is returned unchanged minus a trailing slash', () {
    expect(
      sdkworkPrimaryOrigin('https://api.sdkwork.com/'),
      'https://api.sdkwork.com',
    );
  });

  test('a cloud origin family yields its primary member', () {
    expect(
      sdkworkPrimaryOrigin(
        'https://api.sdkwork.com;https://api.birdcoder.com;https://api.dtupay.com',
      ),
      'https://api.sdkwork.com',
    );
  });

  test('blank segments are skipped and an all-blank value yields empty', () {
    expect(sdkworkPrimaryOrigin(' ; https://api.sdkwork.com '), 'https://api.sdkwork.com');
    expect(sdkworkPrimaryOrigin(''), '');
    expect(sdkworkPrimaryOrigin(' ; '), '');
  });
}
