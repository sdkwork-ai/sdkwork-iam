// SDKWORK-IAM-FLUTTER-ADMIN-ORGANIZATION: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_admin_organization`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this root uses
 * controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/admin_organization_service.dart';

/// Lifecycle of the organization tree.
enum IamFlutterMobileAdminOrganizationStatus {
  /// Nothing requested yet.
  idle,

  /// The tree is in flight.
  loading,

  /// Rows are available.
  ready,

  /// The load failed; [IamFlutterMobileAdminOrganizationState.errorMessage] says why.
  error,
}

/// State of the `admin_organization` capability.
class IamFlutterMobileAdminOrganizationState {
  const IamFlutterMobileAdminOrganizationState({
    this.status = IamFlutterMobileAdminOrganizationStatus.idle,
    this.entries = const <IamFlutterMobileAdminOrganizationEntry>[],
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileAdminOrganizationStatus status;

  /// Flattened rows, depth-first.
  final List<IamFlutterMobileAdminOrganizationEntry> entries;

  /// User-safe failure text.
  final String? errorMessage;

  /// A copy for a fresh load.
  IamFlutterMobileAdminOrganizationState asLoading() =>
      const IamFlutterMobileAdminOrganizationState(
        status: IamFlutterMobileAdminOrganizationStatus.loading,
      );

  /// A copy that records a completed load.
  IamFlutterMobileAdminOrganizationState loaded(
    List<IamFlutterMobileAdminOrganizationEntry> nextEntries,
  ) {
    return IamFlutterMobileAdminOrganizationState(
      entries: nextEntries,
      status: IamFlutterMobileAdminOrganizationStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the rows already loaded.
  IamFlutterMobileAdminOrganizationState failed(String message) {
    return IamFlutterMobileAdminOrganizationState(
      entries: entries,
      errorMessage: message,
      // A reload that fails keeps the tree on screen: an operator mid-scroll should not lose
      // the hierarchy because a refresh timed out.
      status: entries.isEmpty
          ? IamFlutterMobileAdminOrganizationStatus.error
          : IamFlutterMobileAdminOrganizationStatus.ready,
    );
  }
}
