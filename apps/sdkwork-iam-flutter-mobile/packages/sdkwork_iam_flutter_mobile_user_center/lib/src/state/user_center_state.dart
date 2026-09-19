// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

/// State of the `user_center` capability.
class IamFlutterMobileUserCenterState {
  const IamFlutterMobileUserCenterState({
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
  IamFlutterMobileUserCenterState copyWith({
    bool? loading,
    String? errorKey,
    List<String>? items,
  }) {
    return IamFlutterMobileUserCenterState(
      loading: loading ?? this.loading,
      errorKey: errorKey ?? this.errorKey,
      items: items ?? this.items,
    );
  }
}
