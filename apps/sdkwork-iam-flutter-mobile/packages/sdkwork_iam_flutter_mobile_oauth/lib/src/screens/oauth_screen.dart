// SDKWORK-IAM-FLUTTER-OAUTH: authored screen.
/**
 * Provider screen of the `oauth` capability
 * (`app.iam.oauth.providers`, `/oauth/providers`).
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md). Opening the
 * authorization URL is the host's job, handed over through [onAuthorize].
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/oauth_controller.dart';
import '../services/oauth_service.dart';
import '../state/oauth_state.dart';

/// Entry screen of the `oauth` capability.
class IamFlutterMobileOauthScreen extends StatefulWidget {
  const IamFlutterMobileOauthScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onAuthorize,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileOauthController? controller;

  /// Opens an authorization URL in the platform browser.
  ///
  /// Injected rather than performed here: a capability package never touches a
  /// platform plugin, and a test can assert the URL without opening anything.
  final void Function(String url)? onAuthorize;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.oauth.providers.title';

  @override
  State<IamFlutterMobileOauthScreen> createState() => _IamFlutterMobileOauthScreenState();
}

class _IamFlutterMobileOauthScreenState extends State<IamFlutterMobileOauthScreen> {
  late final IamFlutterMobileOauthController _controller =
      widget.controller ?? IamFlutterMobileOauthController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileOauthState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileOauthState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileOauthStatus.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.load();
      });
    }
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  Future<void> _start(IamFlutterMobileOAuthProvider provider) async {
    final String? url = await _controller.authorize(provider.providerKey);
    if (!mounted || url == null) return;
    final void Function(String url)? open = widget.onAuthorize;
    if (open == null) {
      // Without a host opener there is nowhere to send the user; saying so is
      // better than a button that silently does nothing.
      setState(() {
        _state = _state.failed(_message('authorizeUnavailable'));
      });
      return;
    }
    open(url);
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_state.status == IamFlutterMobileOauthStatus.loading ||
        _state.status == IamFlutterMobileOauthStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileOauthStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    final List<IamFlutterMobileOAuthProvider> startable = _state.startable;
    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        if (startable.isEmpty) Text(_message('empty')),
        for (final IamFlutterMobileOAuthProvider provider in startable)
          ListTile(
            key: ValueKey<String>(provider.providerKey),
            contentPadding: EdgeInsets.zero,
            title: Text(provider.displayName ?? provider.providerKey),
            trailing: _state.startingKey == provider.providerKey
                ? const SizedBox(
                    height: 16,
                    width: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : TextButton(
                    onPressed: _state.startingKey == null ? () => _start(provider) : null,
                    child: Text(_message('connectAction')),
                  ),
          ),
        if (_state.errorMessage != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Text(
            _state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
      ],
    );
  }
}
