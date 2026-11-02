// SDKWORK-IAM-FLUTTER-ADMIN-ACCOUNT-BINDING: authored screen.
/**
 * Admin account-binding list (`admin.iam.account-binding.list`,
 * `/admin/iam/account-bindings`).
 *
 * Every third-party identity any user in the tenant has linked. An operator searches it to
 * answer "which account is this GitHub login attached to?", so the row leads with the
 * provider identity and carries the local user beside it — one without the other cannot
 * answer the question.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_account_binding_controller.dart';
import '../services/admin_account_binding_service.dart';
import '../state/admin_account_binding_state.dart';

/// Entry screen of the `admin_account_binding` capability.
class IamFlutterMobileAdminAccountBindingScreen extends StatefulWidget {
  const IamFlutterMobileAdminAccountBindingScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminAccountBindingController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.accountBinding.list.title';

  @override
  State<IamFlutterMobileAdminAccountBindingScreen> createState() =>
      _IamFlutterMobileAdminAccountBindingScreenState();
}

class _IamFlutterMobileAdminAccountBindingScreenState
    extends State<IamFlutterMobileAdminAccountBindingScreen> {
  late final IamFlutterMobileAdminAccountBindingController _controller =
      widget.controller ?? IamFlutterMobileAdminAccountBindingController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminAccountBindingState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminAccountBindingState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminAccountBindingStatus.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        _controller.load();
        _controller.loadPolicy();
      });
    }
  }

  /// The policy being edited.
  ///
  /// Kept as a local draft so a half-toggled policy is never mistaken for the saved one: the
  /// server value stays in the controller state until a write is accepted.
  IamFlutterMobileAdminAccountBindingPolicy _draft =
      const IamFlutterMobileAdminAccountBindingPolicy();

  bool _draftReady = false;

  @override
  void dispose() {
    _unsubscribe();
    _search.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  autocorrect: false,
                  controller: _search,
                  decoration: InputDecoration(hintText: _message('searchPlaceholder')),
                  onSubmitted: (String value) => _controller.load(search: value),
                  textInputAction: TextInputAction.search,
                ),
              ),
              const SizedBox(width: SdkworkDesignTokens.spaceSm),
              FilledButton(
                onPressed: () => _controller.load(search: _search.text),
                child: Text(_message('searchAction')),
              ),
            ],
          ),
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Expanded(child: _buildBody()),
        ],
      ),
    );
  }

  Widget _buildBody() {
    // Adopt the server policy into the draft once it arrives, and again after a save lands.
    if (!_draftReady && _state.policy != null) {
      _draft = _state.policy!;
      _draftReady = true;
    }
    if (_state.status == IamFlutterMobileAdminAccountBindingStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: () => _controller.load(search: _state.search),
        retryLabel: _message('retry'),
      );
    }
    return ListView(
      children: <Widget>[
        _policySection(),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        if (_state.status == IamFlutterMobileAdminAccountBindingStatus.loading ||
            _state.status == IamFlutterMobileAdminAccountBindingStatus.idle)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: SdkworkDesignTokens.spaceMd),
            child: LinearProgressIndicator(),
          )
        else ...<Widget>[
          if (_state.items.isEmpty)
            Text(_state.search.isEmpty ? _message('empty') : _message('emptySearch'))
          else
            for (final IamFlutterMobileAdminAccountLinkRow row in _state.items)
              ListTile(
                contentPadding: EdgeInsets.zero,
                key: ValueKey<String>(row.accountLinkId),
                // The provider identity and the local user are both required to answer the
                // question this list exists for; whichever half is missing reads as absent.
                subtitle: Text(row.userId ?? row.accountLinkId),
                title: Text(
                  row.providerUserId == null
                      ? (row.provider ?? row.accountLinkId)
                      : '${row.provider ?? row.accountLinkId} · ${row.providerUserId}',
                ),
              ),
          if (_state.hasMore)
            FilledButton.tonal(
              onPressed: _state.loadingMore ? null : _controller.loadMore,
              child: _state.loadingMore
                  ? const SizedBox(
                      height: 16,
                      width: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(_message('loadMore')),
            ),
        ],
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

  /// The tenant policy editor.
  ///
  /// A policy the server has not reported is never rendered as "everything off": that would
  /// be a claim about the tenant the console cannot make.
  Widget _policySection() {
    if (_state.policy == null) {
      return Card(
        child: Padding(
          padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
          child: Row(
            children: <Widget>[
              Expanded(child: Text(_message('policyNotLoaded'))),
              TextButton(
                onPressed: _controller.loadPolicy,
                child: Text(_message('retry')),
              ),
            ],
          ),
        ),
      );
    }
    final bool dirty = _draft != _state.policy;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(SdkworkDesignTokens.spaceMd),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(_message('policySection'), style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            _toggle('policyContact', _draft.contactEnabled,
                (bool value) => setState(() => _draft = _draft.copyWith(contactEnabled: value))),
            _toggle('policyEmail', _draft.emailEnabled,
                (bool value) => setState(() => _draft = _draft.copyWith(emailEnabled: value))),
            _toggle('policyOauth', _draft.oauthEnabled,
                (bool value) => setState(() => _draft = _draft.copyWith(oauthEnabled: value))),
            _toggle('policyUnlink', _draft.selfServiceUnlinkEnabled,
                (bool value) =>
                    setState(() => _draft = _draft.copyWith(selfServiceUnlinkEnabled: value))),
            const SizedBox(height: SdkworkDesignTokens.spaceSm),
            Row(
              children: <Widget>[
                FilledButton(
                  onPressed: dirty && !_state.savingPolicy
                      ? () async {
                          final bool saved = await _controller.savePolicy(_draft);
                          if (saved && mounted) setState(() => _draftReady = true);
                        }
                      : null,
                  child: _state.savingPolicy
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Text(_message('savePolicy')),
                ),
                const SizedBox(width: SdkworkDesignTokens.spaceSm),
                if (_state.policySaved && !dirty)
                  Text(
                    _message('policySaved'),
                    style: TextStyle(color: Theme.of(context).colorScheme.primary),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _toggle(String labelKey, bool value, void Function(bool) onChanged) {
    return SwitchListTile(
      contentPadding: EdgeInsets.zero,
      onChanged: _state.savingPolicy ? null : onChanged,
      title: Text(_message(labelKey)),
      value: value,
    );
  }
}
