// SDKWORK-IAM-FLUTTER-AUTH: authored screen.
/**
 * Registration screen of the `auth` capability
 * (`app.iam.auth.register`, `/auth/register`).
 *
 * The account text selects the method: an email or phone registration follows
 * the host verification policy, everything else is the quick username method.
 * A method the host did not list is refused before the request is sent.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../login_context.dart';
import '../models/auth_runtime_config.dart';
import '../services/auth_service.dart';
import '../state/auth_state.dart';
import 'auth_form_layout.dart';

/// Registration screen of the `auth` capability.
class IamFlutterMobileAuthRegisterScreen extends StatefulWidget {
  const IamFlutterMobileAuthRegisterScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onBackToLogin,
    this.onContextSelectionRequired,
    this.onSignedIn,
    this.runtimeConfig,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAuthController? controller;

  final VoidCallback? onBackToLogin;
  final ValueChanged<IamLoginContextSelectionChallenge>?
      onContextSelectionRequired;
  final VoidCallback? onSignedIn;

  /// Host auth policy; omitted allows only the quick username method.
  final IamFlutterMobileAuthRuntimeConfig? runtimeConfig;

  static const String titleKey = 'iam.auth.register.title';

  @override
  State<IamFlutterMobileAuthRegisterScreen> createState() =>
      _IamFlutterMobileAuthRegisterScreenState();
}

class _IamFlutterMobileAuthRegisterScreenState
    extends State<IamFlutterMobileAuthRegisterScreen> {
  late final IamFlutterMobileAuthController _controller =
      widget.controller ?? IamFlutterMobileAuthController();
  late final void Function() _unsubscribe;
  late IamFlutterMobileAuthState _state;

  final TextEditingController _account = TextEditingController();
  final TextEditingController _code = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _confirmPassword = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  IamFlutterMobileAuthRegisterProblem? _problem;
  String? _validationMessage;

  IamFlutterMobileAuthRuntimeConfig get _config =>
      widget.runtimeConfig ?? const IamFlutterMobileAuthRuntimeConfig();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAuthState next) {
      if (!mounted) return;
      setState(() => _state = next);
      if (next.status == IamFlutterMobileAuthStatus.selectingContext &&
          next.challenge != null) {
        widget.onContextSelectionRequired?.call(next.challenge!);
      }
      if (next.status == IamFlutterMobileAuthStatus.authenticated) {
        widget.onSignedIn?.call();
      }
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    _account.dispose();
    _code.dispose();
    _password.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  String get _trimmedAccount => _account.text.trim();

  String? get _channel => _config.registerMethod(_trimmedAccount);

  bool get _verificationRequired =>
      _config.registerVerificationRequired(_trimmedAccount);

  IamFlutterMobileRegisterDraft get _draft => IamFlutterMobileRegisterDraft(
        account: _trimmedAccount,
        channel: _channel,
        code: _code.text,
        confirmPassword: _confirmPassword.text,
        password: _password.text,
      );

  Future<void> _sendCode() async {
    if (_trimmedAccount.isEmpty) {
      setState(() => _validationMessage = _message('registerAccountRequired'));
      return;
    }
    setState(() => _validationMessage = null);
    await _controller.requestVerificationCode(
      account: _trimmedAccount,
      scene: IamFlutterMobileVerificationScene.register,
    );
  }

  Future<void> _submit() async {
    final String? channel = _channel;
    if (channel == null) {
      setState(() {
        _problem = null;
        _validationMessage = _trimmedAccount.isEmpty
            ? _message('registerAccountRequired')
            : _message('registerChannelUnavailable');
      });
      return;
    }
    final IamFlutterMobileAuthRegisterProblem? problem =
        validateIamFlutterMobileAuthRegisterDraft(
      _draft,
      verificationRequired: _verificationRequired,
    );
    setState(() {
      _problem = problem;
      _validationMessage = null;
    });
    if (problem != null) return;
    await _controller.register(
      _draft,
      verificationRequired: _verificationRequired,
    );
  }

  String? _problemMessage() {
    final IamFlutterMobileAuthRegisterProblem? problem = _problem;
    if (problem == null) return null;
    switch (problem) {
      case IamFlutterMobileAuthRegisterProblem.accountRequired:
        return _message('registerAccountRequired');
      case IamFlutterMobileAuthRegisterProblem.passwordTooShort:
        return _message('passwordTooShort');
      case IamFlutterMobileAuthRegisterProblem.confirmMismatch:
        return _message('confirmMismatch');
      case IamFlutterMobileAuthRegisterProblem.codeRequired:
        return _message('codeRequired');
    }
  }

  @override
  Widget build(BuildContext context) {
    final String? problem = _problemMessage();
    final String? error = problem ?? _validationMessage ?? _state.errorMessage;
    final bool showCode = _verificationRequired && _trimmedAccount.isNotEmpty;
    return SdkworkScaffold(
      titleKey: _message('registerTitle'),
      fullBleedBody: true,
      body: IamAuthFormLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(_message('registerSubtitle'),
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: SdkworkDesignTokens.spaceMd),
            Semantics(
              label: _message('accountLabel'),
              child: TextField(
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const <String>[AutofillHints.newUsername],
                decoration:
                    InputDecoration(labelText: _message('accountLabel')),
                keyboardType: TextInputType.text,
                textInputAction: TextInputAction.next,
                onChanged: (_) => setState(() {}),
                controller: _account,
              ),
            ),
            if (showCode) ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              Semantics(
                label: _message('codeLabel'),
                child: TextField(
                  decoration: InputDecoration(
                    labelText: _message('codeLabel'),
                    suffixIcon: TextButton(
                      onPressed: _state.sendingCode ? null : _sendCode,
                      child: _state.sendingCode
                          ? const SizedBox(
                              height: 16,
                              width: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : Text(_message('sendCodeAction')),
                    ),
                  ),
                  keyboardType: TextInputType.number,
                  textInputAction: TextInputAction.next,
                  controller: _code,
                ),
              ),
            ],
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Semantics(
              label: _message('passwordLabel'),
              child: TextField(
                decoration: InputDecoration(
                  labelText: _message('passwordLabel'),
                  suffixIcon: IconButton(
                    tooltip: _obscurePassword
                        ? _message('showPassword')
                        : _message('hidePassword'),
                    onPressed: () => setState(
                        () => _obscurePassword = !_obscurePassword),
                    icon: Icon(_obscurePassword
                        ? Icons.visibility_outlined
                        : Icons.visibility_off_outlined),
                  ),
                ),
                obscureText: _obscurePassword,
                autocorrect: false,
                enableSuggestions: false,
                autofillHints: const <String>[AutofillHints.newPassword],
                textInputAction: TextInputAction.next,
                controller: _password,
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
                    onPressed: () => setState(
                        () => _obscureConfirmPassword = !_obscureConfirmPassword),
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
                textInputAction: TextInputAction.done,
                controller: _confirmPassword,
              ),
            ),
            if (_state.notice == 'code-sent') ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              Text(_message('codeSent')),
            ],
            if (error != null) ...<Widget>[
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              IamAuthErrorText(key: ValueKey<String>(error), message: error),
            ],
            const SizedBox(height: SdkworkDesignTokens.spaceMd),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _state.submitting ? null : _submit,
              child: _state.submitting
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(_message('registerAction')),
            ),
            if (widget.onBackToLogin != null)
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: widget.onBackToLogin,
                child: Text(_message('backToLogin')),
              ),
          ],
        ),
      ),
    );
  }
}
