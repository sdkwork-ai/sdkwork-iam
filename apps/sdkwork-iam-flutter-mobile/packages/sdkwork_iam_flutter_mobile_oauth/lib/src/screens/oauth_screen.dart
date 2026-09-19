// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Route-level UI of the `oauth` capability.
 *
 * Screens render state and forward intents; they hold no transport, no runtime
 * configuration and no platform-channel call (APP_FLUTTER_UI_SPEC.md).
 */

import 'package:flutter/material.dart';
import 'package:sdkwork_iam_flutter_mobile_commons/sdkwork_iam_flutter_mobile_commons.dart';

import '../controllers/oauth_controller.dart';
import '../state/oauth_state.dart';

/// Entry screen of the `oauth` capability.
class IamFlutterMobileOauthScreen extends StatefulWidget {
  const IamFlutterMobileOauthScreen({super.key});

  /// Locale key of this screen's title.
  static const String titleKey = 'iam.oauth.providers.title';

  @override
  State<IamFlutterMobileOauthScreen> createState() => _IamFlutterMobileOauthScreenState();
}

class _IamFlutterMobileOauthScreenState extends State<IamFlutterMobileOauthScreen> {
  final IamFlutterMobileOauthController _controller = IamFlutterMobileOauthController();

  late final void Function() _unsubscribe;
  late IamFlutterMobileOauthState _state;

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
        titleKey: IamFlutterMobileOauthScreen.titleKey,
        body: SdkworkErrorView(message: _state.errorKey!),
      );
    }
    if (_state.items.isEmpty) {
      return SdkworkScaffold(
        titleKey: IamFlutterMobileOauthScreen.titleKey,
        loading: _state.loading,
        body: const SdkworkLoadingView(),
      );
    }
    return SdkworkScaffold(
      titleKey: IamFlutterMobileOauthScreen.titleKey,
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (BuildContext context, int index) =>
            ListTile(title: Text(_state.items[index])),
      ),
    );
  }
}
