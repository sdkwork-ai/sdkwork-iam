import type { CSSProperties, ComponentType, ReactNode } from 'react';

import {
  createSdkworkIamUserCenterMeThemePresetTokens,
  createSdkworkIamUserCenterMeTokenStyleOverrides,
  SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS,
  type SdkworkIamUserCenterMeStatus,
  type SdkworkIamUserCenterMeThemePreset,
  type SdkworkIamUserCenterMeTokenCssVariableName,
  type SdkworkIamUserCenterMeThemeTokens,
} from '@sdkwork/iam-user-center-core';

export type {
  SdkworkIamUserCenterMeStatus,
  SdkworkIamUserCenterMeThemePreset,
  SdkworkIamUserCenterMeThemeTokens,
} from '@sdkwork/iam-user-center-core';

/** Root style carrying component-token custom properties. */
export type SdkworkIamH5UserCenterMeRootStyle = CSSProperties
  & Partial<Record<SdkworkIamUserCenterMeTokenCssVariableName, string>>;

export interface SdkworkIamH5UserCenterMeSlotContainerProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export interface SdkworkIamH5UserCenterMeHeaderSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  title: ReactNode;
}

export interface SdkworkIamH5UserCenterMeHeroSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  /** Prebuilt avatar node (image or initials well). */
  avatar: ReactNode;
  contextChips?: ReactNode;
  displayName: ReactNode;
  username?: ReactNode;
}

export interface SdkworkIamH5UserCenterMeContextRowView {
  id: string;
  label: ReactNode;
  value?: ReactNode;
}

export interface SdkworkIamH5UserCenterMeContextCardSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  rows: readonly SdkworkIamH5UserCenterMeContextRowView[];
}

export interface SdkworkIamH5UserCenterMeMenuItemView {
  danger?: boolean;
  disabled?: boolean;
  id: string;
  label: ReactNode;
  onSelect: () => void;
  value?: ReactNode;
}

export interface SdkworkIamH5UserCenterMeMenuSectionView {
  id: string;
  items: readonly SdkworkIamH5UserCenterMeMenuItemView[];
  title?: ReactNode;
}

export interface SdkworkIamH5UserCenterMeMenuSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  sections: readonly SdkworkIamH5UserCenterMeMenuSectionView[];
}

export interface SdkworkIamH5UserCenterMeMenuItemSlotProps extends SdkworkIamH5UserCenterMeMenuItemView {
  className?: string;
  style?: CSSProperties;
}

export interface SdkworkIamH5UserCenterMeActionsSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  onSignOut: () => void;
  signOutDisabled?: boolean;
  signOutLabel: ReactNode;
  signingOut: boolean;
}

export interface SdkworkIamH5UserCenterMeStatesSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  errorLabel?: ReactNode;
  loadingLabel: ReactNode;
  onRetry?: () => void;
  retryLabel: ReactNode;
  status: SdkworkIamUserCenterMeStatus;
}

export interface SdkworkIamH5UserCenterMeFooterSlotProps extends SdkworkIamH5UserCenterMeSlotContainerProps {
  note?: ReactNode;
}

/**
 * Named component slots for the "Me" page. Every slot has a default; hosts
 * replace only the regions they need to re-skin or extend. The default
 * `Menu` renders each row through the `MenuItem` slot, so list rows stay
 * replaceable independently of the list container.
 */
export interface SdkworkIamH5UserCenterMeSlots {
  Actions?: ComponentType<SdkworkIamH5UserCenterMeActionsSlotProps>;
  ContextCard?: ComponentType<SdkworkIamH5UserCenterMeContextCardSlotProps>;
  Footer?: ComponentType<SdkworkIamH5UserCenterMeFooterSlotProps>;
  Header?: ComponentType<SdkworkIamH5UserCenterMeHeaderSlotProps>;
  Hero?: ComponentType<SdkworkIamH5UserCenterMeHeroSlotProps>;
  Menu?: ComponentType<SdkworkIamH5UserCenterMeMenuSlotProps>;
  MenuItem?: ComponentType<SdkworkIamH5UserCenterMeMenuItemSlotProps>;
  Page?: ComponentType<SdkworkIamH5UserCenterMeSlotContainerProps>;
  States?: ComponentType<SdkworkIamH5UserCenterMeStatesSlotProps>;
}

export interface SdkworkIamH5UserCenterMeSlotPropsConfig {
  actions?: Partial<SdkworkIamH5UserCenterMeActionsSlotProps>;
  contextCard?: Partial<SdkworkIamH5UserCenterMeContextCardSlotProps>;
  footer?: Partial<SdkworkIamH5UserCenterMeFooterSlotProps>;
  header?: Partial<SdkworkIamH5UserCenterMeHeaderSlotProps>;
  hero?: Partial<SdkworkIamH5UserCenterMeHeroSlotProps>;
  menu?: Partial<SdkworkIamH5UserCenterMeMenuSlotProps>;
  menuItem?: Partial<SdkworkIamH5UserCenterMeMenuItemSlotProps>;
  page?: Partial<SdkworkIamH5UserCenterMeSlotContainerProps>;
  states?: Partial<SdkworkIamH5UserCenterMeStatesSlotProps>;
}

/** Per-region class/style overrides applied to the default renderers. */
export interface SdkworkIamH5UserCenterMeRegionAppearance {
  actionsClassName?: string;
  actionsStyle?: CSSProperties;
  contextCardClassName?: string;
  contextCardStyle?: CSSProperties;
  footerClassName?: string;
  footerStyle?: CSSProperties;
  headerClassName?: string;
  headerStyle?: CSSProperties;
  heroAvatarClassName?: string;
  heroAvatarStyle?: CSSProperties;
  heroClassName?: string;
  heroStyle?: CSSProperties;
  menuClassName?: string;
  menuStyle?: CSSProperties;
  pageClassName?: string;
  pageStyle?: CSSProperties;
}

export interface SdkworkIamH5UserCenterMeAppearanceConfig extends SdkworkIamH5UserCenterMeRegionAppearance {
  /** Brand look; `sdkwork` (default) adapts to the host tokens and mode. */
  preset?: SdkworkIamUserCenterMeThemePreset;
  slotProps?: SdkworkIamH5UserCenterMeSlotPropsConfig;
  slots?: SdkworkIamH5UserCenterMeSlots;
  /** Explicit token overrides; win over the preset values. */
  theme?: SdkworkIamUserCenterMeThemeTokens;
}

export function mergeSdkworkIamH5UserCenterMeClassNames(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(' ');
}

export function mergeSdkworkIamH5UserCenterMeStyles(
  ...styles: Array<CSSProperties | null | undefined>
): CSSProperties | undefined {
  const resolved = styles.filter(Boolean);
  if (!resolved.length) {
    return undefined;
  }
  return Object.assign({}, ...resolved);
}

export interface SdkworkIamH5UserCenterMeResolvedAppearance {
  preset: SdkworkIamUserCenterMeThemePreset;
  regions: SdkworkIamH5UserCenterMeRegionAppearance;
  rootClassName: string;
  rootStyle: SdkworkIamH5UserCenterMeRootStyle | undefined;
  slotProps: SdkworkIamH5UserCenterMeSlotPropsConfig | undefined;
  slots: SdkworkIamH5UserCenterMeSlots | undefined;
}

/**
 * Resolves the appearance config: preset tokens merged with explicit token
 * overrides become CSS custom properties on the page root, so default
 * renderers and replaced slots inherit the same theme.
 */
export function resolveSdkworkIamH5UserCenterMeAppearance(
  appearance?: SdkworkIamH5UserCenterMeAppearanceConfig | null,
): SdkworkIamH5UserCenterMeResolvedAppearance {
  const preset = appearance?.preset ?? 'sdkwork';
  const presetTokens = createSdkworkIamUserCenterMeThemePresetTokens(preset);
  const tokens: SdkworkIamUserCenterMeThemeTokens = { ...presetTokens, ...appearance?.theme };
  const tokenVariables = createSdkworkIamUserCenterMeTokenStyleOverrides(tokens);
  const hasTokenVariables = Object.keys(tokenVariables).length > 0;

  const rootStyle = hasTokenVariables || appearance?.pageStyle
    ? {
        ...tokenVariables,
        ...appearance?.pageStyle,
      } as SdkworkIamH5UserCenterMeRootStyle
    : undefined;

  return {
    preset,
    regions: {
      actionsClassName: appearance?.actionsClassName,
      actionsStyle: appearance?.actionsStyle,
      contextCardClassName: appearance?.contextCardClassName,
      contextCardStyle: appearance?.contextCardStyle,
      footerClassName: appearance?.footerClassName,
      footerStyle: appearance?.footerStyle,
      headerClassName: appearance?.headerClassName,
      headerStyle: appearance?.headerStyle,
      heroAvatarClassName: appearance?.heroAvatarClassName,
      heroAvatarStyle: appearance?.heroAvatarStyle,
      heroClassName: appearance?.heroClassName,
      heroStyle: appearance?.heroStyle,
      menuClassName: appearance?.menuClassName,
      menuStyle: appearance?.menuStyle,
      pageClassName: appearance?.pageClassName,
      pageStyle: appearance?.pageStyle,
    },
    rootClassName: mergeSdkworkIamH5UserCenterMeClassNames(
      SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS,
      'sdkwork-iam-user-center-me__page',
      appearance?.pageClassName,
    ),
    rootStyle,
    slotProps: appearance?.slotProps,
    slots: appearance?.slots,
  };
}
