// SDKWORK-IAM-FLUTTER-AUTH: authored screen.
import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../login_context.dart';
import '../models/auth_runtime_config.dart';
import '../services/auth_service.dart';
import '../state/auth_state.dart';
import 'auth_form_layout.dart';

/// Entry screen of the `auth` capability.
class IamFlutterMobileAuthScreen extends StatefulWidget {
  const IamFlutterMobileAuthScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onSignedIn,
    this.onOpenForgotPassword,
    this.onOpenRegister,
    this.onContextSelectionRequired,
    this.runtimeConfig,
  });

  final Map<String, String> messages;
  final IamFlutterMobileAuthController? controller;
  final VoidCallback? onSignedIn;
  final VoidCallback? onOpenForgotPassword;
  final VoidCallback? onOpenRegister;

  /// Receives the pending challenge so the host can open its dedicated route.
  final ValueChanged<IamLoginContextSelectionChallenge>?
      onContextSelectionRequired;

  /// Host auth policy; omitted keeps the historical password-only screen.
  final IamFlutterMobileAuthRuntimeConfig? runtimeConfig;

  static const String titleKey = 'iam.auth.login.title';

  @override
  State<IamFlutterMobileAuthScreen> createState() =>
      _IamFlutterMobileAuthScreenState();
}

class _IamFlutterMobileAuthScreenState
    extends State<IamFlutterMobileAuthScreen> {
  late final IamFlutterMobileAuthController _controller =
      widget.controller ?? IamFlutterMobileAuthController();
  late final void Function() _unsubscribe;
  late IamFlutterMobileAuthState _state;
  final TextEditingController _account = TextEditingController();
  final TextEditingController _password = TextEditingController();
  final TextEditingController _code = TextEditingController();
  bool _obscurePassword = true;
  bool _codeMode = false;
  String? _validationMessage;

  IamFlutterMobileAuthRuntimeConfig get _config =>
      widget.runtimeConfig ?? const IamFlutterMobileAuthRuntimeConfig();

  bool get _passwordEnabled => _config.passwordLoginEnabled;

  bool get _codeEnabled => _config.codeLoginEnabled;

  /// The password grant wins only when the host offers it and the user did not
  /// switch; a host without password login lands directly on the code form.
  bool get _useCodeMode => _codeEnabled && (!_passwordEnabled || _codeMode);

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
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    _account.dispose();
    _password.dispose();
    _code.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  Future<void> _submit() async {
    final String account = _account.text.trim();
    if (account.isEmpty) {
      setState(() => _validationMessage = _message('accountRequired'));
      return;
    }
    if (_useCodeMode ? _code.text.trim().isEmpty : _password.text.isEmpty) {
      setState(() => _validationMessage =
          _message(_useCodeMode ? 'codeRequired' : 'required'));
      return;
    }
    setState(() => _validationMessage = null);
    final bool signedIn = _useCodeMode
        ? await _controller.signInWithCode(
            account: account,
            code: _code.text,
          )
        : await _controller.signIn(
            password: _password.text,
            username: account,
          );
    if (!mounted) return;
    if (signedIn) widget.onSignedIn?.call();
  }

  Future<void> _sendCode() async {
    final String account = _account.text.trim();
    if (account.isEmpty) {
      setState(() => _validationMessage = _message('accountRequired'));
      return;
    }
    if (!_config.codeLoginEnabledFor(account)) {
      setState(() => _validationMessage = _message('codeChannelUnavailable'));
      return;
    }
    setState(() => _validationMessage = null);
    await _controller.requestVerificationCode(
      account: account,
      scene: IamFlutterMobileVerificationScene.login,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (!_passwordEnabled && !_codeEnabled) {
      return SdkworkScaffold(
        titleKey: _message('title'),
        fullBleedBody: true,
        body: IamAuthFormLayout(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text(_message('subtitle'),
                  style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: SdkworkDesignTokens.spaceMd),
              IamAuthErrorText(message: _message('loginUnavailable')),
            ],
          ),
        ),
      );
    }
    final String? error = _validationMessage ?? _state.errorMessage;
    final bool showModeSwitch = _passwordEnabled && _codeEnabled;
    final bool showForgot =
        _config.recoveryEnabled && widget.onOpenForgotPassword != null;
    final bool showRegister =
        _config.registerEnabled && widget.onOpenRegister != null;
    return SdkworkScaffold(
      titleKey: _message('title'),
      fullBleedBody: true,
      body: IamAuthFormLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(_message('subtitle'),
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: SdkworkDesignTokens.spaceMd),
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
            if (_useCodeMode) ...<Widget>[
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
                  textInputAction: TextInputAction.done,
                  onSubmitted: (_) => _submit(),
                  controller: _code,
                ),
              ),
            ] else ...<Widget>[
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
                  autofillHints: const <String>[AutofillHints.password],
                  onSubmitted: (_) => _submit(),
                  textInputAction: TextInputAction.done,
                  controller: _password,
                ),
              ),
            ],
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
                  : Text(_message('submitLabel')),
            ),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              children: <Widget>[
                if (showModeSwitch)
                  TextButton(
                    style:
                        TextButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: () {
                      setState(() {
                        _codeMode = !_useCodeMode;
                        _validationMessage = null;
                      });
                    },
                    child: Text(_message(
                        _useCodeMode ? 'loginWithPassword' : 'loginWithCode')),
                  ),
                if (showForgot)
                  TextButton(
                    style:
                        TextButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: widget.onOpenForgotPassword,
                    child: Text(_message('forgotPasswordAction')),
                  ),
                if (showRegister)
                  TextButton(
                    style:
                        TextButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: widget.onOpenRegister,
                    child: Text(_message('registerLink')),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
