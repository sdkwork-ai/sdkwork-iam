// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Package-local locale boundary of `sdkwork_iam_flutter_mobile_user_center`.
 *
 * Thin by construction (I18N_SPEC.md section 171): the `.arb` fragments under
 * `en-US/iam/user_center/` and `zh-CN/iam/user_center/` own the copy, this file
 * only names the locales and the asset path each one is read from.
 */

/// Locales this package ships fragments for.
const List<String> iamFlutterMobileUserCenterSupportedLocales = <String>['en-US', 'zh-CN'];

/// Asset path of the fragment bundle of one locale.
///
/// The fragments are bundled assets rather than `gen-l10n` input, because
/// `arb-dir` cannot span the `<locale>/<domain>/<capability>` layout.
String iamFlutterMobileUserCenterFragmentAssetPath(String locale) =>
    'lib/src/i18n/$locale/iam/user_center/user_center.arb';
