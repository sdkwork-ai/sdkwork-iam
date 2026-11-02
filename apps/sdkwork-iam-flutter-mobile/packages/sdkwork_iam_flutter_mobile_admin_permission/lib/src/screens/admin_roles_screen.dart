// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored roles screen.
/**
 * Admin role catalog (`admin.iam.permission.roles`, `/admin/iam/roles`).
 *
 * The roles an operator can assign. The row leads with the name a ticket uses and carries the
 * role code and scope, because a code is what a support request quotes when the name is
 * ambiguous — several tenants name their role "Admin".
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_paged_controller.dart';
import '../services/admin_permission_service.dart';
import '../state/admin_paged_state.dart';
import 'admin_catalog_list.dart';

/// Entry screen of the role catalog.
class IamFlutterMobileAdminRolesScreen extends StatefulWidget {
  const IamFlutterMobileAdminRolesScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminPagedController<IamFlutterMobileAdminRoleRow>? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.permission.roles.title';

  @override
  State<IamFlutterMobileAdminRolesScreen> createState() =>
      _IamFlutterMobileAdminRolesScreenState();
}

class _IamFlutterMobileAdminRolesScreenState extends State<IamFlutterMobileAdminRolesScreen> {
  late final IamFlutterMobileAdminPagedController<IamFlutterMobileAdminRoleRow> _controller =
      widget.controller ??
          IamFlutterMobileAdminPagedController<IamFlutterMobileAdminRoleRow>(
            fetch: ({required int page, required int pageSize, String? q}) async {
              throw StateError(
                'IamFlutterMobileAdminRolesScreen needs a controller; the root bootstrap must '
                'inject one built from the admin data source.',
              );
            },
          );

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminPagedState<IamFlutterMobileAdminRoleRow> _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener(
      (IamFlutterMobileAdminPagedState<IamFlutterMobileAdminRoleRow> next) {
        if (!mounted) return;
        setState(() => _state = next);
      },
    );
    if (_state.status == IamFlutterMobileAdminPagedStatus.idle) {
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

  /// The shared catalog chrome reads the generic keys, so this screen maps its own wording
  /// onto them instead of forcing three near-identical widgets.
  Map<String, String> get _scopedMessages => <String, String>{
        ...widget.messages,
        'empty': _message('rolesEmpty'),
        'searchPlaceholder': _message('rolesSearchPlaceholder'),
        'subtitle': _message('rolesSubtitle'),
        'title': _message('rolesTitle'),
      };

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('rolesTitle'),
      body: IamFlutterMobileAdminCatalogList<IamFlutterMobileAdminRoleRow>(
        buildRow: (BuildContext context, IamFlutterMobileAdminRoleRow row) {
          final String title = row.name ?? row.code ?? row.id;
          final String detail = <String?>[row.code, row.scope].whereType<String>().join(' · ');
          return ListTile(
            contentPadding: EdgeInsets.zero,
            key: ValueKey<String>(row.id),
            subtitle: Text(detail.isEmpty ? row.id : detail),
            title: Text(title),
          );
        },
        messages: _scopedMessages,
        onLoadMore: _controller.loadMore,
        onRetry: () => _controller.load(search: _state.search),
        onSearch: (String search) => _controller.load(search: search),
        state: _state,
      ),
    );
  }
}
