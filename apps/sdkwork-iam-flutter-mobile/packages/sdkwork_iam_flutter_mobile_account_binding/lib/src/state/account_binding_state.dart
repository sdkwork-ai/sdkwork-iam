// SDKWORK-IAM-FLUTTER-ACCOUNT-BINDING: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_account_binding`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/account_binding_service.dart';

/// Lifecycle of the bindings view.
enum IamFlutterMobileAccountBindingStatus {
  /// Nothing requested yet.
  idle,

  /// The first load is in flight.
  loading,

  /// Policy and links are available.
  ready,

  /// The first load failed; [IamFlutterMobileAccountBindingState.errorMessage] says why.
  error,
}

/// State of the `account_binding` capability.
class IamFlutterMobileAccountBindingState {
  const IamFlutterMobileAccountBindingState({
    this.status = IamFlutterMobileAccountBindingStatus.idle,
    this.policy = const IamFlutterMobileAccountBindingPolicy(),
    this.links = const <IamFlutterMobileAccountLink>[],
    this.hasMore = false,
    this.errorMessage,
    this.unlinkingId,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAccountBindingStatus status;

  /// Tenant policy, decided before any action is offered.
  final IamFlutterMobileAccountBindingPolicy policy;

  /// Linked identities loaded so far.
  final List<IamFlutterMobileAccountLink> links;

  /// Whether the server reported another page.
  final bool hasMore;

  /// User-safe failure text.
  final String? errorMessage;

  /// Id of the link whose removal is in flight, if any.
  final String? unlinkingId;

  /// Whether the unlink action may be offered at all.
  ///
  /// Both the tenant grant and an existing link are required: an action that can
  /// only fail is not rendered.
  bool get canUnlink => policy.selfServiceUnlinkEnabled && links.isNotEmpty;

  /// A copy that keeps every field.
  IamFlutterMobileAccountBindingState copyWith({
    IamFlutterMobileAccountBindingStatus? status,
    IamFlutterMobileAccountBindingPolicy? policy,
    List<IamFlutterMobileAccountLink>? links,
    bool? hasMore,
    String? errorMessage,
    String? unlinkingId,
  }) {
    return IamFlutterMobileAccountBindingState(
      status: status ?? this.status,
      policy: policy ?? this.policy,
      links: links ?? this.links,
      hasMore: hasMore ?? this.hasMore,
      errorMessage: errorMessage ?? this.errorMessage,
      unlinkingId: unlinkingId ?? this.unlinkingId,
    );
  }

  /// A copy for a fresh load.
  IamFlutterMobileAccountBindingState asLoading() {
    return IamFlutterMobileAccountBindingState(
      policy: policy,
      status: IamFlutterMobileAccountBindingStatus.loading,
    );
  }

  /// A copy that records a successful load.
  IamFlutterMobileAccountBindingState loaded({
    required IamFlutterMobileAccountBindingPolicy nextPolicy,
    required List<IamFlutterMobileAccountLink> nextLinks,
    required bool more,
  }) {
    return IamFlutterMobileAccountBindingState(
      hasMore: more,
      links: nextLinks,
      policy: nextPolicy,
      status: IamFlutterMobileAccountBindingStatus.ready,
    );
  }

  /// A copy that records a failure, keeping whatever was already shown.
  IamFlutterMobileAccountBindingState failed(String message) {
    return IamFlutterMobileAccountBindingState(
      errorMessage: message,
      hasMore: hasMore,
      links: links,
      policy: policy,
      status: links.isEmpty
          ? IamFlutterMobileAccountBindingStatus.error
          : IamFlutterMobileAccountBindingStatus.ready,
    );
  }
}
