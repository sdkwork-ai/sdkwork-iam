// SDKWORK-IAM-FLUTTER-CONSOLE-ORGANIZATION: authored screen.
/**
 * Console organization directory (`console.iam.organization.directory`,
 * `/console/iam/organizations`).
 *
 * Every organization of the tenant an operator is acting in, server-searched and
 * server-paged. The row keeps the parent id so an operator can place it in the tree
 * without opening it.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/console_organization_controller.dart';
import '../services/console_organization_service.dart';
import '../state/console_organization_state.dart';

/// Entry screen of the `console_organization` capability.
class IamFlutterMobileConsoleOrganizationScreen extends StatefulWidget {
  const IamFlutterMobileConsoleOrganizationScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileConsoleOrganizationController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.console.organization.directory.title';

  @override
  State<IamFlutterMobileConsoleOrganizationScreen> createState() =>
      _IamFlutterMobileConsoleOrganizationScreenState();
}

class _IamFlutterMobileConsoleOrganizationScreenState
    extends State<IamFlutterMobileConsoleOrganizationScreen> {
  late final IamFlutterMobileConsoleOrganizationController _controller =
      widget.controller ?? IamFlutterMobileConsoleOrganizationController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileConsoleOrganizationState _state;

  final TextEditingController _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileConsoleOrganizationState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileConsoleOrganizationStatus.idle) {
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
    if (_state.status == IamFlutterMobileConsoleOrganizationStatus.loading ||
        _state.status == IamFlutterMobileConsoleOrganizationStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileConsoleOrganizationStatus.error) {
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
              final IamFlutterMobileConsoleOrganizationRow row = _state.items[index];
              return ListTile(
                key: ValueKey<String>(row.id),
                contentPadding: EdgeInsets.zero,
                subtitle: row.detail == null ? null : Text(row.detail!),
                title: Text(row.title),
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
