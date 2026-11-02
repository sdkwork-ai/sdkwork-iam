// SDKWORK-IAM-FLUTTER-ADMIN-PERMISSION: authored policies screen.
/**
 * Admin policy catalog (`admin.iam.permission.policies`, `/admin/iam/policies`).
 *
 * Every policy is one subject/action/resource grant with an effect. The effect leads the row
 * and is never colour-only: an operator skimming a phone screen must be able to read "deny"
 * as a word, because a deny that looks like an allow is the most expensive misreading in an
 * authorization console.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_paged_controller.dart';
import '../services/admin_permission_service.dart';
import '../state/admin_paged_state.dart';
import 'admin_catalog_list.dart';

/// Entry screen of the policy catalog.
class IamFlutterMobileAdminPoliciesScreen extends StatefulWidget {
  const IamFlutterMobileAdminPoliciesScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminPagedController<IamFlutterMobileAdminPolicyRow>? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.permission.policies.title';

  @override
  State<IamFlutterMobileAdminPoliciesScreen> createState() =>
      _IamFlutterMobileAdminPoliciesScreenState();
}

class _IamFlutterMobileAdminPoliciesScreenState
    extends State<IamFlutterMobileAdminPoliciesScreen> {
  late final IamFlutterMobileAdminPagedController<IamFlutterMobileAdminPolicyRow> _controller =
      widget.controller ??
          IamFlutterMobileAdminPagedController<IamFlutterMobileAdminPolicyRow>(
            fetch: ({required int page, required int pageSize, String? q}) async {
              throw StateError(
                'IamFlutterMobileAdminPoliciesScreen needs a controller; the root bootstrap must '
                'inject one built from the admin data source.',
              );
            },
          );

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminPagedState<IamFlutterMobileAdminPolicyRow> _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener(
      (IamFlutterMobileAdminPagedState<IamFlutterMobileAdminPolicyRow> next) {
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

  /// Maps this screen's wording onto the generic keys the shared chrome reads.
  Map<String, String> get _scopedMessages => <String, String>{
        ...widget.messages,
        'empty': _message('policiesEmpty'),
        'searchPlaceholder': _message('policiesSearchPlaceholder'),
        'subtitle': _message('policiesSubtitle'),
        'title': _message('policiesTitle'),
      };

  /// Renders the effect as a word.
  ///
  /// An unknown or absent effect reads as "not granted": in an authorization list, silence
  /// must not look like an allow.
  String _effectLabel(String? effect) {
    switch (effect) {
      case 'allow':
        return _message('effectAllow');
      case 'deny':
        return _message('effectDeny');
      default:
        return _message('effectUnknown');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SdkworkScaffold(
      titleKey: _message('policiesTitle'),
      body: IamFlutterMobileAdminCatalogList<IamFlutterMobileAdminPolicyRow>(
        buildRow: (BuildContext context, IamFlutterMobileAdminPolicyRow row) {
          final String subject = row.subject ?? row.id;
          final String detail =
              <String?>[row.resource, row.action].whereType<String>().join(' · ');
          return ListTile(
            contentPadding: EdgeInsets.zero,
            key: ValueKey<String>(row.id),
            subtitle: Text(detail.isEmpty ? row.id : detail),
            title: Text('${_effectLabel(row.effect)} · $subject'),
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
