// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route-level UI of the `user_center` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/user_center_controller.dart';
import '../state/user_center_state.dart';

/// Entry screen of the `user_center` capability.
class IamFlutterMobileUserCenterScreen extends StatefulWidget {
  const IamFlutterMobileUserCenterScreen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.userCenter.profile.title';

  @override
  State<IamFlutterMobileUserCenterScreen> createState() => _IamFlutterMobileUserCenterScreenState();
}

class _IamFlutterMobileUserCenterScreenState extends State<IamFlutterMobileUserCenterScreen> {
  final IamFlutterMobileUserCenterController _controller = IamFlutterMobileUserCenterController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileUserCenterState _state;

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
        titleKey: IamFlutterMobileUserCenterScreen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileUserCenterScreen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileUserCenterScreen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
