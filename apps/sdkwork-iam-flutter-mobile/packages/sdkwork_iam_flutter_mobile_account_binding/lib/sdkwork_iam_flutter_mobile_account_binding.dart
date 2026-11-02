library sdkwork_iam_flutter_mobile_account_binding;

// `src/account_binding_controller.dart` and `src/controllers/account_binding_controller.dart`
// both declare `IamFlutterMobileAccountBindingController`; exporting both was an
// ambiguous export that stopped the root from compiling. The layered
// `src/controllers/` file is the canonical one.
export 'src/account_binding_route_manifest.dart';
export 'src/routes/route_manifest.dart';
export 'src/controllers/account_binding_controller.dart';
export 'src/services/account_binding_service.dart';
export 'src/state/account_binding_state.dart';
export 'src/models/account_binding_view_model.dart';
export 'src/screens/account_binding_screen.dart';
export 'src/i18n/manifest.dart';
