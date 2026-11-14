// SDKWORK-IAM-H5-KIT: authored surface, not generated.
/**
 * Domain-neutral UI kit for the sdkwork-iam-h5 client root.
 *
 * Owns the design tokens, the page frame, list/detail primitives, load-state
 * hooks and the locale-bundle mechanism. It owns **no** business screen, no SDK
 * construction and no domain vocabulary (`APP_MOBILE_REACT_UI_SPEC.md` section 2).
 */

export {
  describeSdkworkIamH5Error,
  type SdkworkIamH5ErrorInfo,
  type SdkworkIamH5ProblemLike,
} from "./errors";
export {
  SDKWORK_IAM_H5_DEFAULT_PAGE_SIZE,
  readSdkworkIamH5Page,
  useSdkworkIamH5PagedList,
  useSdkworkIamH5Resource,
  type SdkworkIamH5ListQuery,
  type SdkworkIamH5LoadStatus,
  type SdkworkIamH5Page,
  type SdkworkIamH5PageFetcher,
  type SdkworkIamH5PagedList,
  type SdkworkIamH5Resource,
} from "./hooks/list-state";
export {
  createSdkworkIamH5MessageCatalog,
  normalizeLocaleTag,
  resolveLocalizedLabel,
  SdkworkIamH5I18nProvider,
  useSdkworkIamH5Locale,
  useSdkworkIamH5Messages,
  type SdkworkIamH5I18nProviderProps,
  type SdkworkIamH5LocaleBundle,
  type SdkworkIamH5MessageCatalog,
} from "./i18n";
export {
  SdkworkIamH5Card,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5Screen,
  SdkworkIamH5TabBar,
  type SdkworkIamH5CardProps,
  type SdkworkIamH5KeyValueItem,
  type SdkworkIamH5KeyValueListProps,
  type SdkworkIamH5ScreenProps,
  type SdkworkIamH5TabBarProps,
  type SdkworkIamH5TabItem,
} from "./components/layout";
export {
  SdkworkIamH5Badge,
  SdkworkIamH5Button,
  SdkworkIamH5Field,
  SdkworkIamH5Notice,
  SdkworkIamH5SearchField,
  SdkworkIamH5Select,
  type SdkworkIamH5BadgeProps,
  type SdkworkIamH5BadgeTone,
  type SdkworkIamH5ButtonProps,
  type SdkworkIamH5ButtonVariant,
  type SdkworkIamH5FieldProps,
  type SdkworkIamH5NoticeProps,
  type SdkworkIamH5SearchFieldProps,
  type SdkworkIamH5SelectProps,
} from "./components/primitives";
export {
  SdkworkIamH5PagedListSection,
  type SdkworkIamH5PagedListSectionMessages,
  type SdkworkIamH5PagedListSectionProps,
} from "./components/list-section";
export {
  SdkworkIamH5EmptyState,
  SdkworkIamH5ErrorState,
  SdkworkIamH5List,
  SdkworkIamH5ListFooter,
  SdkworkIamH5LoadingState,
  type SdkworkIamH5EmptyStateProps,
  type SdkworkIamH5ErrorStateProps,
  type SdkworkIamH5ListFooterProps,
  type SdkworkIamH5ListProps,
  type SdkworkIamH5ListRowDescriptor,
  type SdkworkIamH5LoadingStateProps,
} from "./components/states";
export {
  ensureSdkworkIamH5KitStyles,
  SDKWORK_IAM_H5_KIT_CSS,
} from "./theme/styles";
export {
  SDKWORK_IAM_H5_DARK_TOKENS,
  SDKWORK_IAM_H5_LIGHT_TOKENS,
  type SdkworkIamH5ColorTokens,
  type SdkworkIamH5RadiusTokens,
  type SdkworkIamH5SpacingTokens,
  type SdkworkIamH5ThemeName,
  type SdkworkIamH5Tokens,
} from "./theme/tokens";
