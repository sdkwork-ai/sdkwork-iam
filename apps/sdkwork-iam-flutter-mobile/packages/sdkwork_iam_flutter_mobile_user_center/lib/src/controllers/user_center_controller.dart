// SDKWORK-IAM-FLUTTER-USER-CENTER: authored controller.
/**
 * Presentation logic of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Controllers call services and emit immutable state. They never construct SDK
 * clients, never read runtime configuration and never call platform plugins
 * (section 5).
 */

import '../services/user_center_service.dart';
import '../state/user_center_state.dart';

/// Presentation controller of the `user_center` capability.
class IamFlutterMobileUserCenterController {
  IamFlutterMobileUserCenterController({IamFlutterMobileUserCenterService? service})
      : _service = service ?? const IamFlutterMobileUserCenterService();

  final IamFlutterMobileUserCenterService _service;
  final List<void Function(IamFlutterMobileUserCenterState)> _listeners =
      <void Function(IamFlutterMobileUserCenterState)>[];

  IamFlutterMobileUserCenterState _state = const IamFlutterMobileUserCenterState();

  /// Bumped per load so a slow answer cannot overwrite a newer one.
  int _requestId = 0;

  /// Current state.
  IamFlutterMobileUserCenterState get state => _state;

  /// Registers a state listener and returns its unsubscribe callback.
  void Function() addListener(void Function(IamFlutterMobileUserCenterState) listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void _emit(IamFlutterMobileUserCenterState next) {
    _state = next;
    for (final void Function(IamFlutterMobileUserCenterState) listener
        in List<void Function(IamFlutterMobileUserCenterState)>.of(_listeners)) {
      listener(next);
    }
  }

  /// Loads the current profile.
  Future<void> load() async {
    final int requestId = _requestId + 1;
    _requestId = requestId;
    _emit(_state.asLoading());
    try {
      final IamFlutterMobileUserProfile profile = await _service.loadProfile();
      if (requestId != _requestId) return;
      _emit(_state.loaded(profile));
    } catch (error) {
      if (requestId != _requestId) return;
      _emit(_state.failed(_describe(error)));
    }
  }

  /// Saves the editable profile fields.
  ///
  /// The failure is recorded in state rather than rethrown, so the form needs no
  /// try/catch; the returned flag lets the screen keep the form open on failure.
  Future<bool> saveProfile(IamFlutterMobileUserProfileDraft draft) async {
    if (_state.savingProfile) return false;
    _emit(_state.copyWith(errorMessage: null, notice: null, savingProfile: true));
    try {
      final IamFlutterMobileUserProfile profile = await _service.updateProfile(draft);
      _emit(_state.loaded(profile).succeeded(''));
      return true;
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Changes the current password.
  Future<bool> changePassword(IamFlutterMobileUserPasswordDraft draft) async {
    if (_state.savingPassword) return false;
    _emit(_state.copyWith(errorMessage: null, notice: null, savingPassword: true));
    try {
      await _service.changePassword(draft);
      _emit(_state.succeeded(''));
      return true;
    } catch (error) {
      _emit(_state.failed(_describe(error)));
      return false;
    }
  }

  /// Renders a thrown value as user-safe text.
  String _describe(Object error) => error is StateError ? error.message : '$error';

  /// Resolves the cross-client route id for a physical Flutter location.
  String? routeIdForPath(String path) => _service.routeIdForPath(path);
}
