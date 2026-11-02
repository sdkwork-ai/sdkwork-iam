// SDKWORK-IAM-FLUTTER-TENANT: authored screen.
/**
 * Route-level UI of the `tenant` capability (`app.iam.tenant.overview`).
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 *
 * Copy arrives as a message map rather than as a hard-coded string so the package
 * stays locale-neutral: the shell loads the `.arb` fragment through
 * `SdkworkArbBundle` and passes the decoded map down.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/tenant_controller.dart';
import '../services/tenant_service.dart';
import '../state/tenant_state.dart';

/// Entry screen of the `tenant` capability.
class IamFlutterMobileTenantScreen extends StatefulWidget {
  const IamFlutterMobileTenantScreen({
    super.key,
    required this.messages,
    this.controller,
    this.onOpenOrganizations,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileTenantController? controller;

  /// Opens the organization directory; the action is rendered only when provided.
  final VoidCallback? onOpenOrganizations;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.tenant.overview.title';

  @override
  State<IamFlutterMobileTenantScreen> createState() => _IamFlutterMobileTenantScreenState();
}

class _IamFlutterMobileTenantScreenState extends State<IamFlutterMobileTenantScreen> {
  late final IamFlutterMobileTenantController _controller =
      widget.controller ?? IamFlutterMobileTenantController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileTenantState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileTenantState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileTenantStatus.idle) {
      // Loading from initState keeps the first frame honest: the screen renders
      // its loading state instead of an empty overview that looks like "no data".
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
    switch (_state.status) {
      case IamFlutterMobileTenantStatus.idle:
      case IamFlutterMobileTenantStatus.loading:
        return const SdkworkLoadingView();
      case IamFlutterMobileTenantStatus.error:
        return SdkworkErrorView(
          message: _state.errorMessage ?? _message('loadError'),
          retryLabel: _message('retry'),
          onRetry: () => _controller.load(),
        );
      case IamFlutterMobileTenantStatus.ready:
        return _buildOverview(_state.overview ?? const IamFlutterMobileTenantOverview());
    }
  }

  Widget _buildOverview(IamFlutterMobileTenantOverview overview) {
    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _SessionCard(messages: widget.messages, overview: overview, message: _message),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _RowCard(
          emptyText: _message('empty'),
          rows: overview.organizations,
          title: _message('organizationsSection'),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _RowCard(
          emptyText: _message('empty'),
          rows: overview.memberships,
          title: _message('membershipsSection'),
        ),
        if (widget.onOpenOrganizations != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceMd),
          FilledButton.tonal(
            onPressed: widget.onOpenOrganizations,
            child: Text(_message('organizationsSection')),
          ),
        ],
      ],
    );
  }
}

class _SessionCard extends StatelessWidget {
  const _SessionCard({
    required this.messages,
    required this.message,
    required this.overview,
  });

  final Map<String, String> messages;
  final String Function(String key) message;
  final IamFlutterMobileTenantOverview overview;

  @override
  Widget build(BuildContext context) {
    final String notReported = message('notReported');
    return _Card(
      title: message('sessionSection'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _KeyValue(label: 'Tenant', value: overview.tenantId ?? notReported),
          _KeyValue(label: 'User', value: overview.userId ?? notReported),
          _KeyValue(label: 'Environment', value: overview.environment ?? notReported),
        ],
      ),
    );
  }
}

class _RowCard extends StatelessWidget {
  const _RowCard({required this.emptyText, required this.rows, required this.title});

  final String emptyText;
  final List<IamFlutterMobileTenantRow> rows;
  final String title;

  @override
  Widget build(BuildContext context) {
    return _Card(
      title: title,
      child: rows.isEmpty
          ? Text(emptyText)
          : Column(
              children: <Widget>[
                for (final IamFlutterMobileTenantRow row in rows)
                  ListTile(
                    key: ValueKey<String>(row.id),
                    contentPadding: EdgeInsets.zero,
                    subtitle: row.detail == null ? null : Text(row.detail!),
                    title: Text(row.title),
                  ),
              ],
            ),
    );
  }
}

class _Card extends StatelessWidget {
  const _Card({required this.child, required this.title});

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

class _KeyValue extends StatelessWidget {
  const _KeyValue({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: SdkworkDesignTokens.spaceXs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          SizedBox(width: 96, child: Text(label, style: Theme.of(context).textTheme.bodySmall)),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
