// SDKWORK-IAM-FLUTTER-CONSOLE-TENANT: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_console_tenant`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/console_tenant_service.dart';

/// Lifecycle of the console workspace.
enum IamFlutterMobileConsoleTenantStatus {
  /// Nothing requested yet.
  idle,

  /// The first load is in flight.
  loading,

  /// Identity, policy and organizations are available.
  ready,

  /// The first load failed; [IamFlutterMobileConsoleTenantState.errorMessage] says why.
  error,
}

/// State of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantState {
  const IamFlutterMobileConsoleTenantState({
    this.status = IamFlutterMobileConsoleTenantStatus.idle,
    this.runtime,
    this.policy,
    this.organizations = const <IamFlutterMobileConsoleTenantOrganization>[],
    this.hasMore = false,
    this.loadingMore = false,
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileConsoleTenantStatus status;

  /// Session context, when loaded.
  final IamFlutterMobileConsoleTenantRuntime? runtime;

  /// Tenant policy, when loaded.
  final IamFlutterMobileConsoleTenantPolicy? policy;

  /// Organizations loaded so far.
  final List<IamFlutterMobileConsoleTenantOrganization> organizations;

  /// Whether the server reported another organization page.
  final bool hasMore;

  /// True while a follow-up page is in flight.
  final bool loadingMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// A copy that keeps every field.
  IamFlutterMobileConsoleTenantState copyWith({
    IamFlutterMobileConsoleTenantStatus? status,
    IamFlutterMobileConsoleTenantRuntime? runtime,
    IamFlutterMobileConsoleTenantPolicy? policy,
    List<IamFlutterMobileConsoleTenantOrganization>? organizations,
    bool? hasMore,
    bool? loadingMore,
    String? errorMessage,
  }) {
    return IamFlutterMobileConsoleTenantState(
      status: status ?? this.status,
      runtime: runtime ?? this.runtime,
      policy: policy ?? this.policy,
      organizations: organizations ?? this.organizations,
      hasMore: hasMore ?? this.hasMore,
      loadingMore: loadingMore ?? this.loadingMore,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  /// A copy for a fresh load.
  IamFlutterMobileConsoleTenantState asLoading() =>
      const IamFlutterMobileConsoleTenantState(status: IamFlutterMobileConsoleTenantStatus.loading);

  /// A copy that records a completed load.
  IamFlutterMobileConsoleTenantState loaded({
    required IamFlutterMobileConsoleTenantRuntime nextRuntime,
    required IamFlutterMobileConsoleTenantPolicy nextPolicy,
    required IamFlutterMobileConsoleTenantOrganizationPage page,
  }) {
    return IamFlutterMobileConsoleTenantState(
      hasMore: page.hasMore,
      organizations: page.items,
      policy: nextPolicy,
      runtime: nextRuntime,
      status: IamFlutterMobileConsoleTenantStatus.ready,
    );
  }

  /// A copy that records a failure, keeping whatever was already shown.
  IamFlutterMobileConsoleTenantState failed(String message) {
    return IamFlutterMobileConsoleTenantState(
      errorMessage: message,
      hasMore: hasMore,
      organizations: organizations,
      policy: policy,
      runtime: runtime,
      status: organizations.isEmpty
          ? IamFlutterMobileConsoleTenantStatus.error
          : IamFlutterMobileConsoleTenantStatus.ready,
    );
  }
}
