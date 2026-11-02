// SDKWORK-IAM-FLUTTER-CONSOLE-ACCOUNT-BINDING: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_console_account_binding`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/console_account_binding_service.dart';

/// Lifecycle of the console binding workspace.
enum IamFlutterMobileConsoleAccountBindingStatus {
  /// Nothing requested yet.
  idle,

  /// The first load is in flight.
  loading,

  /// Policy and links are available.
  ready,

  /// The first load failed; [IamFlutterMobileConsoleAccountBindingState.errorMessage] says why.
  error,
}

/// State of the `console_account_binding` capability.
class IamFlutterMobileConsoleAccountBindingState {
  const IamFlutterMobileConsoleAccountBindingState({
    this.status = IamFlutterMobileConsoleAccountBindingStatus.idle,
    this.policy,
    this.links = const <IamFlutterMobileConsoleAccountLink>[],
    this.errorMessage,
    this.unlinkingId,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileConsoleAccountBindingStatus status;

  /// Tenant policy, decided before any removal is offered.
  final IamFlutterMobileConsoleAccountBindingPolicy? policy;

  /// Linked identities loaded so far.
  final List<IamFlutterMobileConsoleAccountLink> links;

  /// User-safe failure text.
  final String? errorMessage;

  /// Id of the link whose removal is in flight, if any.
  final String? unlinkingId;

  /// Whether the removal action may be offered at all.
  ///
  /// Both the tenant grant and an existing link are required: an action that can only fail
  /// is not rendered.
  bool get canUnlink =>
      (policy?.selfServiceUnlinkEnabled ?? false) && links.isNotEmpty;

  /// A copy that keeps every field.
  IamFlutterMobileConsoleAccountBindingState copyWith({
    IamFlutterMobileConsoleAccountBindingStatus? status,
    IamFlutterMobileConsoleAccountBindingPolicy? policy,
    List<IamFlutterMobileConsoleAccountLink>? links,
    String? errorMessage,
    String? unlinkingId,
  }) {
    return IamFlutterMobileConsoleAccountBindingState(
      status: status ?? this.status,
      policy: policy ?? this.policy,
      links: links ?? this.links,
      errorMessage: errorMessage ?? this.errorMessage,
      unlinkingId: unlinkingId ?? this.unlinkingId,
    );
  }

  /// A copy for a fresh load.
  IamFlutterMobileConsoleAccountBindingState asLoading() =>
      const IamFlutterMobileConsoleAccountBindingState(
        status: IamFlutterMobileConsoleAccountBindingStatus.loading,
      );

  /// A copy that records a completed load.
  IamFlutterMobileConsoleAccountBindingState loaded({
    required IamFlutterMobileConsoleAccountBindingPolicy nextPolicy,
    required List<IamFlutterMobileConsoleAccountLink> nextLinks,
  }) {
    return IamFlutterMobileConsoleAccountBindingState(
      links: nextLinks,
      policy: nextPolicy,
      status: IamFlutterMobileConsoleAccountBindingStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the links already shown.
  IamFlutterMobileConsoleAccountBindingState failed(String message) {
    return IamFlutterMobileConsoleAccountBindingState(
      errorMessage: message,
      links: links,
      policy: policy,
      status: links.isEmpty
          ? IamFlutterMobileConsoleAccountBindingStatus.error
          : IamFlutterMobileConsoleAccountBindingStatus.ready,
    );
  }
}
