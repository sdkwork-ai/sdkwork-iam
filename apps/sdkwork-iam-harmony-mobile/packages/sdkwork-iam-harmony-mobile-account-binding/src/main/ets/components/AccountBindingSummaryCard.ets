// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
/**
 * Summary card of `sdkwork-iam-harmony-mobile-account-binding`.
 *
 * Section 4: `components/` owns reusable or domain-specific UI. This component
 * reads design tokens from `commons` rather than literals so one token change
 * moves every card in the root.
 */
import { DesignTokens } from '@sdkwork/sdkwork-iam-harmony-mobile-commons';

@Component
export struct AccountBindingSummaryCard {
  label: string = '';
  value: string = '';

  build() {
    Column() {
      Text(this.label)
        .fontSize(DesignTokens.fontSizeCaption)
        .fontColor(DesignTokens.colorTextSecondary)
      Text(this.value)
        .fontSize(DesignTokens.fontSizeTitle)
        .fontColor(DesignTokens.colorTextPrimary)
    }
    .padding(DesignTokens.spacingMd)
    .width('100%')
  }
}
