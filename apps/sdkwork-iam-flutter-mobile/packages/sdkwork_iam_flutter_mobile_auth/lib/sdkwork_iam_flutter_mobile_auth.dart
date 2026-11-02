library sdkwork_iam_flutter_mobile_auth;

// The stray `src/auth_route_manifest.dart` declared a second
// `IamFlutterMobileAuthRoutes` class (moduleId + loginPath) next to the one in
// `src/models/auth_view_model.dart` (the full route-id set). Exporting both made
// the package fail to compile with an ambiguous export, so only the canonical
// view-model manifest is exported; the physical path constants live in
// `src/routes/route_manifest.dart`.
export 'src/auth_session_controller.dart';
export 'src/login_context.dart';
export 'src/routes/route_manifest.dart';
export 'src/controllers/auth_controller.dart';
export 'src/services/auth_service.dart';
export 'src/state/auth_state.dart';
export 'src/models/auth_view_model.dart';
export 'src/screens/auth_screen.dart';
export 'src/screens/auth_forgot_password_screen.dart';
export 'src/i18n/manifest.dart';
