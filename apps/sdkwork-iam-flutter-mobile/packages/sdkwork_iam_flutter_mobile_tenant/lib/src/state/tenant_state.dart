// SDKWORK-IAM-FLUTTER-TENANT: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_tenant`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/tenant_service.dart';

/// Lifecycle of the overview load.
enum IamFlutterMobileTenantStatus {
  /// Nothing requested yet.
  idle,

  /// A request is in flight.
  loading,

  /// The overview is available.
  ready,

  /// The load failed; [IamFlutterMobileTenantState.errorMessage] says why.
  error,
}

/// State of the `tenant` capability.
class IamFlutterMobileTenantState {
  const IamFlutterMobileTenantState({
    this.status = IamFlutterMobileTenantStatus.idle,
    this.overview,
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileTenantStatus status;

  /// Loaded overview, when [status] is ready.
  final IamFlutterMobileTenantOverview? overview;

  /// User-safe failure text, when [status] is error.
  final String? errorMessage;

  /// True while a request is in flight.
  bool get loading => status == IamFlutterMobileTenantStatus.loading;

  /// A copy that keeps every field.
  IamFlutterMobileTenantState copyWith({
    IamFlutterMobileTenantStatus? status,
    IamFlutterMobileTenantOverview? overview,
    String? errorMessage,
  }) {
    return IamFlutterMobileTenantState(
      status: status ?? this.status,
      overview: overview ?? this.overview,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  /// A copy that clears the error and the previous overview, for a fresh load.
  ///
  /// This exists because `copyWith(errorMessage: null)` keeps the old value: an
  /// explicit clearing constructor is the only way to say "no error" without
  /// accidentally carrying the previous failure across a retry.
  IamFlutterMobileTenantState asLoading() {
    return const IamFlutterMobileTenantState(status: IamFlutterMobileTenantStatus.loading);
  }

  /// A copy that records a failure.
  IamFlutterMobileTenantState failed(String message) {
    return IamFlutterMobileTenantState(
      errorMessage: message,
      overview: overview,
      status: IamFlutterMobileTenantStatus.error,
    );
  }

  /// A copy that records a successful load.
  IamFlutterMobileTenantState loaded(IamFlutterMobileTenantOverview value) {
    return IamFlutterMobileTenantState(
      overview: value,
      status: IamFlutterMobileTenantStatus.ready,
    );
  }
}
