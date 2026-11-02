// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored screen.
/**
 * Admin permission catalog (`admin.iam.permission.permissions`, `/admin/iam/permissions`).
 *
 * The tenant's permission catalog over the backend-api. An operator scans it to answer
 * "does this tenant even have a permission for that resource?" before granting anything, so
 * every row shows the code plus the resource and action it grants.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_permission_controller.dart';
import '../services/admin_permission_service.dart';
import '../state/admin_permission_state.dart';

/// Entry screen of the `admin_permission` capability.
class IamFlutterMobileAdminPermissionScreen extends StatefulWidget {
  const IamFlutterMobileAdminPermissionScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminPermissionController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.permission.permissions.title';

  @override
  State<IamFlutterMobileAdminPermissionScreen> createState() =>
      _IamFlutterMobileAdminPermissionScreenState();
}

class _IamFlutterMobileAdminPermissionScreenState
    extends State<IamFlutterMobileAdminPermissionScreen> {
  late final IamFlutterMobileAdminPermissionController _controller =
      widget.controller ?? IamFlutterMobileAdminPermissionController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminPermissionState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminPermissionState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminPermissionStatus.idle) {
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
    if (_state.status == IamFlutterMobileAdminPermissionStatus.loading ||
        _state.status == IamFlutterMobileAdminPermissionStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminPermissionStatus.error) {
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
              final IamFlutterMobileAdminPermissionRow row = _state.items[index];
              return ListTile(
                key: ValueKey<String>(row.id),
                contentPadding: EdgeInsets.zero,
                subtitle: Text(
                  <String?>[row.resource, row.action].whereType<String>().join(' · ').isEmpty
                      ? row.id
                      : <String?>[row.resource, row.action].whereType<String>().join(' · '),
                ),
                title: Text(row.code),
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
