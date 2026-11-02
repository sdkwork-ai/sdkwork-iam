// SDKWORK-IAM-FLUTTER-CONSOLE-ACCOUNT-BINDING: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_console_account_binding`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK clients that
 * the bootstrap injected. The service receives its collaborators, so it never constructs a
 * client and never composes raw HTTP or manual authorization headers.
 *
 * An operator answers two questions here: which identities this user signs in with, and
 * whether the tenant's policy would let the user remove one themselves.
 */

/// Tenant policy that decides what a user may do to their own bindings.
class IamFlutterMobileConsoleAccountBindingPolicy {
  const IamFlutterMobileConsoleAccountBindingPolicy({
    this.contactEnabled = false,
    this.emailEnabled = false,
    this.oauthEnabled = false,
    this.selfServiceUnlinkEnabled = false,
  });

  /// Whether contact binding is on.
  final bool contactEnabled;

  /// Whether the user may bind an email.
  final bool emailEnabled;

  /// Whether third-party sign-in is offered.
  final bool oauthEnabled;

  /// Whether the user may remove a linked identity themselves.
  final bool selfServiceUnlinkEnabled;
}

/// One linked third-party identity.
class IamFlutterMobileConsoleAccountLink {
  const IamFlutterMobileConsoleAccountLink({
    required this.accountLinkId,
    this.provider,
    this.providerUserId,
  });

  /// Stable identity of the link.
  final String accountLinkId;

  /// Provider code.
  final String? provider;

  /// The identity at the provider.
  final String? providerUserId;
}

/// One page of linked identities.
class IamFlutterMobileConsoleAccountLinkPage {
  const IamFlutterMobileConsoleAccountLinkPage({
    this.items = const <IamFlutterMobileConsoleAccountLink>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileConsoleAccountLink> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileConsoleAccountBindingDataSource {
  /// Fetches one page of linked identities.
  Future<IamFlutterMobileConsoleAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  });

  /// Reads the tenant policy.
  Future<IamFlutterMobileConsoleAccountBindingPolicy> loadPolicy();

  /// Removes one linked identity.
  Future<void> unlink(String accountLinkId);
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileConsoleAccountBindingRoutePaths = <String, String>{
  'console.iam.account-binding.list': '/console/iam/account-binding',
};

/// Validation and error mapping of the `console_account_binding` capability.
class IamFlutterMobileConsoleAccountBindingService {
  const IamFlutterMobileConsoleAccountBindingService({
    IamFlutterMobileConsoleAccountBindingDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileConsoleAccountBindingDataSource? _dataSource;

  /// Fetches one page of linked identities.
  Future<IamFlutterMobileConsoleAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) {
    return _requireDataSource().fetchLinksPage(page: page, pageSize: pageSize);
  }

  /// Reads the tenant policy.
  Future<IamFlutterMobileConsoleAccountBindingPolicy> loadPolicy() =>
      _requireDataSource().loadPolicy();

  /// Removes one linked identity.
  Future<void> unlink(String accountLinkId) {
    final String id = accountLinkId.trim();
    if (id.isEmpty) {
      throw StateError('A binding to remove is required.');
    }
    return _requireDataSource().unlink(id);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry
        in iamFlutterMobileConsoleAccountBindingRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileConsoleAccountBindingDataSource _requireDataSource() {
    final IamFlutterMobileConsoleAccountBindingDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileConsoleAccountBindingService requires an '
        'IamFlutterMobileConsoleAccountBindingDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
