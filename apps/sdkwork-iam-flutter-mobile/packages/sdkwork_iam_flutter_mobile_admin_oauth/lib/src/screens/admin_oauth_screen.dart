// SDKWORK-IAM-FLUTTER-ADMIN-OAUTH: authored screen.
/**
 * Admin OAuth provider catalog (`admin.iam.oauth.providers`, `/admin/iam/oauth-providers`).
 *
 * What this deployment can offer at sign-in. The state is stated as a word — enabled,
 * disabled or not reported — because "no badge" leaves an operator unable to tell whether a
 * provider is switched off or simply described incompletely.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_oauth_controller.dart';
import '../services/admin_oauth_service.dart';
import '../state/admin_oauth_state.dart';

/// Entry screen of the `admin_oauth` capability.
class IamFlutterMobileAdminOAuthScreen extends StatefulWidget {
  const IamFlutterMobileAdminOAuthScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminOAuthController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.oauth.providers.title';

  @override
  State<IamFlutterMobileAdminOAuthScreen> createState() =>
      _IamFlutterMobileAdminOAuthScreenState();
}

class _IamFlutterMobileAdminOAuthScreenState extends State<IamFlutterMobileAdminOAuthScreen> {
  late final IamFlutterMobileAdminOAuthController _controller =
      widget.controller ?? IamFlutterMobileAdminOAuthController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminOAuthState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminOAuthState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminOAuthStatus.idle) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _controller.load();
      });
    }
  }

  @override
  void dispose() {
    _unsubscribe();
    _search.dispose();
    super.dispose();
  }

  String _message(String key) => widget.messages[key] ?? key;

  /// States the provider's state as a word.
  String _stateLabel(bool? enabled) {
    if (enabled == null) return _message('stateUnknown');
    return enabled ? _message('stateEnabled') : _message('stateDisabled');
  }

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
    if (_state.status == IamFlutterMobileAdminOAuthStatus.loading ||
        _state.status == IamFlutterMobileAdminOAuthStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminOAuthStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: () => _controller.load(search: _state.search),
        retryLabel: _message('retry'),
      );
    }
    if (_state.items.isEmpty) {
      return Center(
        child: Text(_state.search.isEmpty ? _message('empty') : _message('emptySearch')),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (_state.errorMessage != null)
          Text(
            _state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: _state.items.length,
            itemBuilder: (BuildContext context, int index) {
              final IamFlutterMobileAdminOAuthProviderRow row = _state.items[index];
              final String detail = <String?>[row.providerKey, row.source]
                  .whereType<String>()
                  .join(' · ');
              return ListTile(
                contentPadding: EdgeInsets.zero,
                key: ValueKey<String>(row.providerKey),
                subtitle: Text(detail.isEmpty ? row.providerKey : detail),
                title: Text('${row.displayName ?? row.providerKey} · ${_stateLabel(row.enabled)}'),
              );
            },
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
    );
  }
}
