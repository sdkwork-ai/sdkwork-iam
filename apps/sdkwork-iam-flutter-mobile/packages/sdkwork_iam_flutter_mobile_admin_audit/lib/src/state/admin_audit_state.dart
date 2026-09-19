// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_audit`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

/// State of the `admin_audit` capability.
class IamFlutterMobileAdminAuditState {
  const IamFlutterMobileAdminAuditState({
    this.loading = false,
    this.errorKey,
    this.items = const <String>[],
  });

  /// True while a request is in flight.
  final bool loading;

  /// Locale key of the last user-safe failure, or null.
  final String? errorKey;

  /// Identifiers of the records currently displayed.
  final List<String> items;

  /// Returns a copy with the named fields replaced.
  IamFlutterMobileAdminAuditState copyWith({
    bool? loading,
    String? errorKey,
    List<String>? items,
  }) {
    return IamFlutterMobileAdminAuditState(
      loading: loading ?? this.loading,
      errorKey: errorKey ?? this.errorKey,
      items: items ?? this.items,
    );
  }
}
