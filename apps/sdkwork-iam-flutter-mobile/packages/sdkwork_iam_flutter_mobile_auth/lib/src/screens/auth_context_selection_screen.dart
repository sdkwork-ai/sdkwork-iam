import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/auth_controller.dart';
import '../login_context.dart';
import '../state/auth_state.dart';
import 'auth_form_layout.dart';

/// Explicit personal/organization choice for a pending login-context challenge.
/// No choice is preselected and no session exists until continuation succeeds.
class IamFlutterMobileAuthContextSelectionScreen extends StatefulWidget {
  const IamFlutterMobileAuthContextSelectionScreen({
    super.key,
    required this.messages,
    required this.controller,
    this.onSignedIn,
  });

  final Map<String, String> messages;
  final IamFlutterMobileAuthController controller;
  final VoidCallback? onSignedIn;

  static const String titleKey = 'iam.auth.contextSelection.title';

  @override
  State<IamFlutterMobileAuthContextSelectionScreen> createState() =>
      _IamFlutterMobileAuthContextSelectionScreenState();
}

class _IamFlutterMobileAuthContextSelectionScreenState
    extends State<IamFlutterMobileAuthContextSelectionScreen> {
  late final void Function() _unsubscribe;
  late IamFlutterMobileAuthState _state;

  @override
  void initState() {
    super.initState();
    _state = widget.controller.state;
    _unsubscribe =
        widget.controller.addListener((IamFlutterMobileAuthState next) {
      if (!mounted) return;
      setState(() => _state = next);
      if (next.authenticated) widget.onSignedIn?.call();
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  Future<void> _choose(Future<bool> Function() action) async {
    final bool signedIn = await action();
    if (!mounted || !signedIn) return;
    widget.onSignedIn?.call();
  }

  @override
  Widget build(BuildContext context) {
    final IamLoginContextSelectionChallenge? challenge = _state.challenge;
    return SdkworkScaffold(
      titleKey: _message('contextTitle'),
      fullBleedBody: true,
      body: IamAuthFormLayout(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: <Widget>[
            Text(_message('contextSubtitle'),
                style: Theme.of(context).textTheme.bodySmall),
            const SizedBox(height: SdkworkDesignTokens.spaceMd),
            if (challenge == null)
              IamAuthErrorText(message: _message('contextUnavailable'))
            else ...<Widget>[
              OutlinedButton(
                style:
                    OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: _state.submitting
                    ? null
                    : () => _choose(widget.controller.selectPersonalContext),
                child: Text(challenge.personalDisplayName ??
                    _message('personalChoice')),
              ),
              const SizedBox(height: SdkworkDesignTokens.spaceSm),
              for (final IamLoginContextOrganizationChoice choice
                  in challenge.organizations) ...<Widget>[
                OutlinedButton(
                  key: ValueKey<String>('context-${choice.organizationId}'),
                  style:
                      OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
                  onPressed: _state.submitting
                      ? null
                      : () => _choose(() => widget.controller
                          .selectOrganizationContext(choice.organizationId)),
                  child: Text(choice.displayName ??
                      choice.name ??
                      choice.organizationId),
                ),
                const SizedBox(height: SdkworkDesignTokens.spaceSm),
              ],
            ],
            if (_state.errorMessage != null) ...<Widget>[
              IamAuthErrorText(
                key: ValueKey<String>(_state.errorMessage!),
                message: _state.errorMessage!,
              ),
            ],
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _state.submitting
                  ? null
                  : () => Navigator.of(context).maybePop(),
              child: Text(_message('back')),
            ),
          ],
        ),
      ),
    );
  }
}
