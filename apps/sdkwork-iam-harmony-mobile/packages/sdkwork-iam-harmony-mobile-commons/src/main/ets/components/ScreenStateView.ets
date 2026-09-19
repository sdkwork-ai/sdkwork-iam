// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Shared screen-state view.
 *
 * Every page routes its state through this component so loading, empty,
 * permission-denied, offline and error render identically across capabilities.
 * The message is a locale key resolved by `I18nHelpers`, never a backend string:
 * a server detail is not user-safe copy.
 */
import { ScreenState, } from '../state/ScreenState';
import { resolveMessage } from '../i18n/I18nHelpers';
import { DesignTokens } from '../theme/DesignTokens';

@Component
export struct ScreenStateView {
  status: ScreenState = 'loading';
  message: string = '';
  retryLabel: string = '';

  build() {
    Column() {
      Text(resolveMessage(this.message))
        .fontSize(DesignTokens.fontSizeBody)
        .fontColor(
          this.status === 'error' || this.status === 'unknown-error'
            ? DesignTokens.colorTextSecondary
            : DesignTokens.colorTextPrimary,
        )
    }
    .padding(DesignTokens.spacingMd)
    .width('100%')
    .height('100%')
    .justifyContent(FlexAlign.Center)
  }
}
