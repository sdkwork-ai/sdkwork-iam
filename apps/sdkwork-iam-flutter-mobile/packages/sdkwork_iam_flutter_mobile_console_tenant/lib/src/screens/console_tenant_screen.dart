// SDKWORK-IAM-FLUTTER-CONSOLE-TENANT: authored screen.
/**
 * Console tenant workspace (`console.iam.tenant.overview`, `/console/iam/tenant`).
 *
 * Three regions in the order an operator reads them: the tenant they are acting in, the
 * self-service policies that decide what its users may do themselves, and the tenant's
 * organizations. The app tenant screen answers "what is mine"; this one answers "what is
 * this tenant's".
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/console_tenant_controller.dart';
import '../services/console_tenant_service.dart';
import '../state/console_tenant_state.dart';

/// Entry screen of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantScreen extends StatefulWidget {
  const IamFlutterMobileConsoleTenantScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileConsoleTenantController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.console.tenant.overview.title';

  @override
  State<IamFlutterMobileConsoleTenantScreen> createState() =>
      _IamFlutterMobileConsoleTenantScreenState();
}

class _IamFlutterMobileConsoleTenantScreenState extends State<IamFlutterMobileConsoleTenantScreen> {
  late final IamFlutterMobileConsoleTenantController _controller =
      widget.controller ?? IamFlutterMobileConsoleTenantController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileConsoleTenantState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileConsoleTenantState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileConsoleTenantStatus.idle) {
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
    if (_state.status == IamFlutterMobileConsoleTenantStatus.loading ||
        _state.status == IamFlutterMobileConsoleTenantStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileConsoleTenantStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    final String allowed = _message('allowed');
    final String denied = _message('denied');
    final String notReported = _message('notReported');
    final IamFlutterMobileConsoleTenantPolicy policy =
        _state.policy ?? const IamFlutterMobileConsoleTenantPolicy();
    final IamFlutterMobileConsoleTenantRuntime runtime =
        _state.runtime ?? const IamFlutterMobileConsoleTenantRuntime();

    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('sessionSection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Row(label: _message('environment'), value: runtime.environment ?? notReported),
              _Row(label: _message('tenant'), value: runtime.tenantId ?? notReported),
              _Row(label: _message('user'), value: runtime.userId ?? notReported),
            ],
          ),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('policySection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Row(label: _message('policyContact'), value: policy.contactEnabled ? allowed : denied),
              _Row(label: _message('policyEmail'), value: policy.emailEnabled ? allowed : denied),
              _Row(label: _message('policyOauth'), value: policy.oauthEnabled ? allowed : denied),
              _Row(
                label: _message('policyUnlink'),
                value: policy.selfServiceUnlinkEnabled ? allowed : denied,
              ),
            ],
          ),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('organizationsSection'),
          child: _state.organizations.isEmpty
              ? Text(_message('emptyOrganizations'))
              : Column(
                  children: <Widget>[
                    for (final IamFlutterMobileConsoleTenantOrganization organization
                        in _state.organizations)
                      ListTile(
                        key: ValueKey<String>(organization.id),
                        contentPadding: EdgeInsets.zero,
                        subtitle: organization.detail == null ? null : Text(organization.detail!),
                        title: Text(organization.title),
                      ),
                  ],
                ),
        ),
        if (_state.errorMessage != null) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
          Text(
            _state.errorMessage!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ],
        if (_state.hasMore) ...<Widget>[
          const SizedBox(height: SdkworkDesignTokens.spaceSm),
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
      ],
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

class _Row extends StatelessWidget {
  const _Row({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: SdkworkDesignTokens.spaceXs),
      child: Row(
        children: <Widget>[
          Expanded(child: Text(label)),
          Text(value),
        ],
      ),
    );
  }
}
