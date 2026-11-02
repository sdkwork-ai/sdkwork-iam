// SDKWORK-IAM-FLUTTER-USER-CENTER: authored screen.
/**
 * Profile screen of the `user_center` capability
 * (`app.iam.user-center.profile`, `/user/profile`).
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/user_center_controller.dart';
import '../services/user_center_service.dart';
import '../state/user_center_state.dart';

/// Profile screen of the `user_center` capability.
class IamFlutterMobileUserCenterScreen extends StatefulWidget {
  const IamFlutterMobileUserCenterScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onOpenPassword,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileUserCenterController? controller;

  /// Opens the password screen; the action is rendered only when provided.
  final VoidCallback? onOpenPassword;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.userCenter.profile.title';

  @override
  State<IamFlutterMobileUserCenterScreen> createState() =>
      _IamFlutterMobileUserCenterScreenState();
}

class _IamFlutterMobileUserCenterScreenState extends State<IamFlutterMobileUserCenterScreen> {
  late final IamFlutterMobileUserCenterController _controller =
      widget.controller ?? IamFlutterMobileUserCenterController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileUserCenterState _state;

  final TextEditingController _displayName = TextEditingController();
  final TextEditingController _email = TextEditingController();
  final TextEditingController _phone = TextEditingController();

  /// Last profile the form was seeded from.
  ///
  /// The fields are filled once per loaded profile rather than on every rebuild:
  /// re-seeding on each state change would throw away what the user is typing.
  String? _seededFor;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileUserCenterState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileUserCenterStatus.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.load();
      });
    }
  }

  @override
  void dispose() {
    _unsubscribe();
    _displayName.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  void _seedForm(IamFlutterMobileUserProfile profile) {
    final String key = '${profile.userId}:${profile.displayName}:${profile.email}:${profile.phone}';
    if (_seededFor == key) return;
    _seededFor = key;
    _displayName.text = profile.displayName ?? '';
    _email.text = profile.email ?? '';
    _phone.text = profile.phone ?? '';
  }

  IamFlutterMobileUserProfileDraft get _draft => IamFlutterMobileUserProfileDraft(
        displayName: _displayName.text,
        email: _email.text,
        phone: _phone.text,
      );

  @override
  Widget build(BuildContext context) {
    final IamFlutterMobileUserProfile? profile = _state.profile;
    if (profile != null) {
      _seedForm(profile);
    }
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_state.status == IamFlutterMobileUserCenterStatus.loading ||
        _state.status == IamFlutterMobileUserCenterStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileUserCenterStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        TextField(
          decoration: InputDecoration(labelText: _message('displayNameLabel')),
          textInputAction: TextInputAction.next,
          controller: _displayName,
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        TextField(
          autocorrect: false,
          decoration: InputDecoration(labelText: _message('emailLabel')),
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          controller: _email,
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        TextField(
          decoration: InputDecoration(labelText: _message('phoneLabel')),
          keyboardType: TextInputType.phone,
          controller: _phone,
        ),
        if (_state.errorMessage != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Text(
            _state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (_state.notice != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Text(_message('profileSaved')),
        ],
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        FilledButton(
          onPressed: _state.savingProfile ? null : () => _controller.saveProfile(_draft),
          child: _state.savingProfile
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : Text(_message('saveAction')),
        ),
        if (widget.onOpenPassword != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          TextButton(
            onPressed: widget.onOpenPassword,
            child: Text(_message('passwordTitle')),
          ),
        ],
      ],
    );
  }
}
