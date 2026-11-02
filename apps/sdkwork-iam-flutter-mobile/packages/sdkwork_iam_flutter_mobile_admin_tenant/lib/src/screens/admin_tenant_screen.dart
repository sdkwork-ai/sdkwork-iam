// SDKWORK-IAM-FLUTTER-ADMIN-TENANT: authored screen.
/**
 * Admin tenant list (`admin.iam.tenant.list`, `/admin/iam/tenants`).
 *
 * The list an operator matches a support ticket against: the id the customer was given, the
 * name they call it, and the status that says whether it is usable at all.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_tenant_controller.dart';
import '../services/admin_tenant_service.dart';
import '../state/admin_tenant_state.dart';

/// Entry screen of the `admin_tenant` capability.
class IamFlutterMobileAdminTenantScreen extends StatefulWidget {
  const IamFlutterMobileAdminTenantScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminTenantController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.tenant.list.title';

  @override
  State<IamFlutterMobileAdminTenantScreen> createState() =>
      _IamFlutterMobileAdminTenantScreenState();
}

class _IamFlutterMobileAdminTenantScreenState extends State<IamFlutterMobileAdminTenantScreen> {
  late final IamFlutterMobileAdminTenantController _controller =
      widget.controller ?? IamFlutterMobileAdminTenantController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminTenantState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminTenantState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminTenantStatus.idle) {
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
                  decoration: InputDecoration(hintText: _message('searchPlaceholder')),
                  onSubmitted: (String value) => _controller.load(search: value),
                  textInputAction: TextInputAction.search,
                  controller: _search,
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
    if (_state.status == IamFlutterMobileAdminTenantStatus.loading ||
        _state.status == IamFlutterMobileAdminTenantStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminTenantStatus.error) {
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
              final IamFlutterMobileAdminTenantRow row = _state.items[index];
              final String name = row.name ?? row.slug ?? row.id;
              final String detail = <String?>[row.id, row.status]
                  .whereType<String>()
                  .join(' · ');
              return ListTile(
                key: ValueKey<String>(row.id),
                contentPadding: EdgeInsets.zero,
                subtitle: Text(detail.isEmpty ? row.id : detail),
                title: Text(name),
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
