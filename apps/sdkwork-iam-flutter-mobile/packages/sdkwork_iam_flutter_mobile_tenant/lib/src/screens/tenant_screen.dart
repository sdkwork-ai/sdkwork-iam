// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route-level UI of the `tenant` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/tenant_controller.dart';
import '../state/tenant_state.dart';

/// Entry screen of the `tenant` capability.
class IamFlutterMobileTenantScreen extends StatefulWidget {
  const IamFlutterMobileTenantScreen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.tenant.overview.title';

  @override
  State<IamFlutterMobileTenantScreen> createState() => _IamFlutterMobileTenantScreenState();
}

class _IamFlutterMobileTenantScreenState extends State<IamFlutterMobileTenantScreen> {
  final IamFlutterMobileTenantController _controller = IamFlutterMobileTenantController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileTenantState _state;

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
        titleKey: IamFlutterMobileTenantScreen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileTenantScreen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileTenantScreen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
