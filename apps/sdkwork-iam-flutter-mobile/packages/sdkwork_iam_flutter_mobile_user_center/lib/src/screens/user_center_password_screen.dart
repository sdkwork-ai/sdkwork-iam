// SDKWORK-IAM-FLUTTER-USER-CENTER: authored screen.
/**
 * Password screen of the `user_center` capability
 * (`app.iam.user-center.password`, `/user/password`).
 *
 * The three fields are validated locally before the request, using the same rules
 * as the H5 and PC forms, so a short or mismatched password never becomes a server
 * round trip.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/user_center_controller.dart';
import '../services/user_center_service.dart';
import '../state/user_center_state.dart';

/// Password screen of the `user_center` capability.
class IamFlutterMobileUserCenterPasswordScreen extends StatefulWidget {
  const IamFlutterMobileUserCenterPasswordScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileUserCenterController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.userCenter.password.title';

  @override
  State<IamFlutterMobileUserCenterPasswordScreen> createState() =>
      _IamFlutterMobileUserCenterPasswordScreenState();
}

class _IamFlutterMobileUserCenterPasswordScreenState
    extends State<IamFlutterMobileUserCenterPasswordScreen> {
  late final IamFlutterMobileUserCenterController _controller =
      widget.controller ?? IamFlutterMobileUserCenterController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileUserCenterState _state;

  final TextEditingController _oldPassword = TextEditingController();
  final TextEditingController _newPassword = TextEditingController();
  final TextEditingController _confirmPassword = TextEditingController();

  /// Local validation result of the last submit.
  IamFlutterMobileUserPasswordProblem? _problem;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileUserCenterState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    _oldPassword.dispose();
    _newPassword.dispose();
    _confirmPassword.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  String _problemMessage(IamFlutterMobileUserPasswordProblem problem) {
    switch (problem) {
      case IamFlutterMobileUserPasswordProblem.oldPasswordRequired:
        return _message('oldPasswordRequired');
      case IamFlutterMobileUserPasswordProblem.newPasswordTooShort:
        return _message('newPasswordTooShort');
      case IamFlutterMobileUserPasswordProblem.confirmMismatch:
        return _message('confirmMismatch');
    }
  }

  Future<void> _submit() async {
    final IamFlutterMobileUserPasswordDraft draft = IamFlutterMobileUserPasswordDraft(
      confirmPassword: _confirmPassword.text,
      newPassword: _newPassword.text,
      oldPassword: _oldPassword.text,
    );
    final IamFlutterMobileUserPasswordProblem? problem =
        validateIamFlutterMobileUserPasswordDraft(draft);
    setState(() => _problem = problem);
    if (problem != null) return;
    final bool changed = await _controller.changePassword(draft);
    if (!mounted || !changed) return;
    // Clearing the fields after a successful change keeps the current password out
    // of a screen the user may leave open.
    _oldPassword.clear();
    _newPassword.clear();
    _confirmPassword.clear();
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('passwordTitle'),
      body: ListView(
        children: <Widget>[
          Text(_message('passwordSubtitle'), style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          TextField(
            decoration: InputDecoration(labelText: _message('oldPasswordLabel')),
            obscureText: true,
            textInputAction: TextInputAction.next,
            controller: _oldPassword,
          ),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          TextField(
            decoration: InputDecoration(labelText: _message('newPasswordLabel')),
            obscureText: true,
            textInputAction: TextInputAction.next,
            controller: _newPassword,
          ),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          TextField(
            decoration: InputDecoration(labelText: _message('confirmPasswordLabel')),
            obscureText: true,
            onSubmitted: (_) => _submit(),
            controller: _confirmPassword,
          ),
          if (_problem != null) ...<Widget>[
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Text(
              _problemMessage(_problem!),
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (_state.errorMessage != null) ...<Widget>[
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Text(
              _state.errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (_state.notice != null) ...<Widget>[
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Text(_message('passwordChanged')),
          ],
          const SizedBox(height: SdkworkDesignTokens.spaceMd),
          FilledButton(
            onPressed: _state.savingPassword ? null : _submit,
            child: _state.savingPassword
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(_message('changePasswordAction')),
          ),
        ],
      ),
    );
  }
}
