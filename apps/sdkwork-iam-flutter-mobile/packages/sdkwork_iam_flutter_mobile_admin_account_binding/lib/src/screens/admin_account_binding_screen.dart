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
    if (_state.status == IamFlutterMobileAdminAccountBindingStatus.loading ||
        _state.status == IamFlutterMobileAdminAccountBindingStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminAccountBindingStatus.error) {
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
              final IamFlutterMobileAdminAccountLinkRow row = _state.items[index];
              // The provider identity and the local user are both required to answer the
              // question this list exists for; whichever half is missing reads as absent.
              final String title = row.providerUserId == null
                  ? (row.provider ?? row.accountLinkId)
                  : '${row.provider ?? row.accountLinkId} · ${row.providerUserId}';
              return ListTile(
                contentPadding: EdgeInsets.zero,
                key: ValueKey<String>(row.accountLinkId),
                subtitle: Text(row.userId ?? row.accountLinkId),
                title: Text(title),
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
