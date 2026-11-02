// SDKWORK-IAM-FLUTTER-ACCOUNT-BINDING: authored screen.
/**
 * Bindings screen of the `account_binding` capability
 * (`app.iam.account-binding.list`, `/user/account-binding`).
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/account_binding_controller.dart';
import '../services/account_binding_service.dart';
import '../state/account_binding_state.dart';

/// Entry screen of the `account_binding` capability.
class IamFlutterMobileAccountBindingScreen extends StatefulWidget {
  const IamFlutterMobileAccountBindingScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAccountBindingController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.account-binding.list.title';

  @override
  State<IamFlutterMobileAccountBindingScreen> createState() =>
      _IamFlutterMobileAccountBindingScreenState();
}

class _IamFlutterMobileAccountBindingScreenState
    extends State<IamFlutterMobileAccountBindingScreen> {
  late final IamFlutterMobileAccountBindingController _controller =
      widget.controller ?? IamFlutterMobileAccountBindingController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAccountBindingState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAccountBindingState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAccountBindingStatus.idle) {
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

  /// Asks before unlinking: removing a sign-in method is not reversible without
  /// proving the user still controls that identity.
  Future<void> _confirmUnlink(IamFlutterMobileAccountLink link) async {
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
    if (_state.status == IamFlutterMobileAccountBindingStatus.loading ||
        _state.status == IamFlutterMobileAccountBindingStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAccountBindingStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    final String enabled = _message('enabled');
    final String disabled = _message('disabled');
    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceSm),
        _SectionCard(
          title: _message('policySection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _PolicyRow(
                label: _message('policyContact'),
                value: _state.policy.contactEnabled,
                whenDisabled: disabled,
                whenEnabled: enabled,
              ),
              _PolicyRow(
                label: _message('policyEmail'),
                value: _state.policy.emailEnabled,
                whenDisabled: disabled,
                whenEnabled: enabled,
              ),
              _PolicyRow(
                label: _message('policyOauth'),
                value: _state.policy.oauthEnabled,
                whenDisabled: disabled,
                whenEnabled: enabled,
              ),
              _PolicyRow(
                label: _message('policyUnlink'),
                value: _state.policy.selfServiceUnlinkEnabled,
                whenDisabled: disabled,
                whenEnabled: enabled,
              ),
            ],
          ),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _SectionCard(
          title: _message('linksSection'),
          child: _state.links.isEmpty
              ? Text(_message('empty'))
              : Column(
                  children: <Widget>[
                    for (final IamFlutterMobileAccountLink link in _state.links)
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
        if (_state.hasMore) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          FilledButton.tonal(
            onPressed: _controller.loadMore,
            child: Text(_message('loadMore')),
          ),
        ],
      ],
    );
  }
}

class _PolicyRow extends StatelessWidget {
  const _PolicyRow({
    required this.label,
    required this.value,
    required this.whenDisabled,
    required this.whenEnabled,
  });

  final String label;
  final String whenDisabled;
  final String whenEnabled;
  final bool value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: SdkworkDesignTokens.spaceXs),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          Text(value ? whenEnabled : whenDisabled),
        ],
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.child, required this.title});

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
