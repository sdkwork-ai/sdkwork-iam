// SDKWORK-IAM-FLUTTER-CONSOLE-USER-CENTER: authored screen.
/**
 * Console user-center profile (`console.iam.user-center.profile`, `/console/iam/user`).
 *
 * The operator's own record plus the tenant verification policy. The policy is shown row by
 * row as required or optional rather than only when required: a missing row would leave an
 * operator unable to tell a policy gap from an unasked question.
 *
 * Copy arrives as a decoded `.arb` map so the package stays locale-neutral.
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/console_user_center_controller.dart';
import '../services/console_user_center_service.dart';
import '../state/console_user_center_state.dart';

/// Entry screen of the `console_user_center` capability.
class IamFlutterMobileConsoleUserCenterScreen extends StatefulWidget {
  const IamFlutterMobileConsoleUserCenterScreen({
    super.key,
    required this.messages,
    this.controller,
  });

  /// Decoded locale fragment of this capability.
  final Map<String, String> messages;

  /// Injected controller; a default one is built when omitted.
  final IamFlutterMobileConsoleUserCenterController? controller;

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.console.userCenter.profile.title';

  @override
  State<IamFlutterMobileConsoleUserCenterScreen> createState() =>
      _IamFlutterMobileConsoleUserCenterScreenState();
}

class _IamFlutterMobileConsoleUserCenterScreenState
    extends State<IamFlutterMobileConsoleUserCenterScreen> {
  late final IamFlutterMobileConsoleUserCenterController _controller =
      widget.controller ?? IamFlutterMobileConsoleUserCenterController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileConsoleUserCenterState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((IamFlutterMobileConsoleUserCenterState next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
    if (_state.status == IamFlutterMobileConsoleUserCenterStatus.idle) {
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
    if (_state.status == IamFlutterMobileConsoleUserCenterStatus.loading ||
        _state.status == IamFlutterMobileConsoleUserCenterStatus.idle) {
      return const SdkworkLoadingView();
    }
    if (_state.status == IamFlutterMobileConsoleUserCenterStatus.error) {
      return SdkworkErrorView(
        message: _state.errorMessage ?? _message('loadError'),
        onRetry: _controller.load,
        retryLabel: _message('retry'),
      );
    }
    final String notReported = _message('notReported');
    final String required = _message('required');
    final String optional = _message('optional');
    final IamFlutterMobileConsoleUserAccount account =
        _state.account ?? const IamFlutterMobileConsoleUserAccount();
    final IamFlutterMobileConsoleUserVerificationPolicy policy =
        _state.policy ?? const IamFlutterMobileConsoleUserVerificationPolicy();

    return ListView(
      children: <Widget>[
        Text(_message('subtitle'), style: Theme.of(context).textTheme.bodySmall),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('accountSection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Row(label: _message('userId'), value: account.userId ?? notReported),
              _Row(label: _message('displayName'), value: account.displayName ?? notReported),
              _Row(label: _message('email'), value: account.email ?? notReported),
              _Row(label: _message('phone'), value: account.phone ?? notReported),
            ],
          ),
        ),
        const SizedBox(height: SdkworkDesignTokens.spaceMd),
        _Card(
          title: _message('verificationSection'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Row(
                label: _message('verificationContact'),
                value: policy.contactRequired ? required : optional,
              ),
              _Row(
                label: _message('verificationEmail'),
                value: policy.emailRequired ? required : optional,
              ),
              _Row(
                label: _message('verificationOauth'),
                value: policy.oauthRequired ? required : optional,
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
