// SDKWORK-IAM-FLUTTER-CONSOLE-ACCOUNT-BINDING: authored screen.
/**
 * Console account-binding workspace (`console.iam.account-binding.list`,
 * `/console/iam/account-binding`).
 *
 * The policy region comes first because it decides whether the removal action exists at
 * all; the linked identities follow. A not-allowed policy is reported rather than hidden:
 * an operator needs to know the user cannot remove it, not merely find no button.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/console_account_binding_controller.dart';
import '../services/console_account_binding_service.dart';
import '../state/console_account_binding_state.dart';

/// Entry screen of the `console_account_binding` capability.
class IamFlutterMobileConsoleAccountBindingScreen extends StatefulWidget {
  const IamFlutterMobileConsoleAccountBindingScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileConsoleAccountBindingController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.console.accountBinding.list.title';

  @override
  State<IamFlutterMobileConsoleAccountBindingScreen> createState() =>
      _IamFlutterMobileConsoleAccountBindingScreenState();
}

class _IamFlutterMobileConsoleAccountBindingScreenState
    extends State<IamFlutterMobileConsoleAccountBindingScreen> {
  late final IamFlutterMobileConsoleAccountBindingController _controller =
      widget.controller ?? IamFlutterMobileConsoleAccountBindingController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileConsoleAccountBindingState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileConsoleAccountBindingState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileConsoleAccountBindingStatus.idle) {
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

  /// Asks before removing: unlinking is not reversible without proving the user still
  /// controls that identity.
  Future<void> _confirmUnlink(IamFlutterMobileConsoleAccountLink link) async {
    final bool confirmed = await showDialog<bool>(
          context: context,
          builder: (BuildContext dialogContext) => AlertDialog(
            actions: <Widget>[
              TextButton(
                onPressed: () => Navigator.of(dialogContext).pop(false),
                child: Text(_message('cancel')),
              ),
              FilledButton(
                onPressed: () => Navigator.of(dialogContext).pop(true),
                child: Text(_message('unlink')),
              ),
            ],
            content: Text(_message('unlinkConfirm')),
          ),
        ) ??
        // A dismissed dialog (barrier tap) is a refusal, not a confirmation.
        false;
    if (confirmed) {
      await _controller.unlink(link.accountLinkId);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_state.status == IamFlutterMobileConsoleAccountBindingStatus.loading ||
        _state.status == IamFlutterMobileConsoleAccountBindingStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileConsoleAccountBindingStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    final String allowed = _message('allowed');
    final String denied = _message('denied');
    final IamFlutterMobileConsoleAccountBindingPolicy policy =
        _state.policy ?? const IamFlutterMobileConsoleAccountBindingPolicy();

    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('policySection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Row(label: _message('policyContact'), value: policy.contactEnabled ? allowed : denied),
              _Row(label: _message('policyEmail'), value: policy.emailEnabled ? allowed : denied),
              _Row(label: _message('policyOauth'), value: policy.oauthEnabled ? allowed : denied),
              _Row(
                label: _message('policyUnlink'),
                value: policy.selfServiceUnlinkEnabled ? allowed : denied,
              ),
            ],
          ),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('linksSection'),
          child: _state.links.isEmpty
              ? Text(_message('emptyLinks'))
              : Column(
                  children: <Widget>[
                    for (final IamFlutterMobileConsoleAccountLink link in _state.links)
                      ListTile(
                        key: ValueKey<String>(link.accountLinkId),
                        contentPadding: EdgeInsets.zero,
                        subtitle: link.providerUserId == null ? null : Text(link.providerUserId!),
                        title: Text(link.provider ?? link.accountLinkId),
                        trailing: _state.canUnlink
                            ? TextButton(
                                onPressed: _state.unlinkingId == link.accountLinkId
                                    ? null
                                    : () => _confirmUnlink(link),
                                child: Text(_message('unlink')),
                              )
                            : null,
                      ),
                  ],
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

class _Card extends StatelessWidget {
  const _Card({required this.child, required this.title});

  final Widget child;
  final String title;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(title, style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            child,
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: SdkworkDesignTokens.spaceXs),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          Text(value),
        ],
      ),
    );
  }
}
