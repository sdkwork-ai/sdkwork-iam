// SDKWORK-IAM-FLUTTER-ADMIN-AUDIT: authored screen.
/**
 * Admin audit trail (`admin.iam.audit.events`, `/admin/iam/audit`).
 *
 * The operator's only way to answer "who changed this, and when". Each row leads with the
 * action and the actor a ticket names; the resource and the timestamp follow as the way to
 * narrow to one change.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/admin_audit_controller.dart';
import '../services/admin_audit_service.dart';
import '../state/admin_audit_state.dart';

/// Entry screen of the `admin_audit` capability.
class IamFlutterMobileAdminAuditScreen extends StatefulWidget {
  const IamFlutterMobileAdminAuditScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileAdminAuditController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.admin.audit.events.title';

  @override
  State<IamFlutterMobileAdminAuditScreen> createState() =>
      _IamFlutterMobileAdminAuditScreenState();
}

class _IamFlutterMobileAdminAuditScreenState extends State<IamFlutterMobileAdminAuditScreen> {
  late final IamFlutterMobileAdminAuditController _controller =
      widget.controller ?? IamFlutterMobileAdminAuditController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileAdminAuditState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileAdminAuditState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileAdminAuditStatus.idle) {
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
    if (_state.status == IamFlutterMobileAdminAuditStatus.loading ||
        _state.status == IamFlutterMobileAdminAuditStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileAdminAuditStatus.error) {
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
              final IamFlutterMobileAdminAuditEvent event = _state.items[index];
              final String lead =
                  <String?>[event.action, event.actor].whereType<String>().join(' · ');
              final String detail = <String?>[event.resource, event.occurredAt]
                  .whereType<String>()
                  .join(' · ');
              return ListTile(
                key: ValueKey<String>(event.id),
                contentPadding: EdgeInsets.zero,
                subtitle: Text(detail.isEmpty ? event.id : detail),
                title: Text(lead.isEmpty ? event.id : lead),
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
