// Authored extension (pre-existing package): state controller of the
// user-center "Me" page. Parity with `createSdkworkIamUserCenterMeController`
// in `@sdkwork/iam-user-center-core`: collaborators are injected (no client
// construction here), awaits are bounded, and sign-out clears every sensitive
// page field (APP_MOBILE_REACT_UI_SPEC.md section 6 semantics).
import '../models/me_view_model.dart';
import '../state/me_state.dart';

/// Framework-independent controller of the "Me" page.
class IamFlutterMobileUserMeController {
  IamFlutterMobileUserMeController({
    required IamFlutterMobileUserMeProfileRetriever retrieveProfile,
    required IamFlutterMobileUserMeSessionRetriever retrieveSession,
    required IamFlutterMobileUserMeSignOut signOut,
    this.requestTimeout = const Duration(seconds: 15),
    List<IamFlutterMobileUserMeMenuSection> Function(IamFlutterMobileUserMeProfile? profile)?
        menuSections,
  })  : _retrieveProfile = retrieveProfile,
        _retrieveSession = retrieveSession,
        _signOut = signOut,
        _menuSections =
            menuSections ?? ((IamFlutterMobileUserMeProfile? profile) {
          return iamFlutterMobileUserMeDefaultMenuSections(profile: profile);
        });

  final IamFlutterMobileUserMeProfileRetriever _retrieveProfile;
  final IamFlutterMobileUserMeSessionRetriever _retrieveSession;
  final IamFlutterMobileUserMeSignOut _signOut;
  final Duration requestTimeout;
  List<IamFlutterMobileUserMeMenuSection> Function(IamFlutterMobileUserMeProfile? profile)
      _menuSections;

  IamFlutterMobileUserMeState _state = const IamFlutterMobileUserMeState();
  final Set<void Function(IamFlutterMobileUserMeState state)> _listeners =
      <void Function(IamFlutterMobileUserMeState state)>{};

  /// Latest immutable snapshot.
  IamFlutterMobileUserMeState get state => _state;

  /// Subscribes to state changes; returns an unsubscribe closure. Listeners
  /// are invoked synchronously on every transition.
  void Function() addListener(void Function(IamFlutterMobileUserMeState state) listener) {
    _listeners.add(listener);
    return () {
      _listeners.remove(listener);
    };
  }

  void _emit(IamFlutterMobileUserMeState next) {
    _state = next;
    for (final void Function(IamFlutterMobileUserMeState state) listener in List.of(_listeners)) {
      listener(next);
    }
  }

  /// Replaces the menu factory; takes effect immediately.
  void setMenuSections(
    List<IamFlutterMobileUserMeMenuSection> Function(IamFlutterMobileUserMeProfile? profile)
        factory,
  ) {
    _menuSections = factory;
    _emit(_state.copyWith(menu: _menuSections(_state.profile)));
  }

  /// Loads the current profile and session context into [IamFlutterMobileUserMeStatus.ready].
  Future<void> refresh() async {
    _emit(_state.copyWith(
      status: IamFlutterMobileUserMeStatus.loading,
      clearLastError: true,
      lastError: null,
      signedOut: false,
    ));
    try {
      final Map<String, dynamic> profilePayload =
          await iamFlutterMobileUserMeAwaitWithTimeout(
              _retrieveProfile(), requestTimeout, 'user.current.retrieve');
      final Map<String, dynamic>? sessionPayload =
          await iamFlutterMobileUserMeAwaitWithTimeout(
              _retrieveSession(), requestTimeout, 'session.current.retrieve');
      final IamFlutterMobileUserMeProfile? profile =
          iamFlutterMobileUserMeProfileFromPayload(profilePayload);
      final IamFlutterMobileUserMeContextSummary? context =
          iamFlutterMobileUserMeContextFromPayload(sessionPayload);
      _emit(_state.copyWith(
        status: IamFlutterMobileUserMeStatus.ready,
        clearLastError: true,
        lastError: null,
        contextSummary: context,
        menu: _menuSections(profile),
        profile: profile,
        signingOut: false,
      ));
    } catch (error) {
      _emit(_state.copyWith(
        status: IamFlutterMobileUserMeStatus.error,
        lastError: error.toString(),
      ));
    }
  }

  /// Deletes the current session and clears every sensitive page field.
  Future<void> performSignOut() async {
    _emit(_state.copyWith(
      clearLastError: true,
      lastError: null,
      signingOut: true,
    ));
    try {
      await iamFlutterMobileUserMeAwaitWithTimeout(
          _signOut(), requestTimeout, 'session.current.delete');
      _emit(const IamFlutterMobileUserMeState(
        status: IamFlutterMobileUserMeStatus.idle,
        menu: <IamFlutterMobileUserMeMenuSection>[],
        signedOut: true,
      ));
    } catch (error) {
      _emit(_state.copyWith(
        lastError: error.toString(),
        signingOut: false,
      ));
      rethrow;
    }
  }

  /// Releases listeners; safe to call multiple times.
  Future<void> dispose() async {
    _listeners.clear();
  }
}
