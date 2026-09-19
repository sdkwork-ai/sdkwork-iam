// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route-level UI of the `organization` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/organization_controller.dart';
import '../state/organization_state.dart';

/// Entry screen of the `organization` capability.
class IamFlutterMobileOrganizationScreen extends StatefulWidget {
  const IamFlutterMobileOrganizationScreen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.organization.directory.title';

  @override
  State<IamFlutterMobileOrganizationScreen> createState() => _IamFlutterMobileOrganizationScreenState();
}

class _IamFlutterMobileOrganizationScreenState extends State<IamFlutterMobileOrganizationScreen> {
  final IamFlutterMobileOrganizationController _controller = IamFlutterMobileOrganizationController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileOrganizationState _state;

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
        titleKey: IamFlutterMobileOrganizationScreen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileOrganizationScreen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileOrganizationScreen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
