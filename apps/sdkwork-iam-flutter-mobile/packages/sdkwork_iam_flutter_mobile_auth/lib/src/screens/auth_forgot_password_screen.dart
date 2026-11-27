// SDKWORK-IAM-FLUTTER-AUTH: authored screen.
/**
 * Password reset screen of the `auth` capability
 * (`app.iam.auth.forgot-password`, `/auth/forgot-password`).
 *
 * Two steps on one screen, because the second field is meaningless without the
 * first: ask for a code, then exchange the code for a new password. Splitting them
 * into two routes would let a user land on the exchange step with no code.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../services/auth_service.dart';
import '../state/auth_state.dart';
import 'auth_form_layout.dart';

/// Password reset screen of the `auth` capability.
class IamFlutterMobileAuthForgotPasswordScreen extends StatefulWidget {
  const IamFlutterMobileAuthForgotPasswordScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onReset,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAuthController? controller;

  /// Invoked after a successful reset, so the shell can return to sign-in.
  final VoidCallback? onReset;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.auth.forgot-password.title';

  @override
  State<IamFlutterMobileAuthForgotPasswordScreen> createState() =>
      _IamFlutterMobileAuthForgotPasswordScreenState();
}

class _IamFlutterMobileAuthForgotPasswordScreenState
    extends State<IamFlutterMobileAuthForgotPasswordScreen> {
  late final IamFlutterMobileAuthController _controller =
      widget.controller ?? IamFlutterMobileAuthController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAuthState _state;

  final TextEditingController _account = TextEditingController();
  final TextEditingController _code = TextEditingController();
  final TextEditingController _newPassword = TextEditingController();
  final TextEditingController _confirmPassword = TextEditingController();
  bool _obscureNewPassword = true;
  bool _obscureConfirmPassword = true;

  /// Local validation result of the last submit.
  IamFlutterMobileAuthResetProblem? _problem;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAuthState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    _account.dispose();
    _code.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  IamFlutterMobileAuthResetDraft get _draft => IamFlutterMobileAuthResetDraft(
        account: _account.text,
        code: _code.text,
        confirmPassword: _confirmPassword.text,
        newPassword: _newPassword.text,
      );

  Future<void> _sendCode() async {
    final bool sent = await _controller.requestResetCode(_account.text);
    if (!mounted || !sent) return;
    setState(() => _problem = null);
  }

  Future<void> _submit() async {
    final IamFlutterMobileAuthResetProblem? problem =
        validateIamFlutterMobileAuthResetDraft(_draft);
    setState(() => _problem = problem);
    if (problem != null) return;
    final bool reset = await _controller.resetPassword(_draft);
    if (!mounted || !reset) return;
    // The code and both passwords are single-use secrets; clearing them keeps them
    // out of a screen the user may leave open.
    _code.clear();
    _newPassword.clear();
    _confirmPassword.clear();
    widget.onReset?.call();
  }

  String? _problemMessage() {
    final IamFlutterMobileAuthResetProblem? problem = _problem;
    if (problem == null) return null;
    switch (problem) {
      case IamFlutterMobileAuthResetProblem.accountRequired:
        return _message('accountRequired');
      case IamFlutterMobileAuthResetProblem.codeRequired:
        return _message('codeRequired');
      case IamFlutterMobileAuthResetProblem.newPasswordTooShort:
        return _message('newPasswordTooShort');
      case IamFlutterMobileAuthResetProblem.confirmMismatch:
        return _message('confirmMismatch');
    }
  }

  @override
  Widget build(BuildContext context) {
    final String? problem = _problemMessage();
    return SdkworkScaffold(
      titleKey: _message('forgotTitle'),
      fullBleedBody: true,
      body: IamAuthFormLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(_message('forgotSubtitle'),
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Semantics(
              label: _message('accountLabel'),
              child: TextField(
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const <String>[AutofillHints.username],
                decoration:
                    InputDecoration(labelText: _message('accountLabel')),
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.next,
                controller: _account,
              ),
            ),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            OutlinedButton(
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _state.sendingCode ? null : _sendCode,
              child: _state.sendingCode
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_message('sendCodeAction')),
            ),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Semantics(
              label: _message('codeLabel'),
              child: TextField(
                decoration: InputDecoration(labelText: _message('codeLabel')),
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.next,
                controller: _code,
              ),
            ),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Semantics(
              label: _message('newPasswordLabel'),
              child: TextField(
                decoration: InputDecoration(
                  labelText: _message('newPasswordLabel'),
                  suffixIcon: IconButton(
                    tooltip: _obscureNewPassword
                        ? _message('showPassword')
                        : _message('hidePassword'),
                    onPressed: () => setState(
                        () => _obscureNewPassword = !_obscureNewPassword),
                    icon: Icon(_obscureNewPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                  ),
                ),
                obscureText: _obscureNewPassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const <String>[AutofillHints.newPassword],
                textInputAction: TextInputAction.next,
                controller: _newPassword,
              ),
            ),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Semantics(
              label: _message('confirmPasswordLabel'),
              child: TextField(
                decoration: InputDecoration(
                  labelText: _message('confirmPasswordLabel'),
                  suffixIcon: IconButton(
                    tooltip: _obscureConfirmPassword
                        ? _message('showPassword')
                        : _message('hidePassword'),
                    onPressed: () => setState(() =>
                        _obscureConfirmPassword = !_obscureConfirmPassword),
                    icon: Icon(_obscureConfirmPassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                  ),
                ),
                obscureText: _obscureConfirmPassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const <String>[AutofillHints.newPassword],
                onSubmitted: (_) => _submit(),
                controller: _confirmPassword,
              ),
            ),
            if (problem != null) ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              IamAuthErrorText(
                  key: ValueKey<String>(problem), message: problem),
            ],
            if (_state.errorMessage != null) ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              IamAuthErrorText(
                key: ValueKey<String>(_state.errorMessage!),
                message: _state.errorMessage!,
              ),
            ],
            if (_state.notice != null) ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              Text(
                _state.notice == 'code-sent'
                    ? _message('codeSent')
                    : _message('passwordReset'),
              ),
            ],
            const SizedBox(height: SdkworkDesignTokens.spaceMd),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _state.resetting ? null : _submit,
              child: _state.resetting
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_message('submitAction')),
            ),
          ],
        ),
      ),
    );
  }
}
