// SDKWORK-IAM-FLUTTER-AUTH: authored screen.
/**
 * Sign-in screen of the `auth` capability (`app.iam.auth.login`, `/auth/login`).
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral; the
 * shell owns asset loading and passes the fragment down.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../state/auth_state.dart';

/// Entry screen of the `auth` capability.
class IamFlutterMobileAuthScreen extends StatefulWidget {
  const IamFlutterMobileAuthScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onSignedIn,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAuthController? controller;

  /// Invoked once a session exists, so the shell can swap to the signed-in tree.
  final VoidCallback? onSignedIn;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.auth.login.title';

  @override
  State<IamFlutterMobileAuthScreen> createState() => _IamFlutterMobileAuthScreenState();
}

class _IamFlutterMobileAuthScreenState extends State<IamFlutterMobileAuthScreen> {
  late final IamFlutterMobileAuthController _controller =
      widget.controller ?? IamFlutterMobileAuthController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAuthState _state;

  final TextEditingController _account = TextEditingController();
  final TextEditingController _password = TextEditingController();

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
    _password.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  Future<void> _submit() async {
    final String account = _account.text.trim();
    if (account.isEmpty || _password.text.isEmpty) return;
    final bool signedIn = await _controller.signIn(password: _password.text, username: account);
    if (!mounted) return;
    if (signedIn) {
      widget.onSignedIn?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: ListView(
        children: <Widget>[
          Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: SdkworkDesignTokens.spaceMd),
          TextField(
            autocorrect: false,
            decoration: InputDecoration(labelText: _message('accountLabel')),
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            controller: _account,
          ),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          TextField(
            decoration: InputDecoration(labelText: _message('passwordLabel')),
            obscureText: true,
            onSubmitted: (_) => _submit(),
            textInputAction: TextInputAction.done,
            controller: _password,
          ),
          if (_state.errorMessage != null) ...<Widget>[
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Text(
              _state.errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: SdkworkDesignTokens.spaceMd),
          FilledButton(
            // Disabled while submitting and while the form is incomplete: an empty
            // submit is a validation the server should never have to answer.
            onPressed: _state.submitting ? null : _submit,
            child: _state.submitting
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(_message('submitLabel')),
          ),
        ],
      ),
    );
  }
}
