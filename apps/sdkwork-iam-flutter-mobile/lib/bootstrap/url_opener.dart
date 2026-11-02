// SDKWORK-IAM-FLUTTER-BOOTSTRAP: authored platform adapter.
/**
 * Opening an external URL, behind the same adapter seam as every other platform
 * capability.
 *
 * The OAuth provider screen asks its host to open the authorization URL; this is
 * that host. A capability package never imports `url_launcher`, and a test can pass
 * a plain function instead.
 */

import 'package:flutter/foundation.dart';
import 'package:sdkwork_iam_flutter_mobile_core/sdkwork_iam_flutter_mobile_core.dart';
import 'package:url_launcher/url_launcher.dart';

/// Capability key of the URL opener.
///
/// `SdkworkHostCapability` has no constant for it yet (it lists fifteen categories,
/// none of which is "open an external URL"), so the key lives here and is recorded
/// in the completeness ledger as a core gap rather than silently reusing an
/// unrelated constant such as `deepLinks`, which is for *receiving* links.
const String iamUrlOpenerCapability = 'urlOpener';

/// Opens an external URL in the platform browser.
class IamUrlOpenerAdapter implements SdkworkHostAdapter {
  const IamUrlOpenerAdapter();

  @override
  String get capability => iamUrlOpenerCapability;

  @override
  bool isAvailable() => true;

  /// Opens [url].
  ///
  /// Returns false instead of throwing: a provider that cannot be opened is a
  /// user-facing condition the screen reports, not an exception that unwinds a tap
  /// handler.
  Future<bool> open(String url) async {
    final Uri? uri = Uri.tryParse(url.trim());
    if (uri == null || !uri.hasScheme) {
      debugPrint('IAM URL opener: refused a URL without a scheme');
      return false;
    }
    try {
      return await launchUrl(uri, mode: LaunchMode.externalApplication);
    } catch (error) {
      debugPrint('IAM URL opener: $error');
      return false;
    }
  }
}
