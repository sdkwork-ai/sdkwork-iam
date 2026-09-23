// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_console_cloud_account`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

/// State of the `console_cloud_account` capability.
class IamFlutterMobileConsoleCloudAccountState {
  const IamFlutterMobileConsoleCloudAccountState({
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
  IamFlutterMobileConsoleCloudAccountState copyWith({
    bool? loading,
    String? errorKey,
    List<String>? items,
  }) {
    return IamFlutterMobileConsoleCloudAccountState(
      loading: loading ?? this.loading,
      errorKey: errorKey ?? this.errorKey,
      items: items ?? this.items,
    );
  }
}
