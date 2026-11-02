// SDKWORK-IAM-FLUTTER-OAUTH: authored state.
/**
 * Immutable presentation state of `sdkwork_iam_flutter_mobile_oauth`.
 *
 * Section 3 asks each root to pick one primary presentation-state pattern; this
 * root uses controllers, so state objects stay immutable and controllers emit them.
 */

import '../services/oauth_service.dart';

/// Lifecycle of the provider list.
enum IamFlutterMobileOauthStatus {
  /// Nothing requested yet.
  idle,

  /// The list is in flight.
  loading,

  /// Providers are available.
  ready,

  /// The load failed; [IamFlutterMobileOauthState.errorMessage] says why.
  error,
}

/// State of the `oauth` capability.
class IamFlutterMobileOauthState {
  const IamFlutterMobileOauthState({
    this.status = IamFlutterMobileOauthStatus.idle,
    this.providers = const <IamFlutterMobileOAuthProvider>[],
    this.startingKey,
    this.errorMessage,
  });

  /// Current lifecycle stage.
  final IamFlutterMobileOauthStatus status;

  /// Providers the tenant offers.
  final List<IamFlutterMobileOAuthProvider> providers;

  /// Provider whose authorization is being created, if any.
  final String? startingKey;

  /// User-safe failure text.
  final String? errorMessage;

  /// Providers that may actually be started.
  List<IamFlutterMobileOAuthProvider> get startable {
    return providers
        .where((IamFlutterMobileOAuthProvider provider) => provider.enabled)
        .toList(growable: false);
  }

  /// A copy that keeps every field.
  IamFlutterMobileOauthState copyWith({
    IamFlutterMobileOauthStatus? status,
    List<IamFlutterMobileOAuthProvider>? providers,
    String? startingKey,
    String? errorMessage,
  }) {
    return IamFlutterMobileOauthState(
      status: status ?? this.status,
      providers: providers ?? this.providers,
      startingKey: startingKey ?? this.startingKey,
      errorMessage: errorMessage ?? this.errorMessage,
    );
  }

  /// A copy for a fresh load.
  IamFlutterMobileOauthState asLoading() =>
      const IamFlutterMobileOauthState(status: IamFlutterMobileOauthStatus.loading);

  /// A copy that clears [startingKey] and keeps everything else.
  ///
  /// `copyWith(startingKey: null)` cannot express this: a null argument means "keep
  /// the current value", so the spinner would stay on after a successful request.
  IamFlutterMobileOauthState authorized() {
    return IamFlutterMobileOauthState(
      errorMessage: errorMessage,
      providers: providers,
      status: status,
    );
  }

  /// A copy that records the loaded providers.
  IamFlutterMobileOauthState loaded(List<IamFlutterMobileOAuthProvider> value) {
    return IamFlutterMobileOauthState(
      providers: value,
      status: IamFlutterMobileOauthStatus.ready,
    );
  }

  /// A copy that records a failure, keeping the providers already shown.
  IamFlutterMobileOauthState failed(String message) {
    return IamFlutterMobileOauthState(
      errorMessage: message,
      providers: providers,
      status: providers.isEmpty ? IamFlutterMobileOauthStatus.error : IamFlutterMobileOauthStatus.ready,
    );
  }
}
