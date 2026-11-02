// SDKWORK-IAM-FLUTTER-OAUTH: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_oauth`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/oauth_service.dart';
import '../state/oauth_state.dart';

/// Presentation controller of the `oauth` capability.
class IamFlutterMobileOauthController {
  IamFlutterMobileOauthController({IamFlutterMobileOAuthService? service})
      : _service = service ?? const IamFlutterMobileOAuthService();

  final IamFlutterMobileOAuthService _service;
  final List<void Function(IamFlutterMobileOauthState)> _listeners =
      <void Function(IamFlutterMobileOauthState)>[];

  IamFlutterMobileOauthState _state = const IamFlutterMobileOauthState();

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileOauthState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileOauthState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileOauthState next) {
    _state = next;
    for (final void Function(IamFlutterMobileOauthState) listener
        in List<void Function(IamFlutterMobileOauthState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the provider list.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final List<IamFlutterMobileOAuthProvider> providers = await _service.loadProviders();
      if (requestId != _requestId) return;
      _emit(_state.loaded(providers));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Creates the authorization URL for [providerKey].
  ///
  /// Returns the URL for the host to open, or null when the request failed; the
  /// failure is left in state so the screen can show it. Opening the URL is the
  /// host's job: this package never touches a platform plugin.
  Future<String?> authorize(String providerKey) async {
    if (_state.startingKey != null) return null;
    _emit(_state.copyWith(errorMessage: null, startingKey: providerKey));
    try {
      final String url = await _service.createAuthorizationUrl(providerKey);
      _emit(_state.authorized());
      return url;
    } catch (error) {
      _emit(_state.copyWith(startingKey: null).failed(_describe(error)));
      return null;
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
