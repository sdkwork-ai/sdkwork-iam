// SDKWORK-IAM-FLUTTER-ACCOUNT-BINDING: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_account_binding`.
 *
 * Section 6: this package consumes `/app/v3/api` through generated Dart SDK
 * clients that the bootstrap injected. The service receives its collaborators, so
 * it never constructs a client and never composes raw HTTP or manual authorization
 * headers.
 *
 * The data dependency is an explicit port: the capability compiles and tests
 * without a network, and the root bootstrap supplies the generated-SDK
 * implementation together with the token store.
 */

/// What this tenant lets a user do to their own bindings.
class IamFlutterMobileAccountBindingPolicy {
  const IamFlutterMobileAccountBindingPolicy({
    this.contactEnabled = false,
    this.emailEnabled = false,
    this.oauthEnabled = false,
    this.selfServiceUnlinkEnabled = false,
  });

  /// Whether contact binding is on at all.
  final bool contactEnabled;

  /// Whether the user may bind an email.
  final bool emailEnabled;

  /// Whether third-party sign-in is offered.
  final bool oauthEnabled;

  /// Whether the user may remove a linked identity themselves.
  ///
  /// Defaults to false: unlinking removes a sign-in method, which is a
  /// security-relevant action the tenant has to grant rather than one silence
  /// permits.
  final bool selfServiceUnlinkEnabled;
}

/// One linked third-party identity.
class IamFlutterMobileAccountLink {
  const IamFlutterMobileAccountLink({
    required this.accountLinkId,
    this.provider,
    this.providerUserId,
  });

  /// Stable identity of the link.
  final String accountLinkId;

  /// Provider code, e.g. `github`.
  final String? provider;

  /// The identity at the provider.
  final String? providerUserId;
}

/// One page of linked identities.
class IamFlutterMobileAccountLinkPage {
  const IamFlutterMobileAccountLinkPage({
    this.items = const <IamFlutterMobileAccountLink>[],
    this.hasMore = false,
  });

  /// Records of this page, in server order.
  final List<IamFlutterMobileAccountLink> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAccountBindingDataSource {
  /// Fetches one page of linked identities.
  Future<IamFlutterMobileAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  });

  /// Reads the tenant policy.
  Future<IamFlutterMobileAccountBindingPolicy> loadPolicy();

  /// Removes one linked identity.
  Future<void> unlink(String accountLinkId);
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAccountBindingRoutePaths = <String, String>{
  'app.iam.account-binding.list': '/user/account-binding',
};

/// Validation and error mapping of the `account_binding` capability.
class IamFlutterMobileAccountBindingService {
  const IamFlutterMobileAccountBindingService({
    IamFlutterMobileAccountBindingDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileAccountBindingDataSource? _dataSource;

  /// Fetches one page of linked identities.
  Future<IamFlutterMobileAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
  }) {
    return _requireDataSource().fetchLinksPage(page: page, pageSize: pageSize);
  }

  /// Reads the tenant policy.
  Future<IamFlutterMobileAccountBindingPolicy> loadPolicy() {
    return _requireDataSource().loadPolicy();
  }

  /// Removes one linked identity.
  ///
  /// An empty id is refused here rather than sent: a delete for an empty id is a
  /// request the server can only reject, and a swallowed one would leave the row on
  /// screen with no explanation.
  Future<void> unlink(String accountLinkId) {
    final String id = accountLinkId.trim();
    if (id.isEmpty) {
      throw StateError('accountLinkId is required');
    }
    return _requireDataSource().unlink(id);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  ///
  /// Section 8 resolves a deep link to a route id before converting it into a
  /// navigation action, so the reverse lookup lives beside the forward one.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry in iamFlutterMobileAccountBindingRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAccountBindingDataSource _requireDataSource() {
    final IamFlutterMobileAccountBindingDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAccountBindingService requires an '
        'IamFlutterMobileAccountBindingDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
