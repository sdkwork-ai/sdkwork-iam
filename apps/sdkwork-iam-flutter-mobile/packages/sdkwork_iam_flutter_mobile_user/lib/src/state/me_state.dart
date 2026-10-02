// Authored extension (pre-existing package): immutable presentation state of
// the user-center "Me" page, mirroring `SdkworkIamUserCenterMeState` from the
// cross-architecture headless core.
import '../models/me_view_model.dart';

/// Load phase of the Me page.
enum IamFlutterMobileUserMeStatus { idle, loading, ready, error }

/// State of the "Me" page; controllers emit immutable snapshots.
class IamFlutterMobileUserMeState {
  const IamFlutterMobileUserMeState({
    this.status = IamFlutterMobileUserMeStatus.idle,
    this.contextSummary,
    this.lastError,
    this.menu = const <IamFlutterMobileUserMeMenuSection>[],
    this.profile,
    this.signedOut = false,
    this.signingOut = false,
  });

  final IamFlutterMobileUserMeStatus status;
  final IamFlutterMobileUserMeContextSummary? contextSummary;

  /// User-safe failure text of the last attempt, or null.
  final String? lastError;
  final List<IamFlutterMobileUserMeMenuSection> menu;
  final IamFlutterMobileUserMeProfile? profile;

  /// True after a completed sign-out; sensitive fields are cleared by then.
  final bool signedOut;
  final bool signingOut;

  /// Returns a copy with the named fields replaced.
  IamFlutterMobileUserMeState copyWith({
    IamFlutterMobileUserMeStatus? status,
    IamFlutterMobileUserMeContextSummary? contextSummary,
    bool clearContextSummary = false,
    String? lastError,
    bool clearLastError = false,
    List<IamFlutterMobileUserMeMenuSection>? menu,
    IamFlutterMobileUserMeProfile? profile,
    bool clearProfile = false,
    bool? signedOut,
    bool? signingOut,
  }) {
    return IamFlutterMobileUserMeState(
      status: status ?? this.status,
      contextSummary:
          clearContextSummary ? null : (contextSummary ?? this.contextSummary),
      lastError: clearLastError ? null : (lastError ?? this.lastError),
      menu: menu ?? this.menu,
      profile: clearProfile ? null : (profile ?? this.profile),
      signedOut: signedOut ?? this.signedOut,
      signingOut: signingOut ?? this.signingOut,
    );
  }
}
