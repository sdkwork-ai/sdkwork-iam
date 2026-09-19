// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route-level UI of the `console_tenant` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/console_tenant_controller.dart';
import '../state/console_tenant_state.dart';

/// Entry screen of the `console_tenant` capability.
class IamFlutterMobileConsoleTenantScreen extends StatefulWidget {
  const IamFlutterMobileConsoleTenantScreen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.console.tenant.overview.title';

  @override
  State<IamFlutterMobileConsoleTenantScreen> createState() => _IamFlutterMobileConsoleTenantScreenState();
}

class _IamFlutterMobileConsoleTenantScreenState extends State<IamFlutterMobileConsoleTenantScreen> {
  final IamFlutterMobileConsoleTenantController _controller = IamFlutterMobileConsoleTenantController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileConsoleTenantState _state;

  @override
  void initState() {
    super.initState();
    _state = _controller.state;
    _unsubscribe = _controller.addListener((next) {
      if (!mounted) return;
      setState(() => _state = next);
    });
  }

  @override
  void dispose() {
    _unsubscribe();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_state.errorKey != null) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileConsoleTenantScreen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileConsoleTenantScreen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileConsoleTenantScreen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
