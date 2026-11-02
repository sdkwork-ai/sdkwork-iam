// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored service layer.
/**
 * Use-case orchestration of `sdkwork_iam_flutter_mobile_admin_account_binding`.
 *
 * Section 6: the admin tier reads **backend-api** resources; the bootstrap constructs the
 * generated backend client and injects it through the port below.
 *
 * The list is tenant-wide: every third-party identity any user has linked. An operator
 * searches it to answer "which account is this GitHub login attached to?", so the row must
 * carry both the provider identity and the local user it belongs to.
 */

/// One linked identity.
class IamFlutterMobileAdminAccountLinkRow {
  const IamFlutterMobileAdminAccountLinkRow({
    required this.accountLinkId,
    this.provider,
    this.providerUserId,
    this.userId,
  });

  /// Stable identity of the link.
  final String accountLinkId;

  /// Provider code, e.g. `github`.
  final String? provider;

  /// The identity at the provider.
  final String? providerUserId;

  /// The local user the link belongs to.
  final String? userId;
}

/// One page of linked identities.
class IamFlutterMobileAdminAccountLinkPage {
  const IamFlutterMobileAdminAccountLinkPage({
    this.items = const <IamFlutterMobileAdminAccountLinkRow>[],
    this.hasMore = false,
  });

  /// Records of this page.
  final List<IamFlutterMobileAdminAccountLinkRow> items;

  /// Whether the server reported another page.
  final bool hasMore;
}

/// The data port the capability depends on.
abstract class IamFlutterMobileAdminAccountBindingDataSource {
  /// Fetches one page, server-searched by [q].
  Future<IamFlutterMobileAdminAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
    String? q,
  });

  /// Reads the tenant binding policy.
  Future<IamFlutterMobileAdminAccountBindingPolicy> loadPolicy();

  /// Writes the tenant binding policy.
  Future<void> savePolicy(IamFlutterMobileAdminAccountBindingPolicy policy);
}

/// Tenant binding policy as the admin screen edits it.
///
/// Every flag is a real tenant decision, so none of them defaults to `true`: a policy the
/// server did not report must not read as permission.
class IamFlutterMobileAdminAccountBindingPolicy {
  const IamFlutterMobileAdminAccountBindingPolicy({
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

  /// Returns a copy with the named flags replaced.
  IamFlutterMobileAdminAccountBindingPolicy copyWith({
    bool? contactEnabled,
    bool? emailEnabled,
    bool? oauthEnabled,
    bool? selfServiceUnlinkEnabled,
  }) {
    return IamFlutterMobileAdminAccountBindingPolicy(
      contactEnabled: contactEnabled ?? this.contactEnabled,
      emailEnabled: emailEnabled ?? this.emailEnabled,
      oauthEnabled: oauthEnabled ?? this.oauthEnabled,
      selfServiceUnlinkEnabled: selfServiceUnlinkEnabled ?? this.selfServiceUnlinkEnabled,
    );
  }

  @override
  bool operator ==(Object other) =>
      other is IamFlutterMobileAdminAccountBindingPolicy &&
      other.contactEnabled == contactEnabled &&
      other.emailEnabled == emailEnabled &&
      other.oauthEnabled == oauthEnabled &&
      other.selfServiceUnlinkEnabled == selfServiceUnlinkEnabled;

  @override
  int get hashCode =>
      Object.hash(contactEnabled, emailEnabled, oauthEnabled, selfServiceUnlinkEnabled);
}

/// Physical paths this package's routes resolve to on Flutter.
const Map<String, String> iamFlutterMobileAdminAccountBindingRoutePaths = <String, String>{
  'admin.iam.account-binding.list': '/admin/iam/account-bindings',
};

/// Validation and error mapping of the `admin_account_binding` capability.
class IamFlutterMobileAdminAccountBindingService {
  const IamFlutterMobileAdminAccountBindingService({
    IamFlutterMobileAdminAccountBindingDataSource? dataSource,
  }) : _dataSource = dataSource;

  final IamFlutterMobileAdminAccountBindingDataSource? _dataSource;

  /// Fetches one page of linked identities.
  Future<IamFlutterMobileAdminAccountLinkPage> fetchLinksPage({
    required int page,
    required int pageSize,
    String? q,
  }) {
    return _requireDataSource().fetchLinksPage(page: page, pageSize: pageSize, q: q);
  }

  /// Reads the tenant binding policy.
  Future<IamFlutterMobileAdminAccountBindingPolicy> loadPolicy() =>
      _requireDataSource().loadPolicy();

  /// Writes the tenant binding policy.
  ///
  /// Refuses a policy whose flags are all off unless the caller says so explicitly: clearing
  /// every binding capability in one tap is almost always a mistake, and the server would
  /// accept it silently.
  Future<void> savePolicy(
    IamFlutterMobileAdminAccountBindingPolicy policy, {
    bool allowAllDisabled = false,
  }) {
    final bool allDisabled = !policy.contactEnabled &&
        !policy.emailEnabled &&
        !policy.oauthEnabled &&
        !policy.selfServiceUnlinkEnabled;
    if (allDisabled && !allowAllDisabled) {
      throw StateError(
        'Saving this policy would disable every binding capability; pass allowAllDisabled to '
        'confirm that is intended.',
      );
    }
    return _requireDataSource().savePolicy(policy);
  }

  /// Maps a physical Flutter location back to its cross-client route id.
  String? routeIdForPath(String path) {
    for (final MapEntry<String, String> entry
        in iamFlutterMobileAdminAccountBindingRoutePaths.entries) {
      if (entry.value == path) return entry.key;
    }
    return null;
  }

  IamFlutterMobileAdminAccountBindingDataSource _requireDataSource() {
    final IamFlutterMobileAdminAccountBindingDataSource? source = _dataSource;
    if (source == null) {
      throw StateError(
        'IamFlutterMobileAdminAccountBindingService requires an '
        'IamFlutterMobileAdminAccountBindingDataSource; the root bootstrap must inject one.',
      );
    }
    return source;
  }
}
