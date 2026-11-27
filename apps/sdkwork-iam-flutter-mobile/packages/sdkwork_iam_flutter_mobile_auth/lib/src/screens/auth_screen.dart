// SDKWORK-IAM-FLUTTER-AUTH: authored screen.
import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../login_context.dart';
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
    this.onContextSelectionRequired,
  });

  final Map<String, String> messages;
  final IamFlutterMobileAuthController? controller;
  final VoidCallback? onSignedIn;
  final VoidCallback? onOpenForgotPassword;

  /// Receives the pending challenge so the host can open its dedicated route.
  final ValueChanged<IamLoginContextSelectionChallenge>?
      onContextSelectionRequired;

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
  bool _obscurePassword = true;
  String? _validationMessage;

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
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  Future<void> _submit() async {
    final String account = _account.text.trim();
    if (account.isEmpty || _password.text.isEmpty) {
      setState(() => _validationMessage = _message('required'));
      return;
    }
    setState(() => _validationMessage = null);
    final bool signedIn =
        await _controller.signIn(password: _password.text, username: account);
    if (!mounted) return;
    if (signedIn) widget.onSignedIn?.call();
  }

  @override
  Widget build(BuildContext context) {
    final String? error = _validationMessage ?? _state.errorMessage;
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
                    onPressed: () =>
                        setState(() => _obscurePassword = !_obscurePassword),
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
            if (widget.onOpenForgotPassword != null)
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: widget.onOpenForgotPassword,
                child: Text(_message('forgotPasswordAction')),
              ),
          ],
        ),
      ),
    );
  }
}
