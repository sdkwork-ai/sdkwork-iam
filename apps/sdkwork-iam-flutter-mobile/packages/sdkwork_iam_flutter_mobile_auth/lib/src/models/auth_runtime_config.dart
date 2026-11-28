// SDKWORK-IAM-FLUTTER-AUTH: authored runtime configuration.
/**
 * Host-provided auth policy of the mobile auth surface.
 *
 * Every list is optional so a host that has not adopted the policy model keeps
 * the historical password-only screen. When a list is present, an empty list is
 * the explicit "flow disabled" state: an empty register list hides registration
 * instead of falling back to a default method.
 */

/// Verification policy of the contact-channel code flows.
class IamFlutterMobileAuthVerificationPolicy {
  const IamFlutterMobileAuthVerificationPolicy({
    this.emailCodeLoginEnabled,
    this.emailRegistrationVerificationRequired,
    this.phoneCodeLoginEnabled,
    this.phoneRegistrationVerificationRequired,
  });

  final bool? emailCodeLoginEnabled;
  final bool? emailRegistrationVerificationRequired;
  final bool? phoneCodeLoginEnabled;
  final bool? phoneRegistrationVerificationRequired;
}

/// Auth policy fetched from the application's public auth-runtime endpoint.
class IamFlutterMobileAuthRuntimeConfig {
  const IamFlutterMobileAuthRuntimeConfig({
    this.loginMethods,
    this.registerMethods,
    this.recoveryMethods,
    this.oauthLoginEnabled,
    this.verificationPolicy,
  });

  /// Supported sign-in grants: `password`, `emailCode`, `phoneCode`.
  final List<String>? loginMethods;

  /// Supported registration methods: `username`, `email`, `phone`.
  final List<String>? registerMethods;

  /// Supported password-recovery channels: `email`, `phone`.
  final List<String>? recoveryMethods;

  final bool? oauthLoginEnabled;

  final IamFlutterMobileAuthVerificationPolicy? verificationPolicy;

  /// True when the password grant is offered.
  ///
  /// A host that has not adopted the policy model (`loginMethods == null`) keeps
  /// the historical password screen.
  bool get passwordLoginEnabled => loginMethods?.contains('password') ?? true;

  bool get emailCodeLoginEnabled =>
      (loginMethods?.contains('emailCode') ?? false) &&
      (verificationPolicy?.emailCodeLoginEnabled ?? true);

  bool get phoneCodeLoginEnabled =>
      (loginMethods?.contains('phoneCode') ?? false) &&
      (verificationPolicy?.phoneCodeLoginEnabled ?? true);

  /// True when a phone or email verification code can be used to sign in.
  bool get codeLoginEnabled => emailCodeLoginEnabled || phoneCodeLoginEnabled;

  /// True when the registration entry is offered.
  ///
  /// Registration is off unless the host explicitly lists a method: the
  /// historical screen never had a register entry, so an absent list must not
  /// invent one.
  bool get registerEnabled => registerMethods?.isNotEmpty ?? false;

  /// True when the forgot-password entry is offered.
  ///
  /// The historical screen already exposed it, so an absent list keeps it.
  bool get recoveryEnabled => recoveryMethods?.isNotEmpty ?? true;

  /// The code-login channel for [account], or null when that channel is off.
  String? codeLoginChannel(String account) {
    if (account.contains('@')) {
      return emailCodeLoginEnabled ? 'email' : null;
    }
    return phoneCodeLoginEnabled ? 'phone' : null;
  }

  /// Whether a code-login grant exists for [account].
  bool codeLoginEnabledFor(String account) =>
      codeLoginChannel(account) != null;

  /// The registration method for [account], or null when it is not offered.
  String? registerMethod(String account) {
    final methods = registerMethods;
    if (methods == null || methods.isEmpty) return null;
    if (account.contains('@')) {
      return methods.contains('email') ? 'email' : null;
    }
    if (looksLikeIamFlutterMobileAuthPhone(account)) {
      return methods.contains('phone') ? 'phone' : null;
    }
    return methods.contains('username') ? 'username' : null;
  }

  /// Whether registering [account] needs a verification code.
  bool registerVerificationRequired(String account) {
    if (account.contains('@')) {
      return verificationPolicy?.emailRegistrationVerificationRequired ?? false;
    }
    if (looksLikeIamFlutterMobileAuthPhone(account)) {
      return verificationPolicy?.phoneRegistrationVerificationRequired ?? false;
    }
    return false;
  }
}

final RegExp _iamFlutterMobileAuthPhonePattern =
    RegExp(r'^\+?[0-9][0-9\s-]{5,19}$');

/// True when [value] looks like a dialable phone number.
///
/// Registration and code login choose their channel from the account text, so
/// the same predicate must gate both.
bool looksLikeIamFlutterMobileAuthPhone(String value) =>
    _iamFlutterMobileAuthPhonePattern.hasMatch(value.trim());
