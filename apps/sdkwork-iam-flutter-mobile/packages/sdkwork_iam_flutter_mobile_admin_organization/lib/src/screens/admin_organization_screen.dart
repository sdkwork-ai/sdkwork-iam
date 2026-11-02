// SDKWORK-IAM-FLUTTER-ADMIN-ORGANIZATION: authored screen.
/**
 * Admin organization tree (`admin.iam.organization.tree`, `/admin/iam/organizations`).
 *
 * The whole hierarchy in one scrollable list, indented by depth. A phone cannot show nested
 * scroll views, so the tree arrives flattened and the indent carries the structure.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_organization_controller.dart';
import '../services/admin_organization_service.dart';
import '../state/admin_organization_state.dart';

/// Entry screen of the `admin_organization` capability.
class IamFlutterMobileAdminOrganizationScreen extends StatefulWidget {
  const IamFlutterMobileAdminOrganizationScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminOrganizationController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.organization.tree.title';

  @override
  State<IamFlutterMobileAdminOrganizationScreen> createState() =>
      _IamFlutterMobileAdminOrganizationScreenState();
}

class _IamFlutterMobileAdminOrganizationScreenState
    extends State<IamFlutterMobileAdminOrganizationScreen> {
  late final IamFlutterMobileAdminOrganizationController _controller =
      widget.controller ?? IamFlutterMobileAdminOrganizationController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminOrganizationState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminOrganizationState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminOrganizationStatus.idle) {
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

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('title'),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_state.status == IamFlutterMobileAdminOrganizationStatus.loading ||
        _state.status == IamFlutterMobileAdminOrganizationStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminOrganizationStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    if (_state.entries.isEmpty) {
      return Center(child: Text(_message('empty')));
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        if (_state.errorMessage != null)
          Text(
            _state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: _state.entries.length,
            itemBuilder: (BuildContext context, int index) {
              final IamFlutterMobileAdminOrganizationEntry entry = _state.entries[index];
              final String name = entry.node.name ?? entry.node.id;
              final String detail =
                  entry.node.parentId == null ? entry.node.id : '${entry.node.id} · ${entry.node.parentId}';
              return ListTile(
                contentPadding: EdgeInsets.only(left: 16.0 * entry.depth),
                key: ValueKey<String>(entry.node.id),
                leading: entry.depth == 0 ? null : const Icon(Icons.subdirectory_arrow_right, size: 16),
                subtitle: Text(detail),
                title: Text(name),
              );
            },
          ),
        ),
      ],
    );
  }
}
