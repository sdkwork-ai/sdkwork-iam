/**
 * Theme-token contract for the user-center "Me" page (THEME_DARKMODE_SPEC.md).
 *
 * This module is a token definition file: concrete color values are allowed
 * HERE and only here. Components consume the `--sdk-comp-iam-me-*` component
 * tokens, which prefer the host surface's `--sdk-color-*` semantic layer and
 * fall back to the values below when the host has not provided one. Light and
 * dark values are both declared; mode comes exclusively from the host mode
 * root (`data-sdk-color-mode` / `.dark`) — this module never reads
 * `prefers-color-scheme` and never writes the mode root.
 */

export const SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS = 'sdkwork-iam-user-center-me';

/**
 * Semantic component tokens. Keys are stable API; values are any CSS color
 * (or any value valid for the consuming property).
 */
export interface SdkworkIamUserCenterMeThemeTokens {
  accent?: string;
  accentContrast?: string;
  accentSoftBackground?: string;
  controlBackground?: string;
  dangerForeground?: string;
  dangerSoftBackground?: string;
  divider?: string;
  pageBackground?: string;
  surfaceBackground?: string;
  surfaceBorder?: string;
  textMuted?: string;
  textPrimary?: string;
  textSecondary?: string;
}

export type SdkworkIamUserCenterMeThemeTokenKey = keyof SdkworkIamUserCenterMeThemeTokens;

/** Token key to the CSS custom property the default surfaces consume. */
export const SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES = {
  accent: '--sdk-comp-iam-me-accent',
  accentContrast: '--sdk-comp-iam-me-accent-contrast',
  accentSoftBackground: '--sdk-comp-iam-me-accent-soft-background',
  controlBackground: '--sdk-comp-iam-me-control-background',
  dangerForeground: '--sdk-comp-iam-me-danger-foreground',
  dangerSoftBackground: '--sdk-comp-iam-me-danger-soft-background',
  divider: '--sdk-comp-iam-me-divider',
  pageBackground: '--sdk-comp-iam-me-page-background',
  surfaceBackground: '--sdk-comp-iam-me-surface-background',
  surfaceBorder: '--sdk-comp-iam-me-surface-border',
  textMuted: '--sdk-comp-iam-me-text-muted',
  textPrimary: '--sdk-comp-iam-me-text-primary',
  textSecondary: '--sdk-comp-iam-me-text-secondary',
} as const satisfies Record<SdkworkIamUserCenterMeThemeTokenKey, string>;

export type SdkworkIamUserCenterMeTokenCssVariableName =
  (typeof SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES)[SdkworkIamUserCenterMeThemeTokenKey];

/** Light-mode values; every entry prefers the host L2 semantic token. */
export const SDKWORK_IAM_USER_CENTER_ME_TOKEN_DEFAULTS_LIGHT: Readonly<
  Record<SdkworkIamUserCenterMeThemeTokenKey, string>
> = {
  accent: 'var(--sdk-color-brand-primary, #2563eb)',
  accentContrast: 'var(--sdk-color-text-inverse, #ffffff)',
  accentSoftBackground:
    'color-mix(in srgb, var(--sdk-color-brand-primary, #2563eb) 12%, transparent)',
  controlBackground: 'var(--sdk-color-surface-panel-muted, rgba(24, 24, 27, 0.04))',
  dangerForeground: 'var(--sdk-color-state-danger, #dc2626)',
  dangerSoftBackground:
    'color-mix(in srgb, var(--sdk-color-state-danger, #dc2626) 10%, transparent)',
  divider: 'var(--sdk-color-border-subtle, rgba(24, 24, 27, 0.08))',
  pageBackground: 'var(--sdk-color-surface-canvas, #f4f4f5)',
  surfaceBackground: 'var(--sdk-color-surface-panel, #ffffff)',
  surfaceBorder: 'var(--sdk-color-border-subtle, rgba(24, 24, 27, 0.08))',
  textMuted: 'var(--sdk-color-text-muted, #71717a)',
  textPrimary: 'var(--sdk-color-text-primary, #18181b)',
  textSecondary: 'var(--sdk-color-text-secondary, #3f3f46)',
};

/** Dark-mode values; single-mode token sets are forbidden (F3/P0). */
export const SDKWORK_IAM_USER_CENTER_ME_TOKEN_DEFAULTS_DARK: Readonly<
  Record<SdkworkIamUserCenterMeThemeTokenKey, string>
> = {
  accent: 'var(--sdk-color-brand-primary, #3b82f6)',
  accentContrast: 'var(--sdk-color-text-inverse, #ffffff)',
  accentSoftBackground:
    'color-mix(in srgb, var(--sdk-color-brand-primary, #3b82f6) 18%, transparent)',
  controlBackground: 'var(--sdk-color-surface-panel-muted, rgba(255, 255, 255, 0.06))',
  dangerForeground: 'var(--sdk-color-state-danger, #f87171)',
  dangerSoftBackground:
    'color-mix(in srgb, var(--sdk-color-state-danger, #f87171) 16%, transparent)',
  divider: 'var(--sdk-color-border-subtle, rgba(255, 255, 255, 0.10))',
  pageBackground: 'var(--sdk-color-surface-canvas, #09090b)',
  surfaceBackground: 'var(--sdk-color-surface-panel, #18181b)',
  surfaceBorder: 'var(--sdk-color-border-subtle, rgba(255, 255, 255, 0.10))',
  textMuted: 'var(--sdk-color-text-muted, #a1a1aa)',
  textPrimary: 'var(--sdk-color-text-primary, #fafafa)',
  textSecondary: 'var(--sdk-color-text-secondary, #d4d4d8)',
};

export type SdkworkIamUserCenterMeThemePreset = 'midnight' | 'paper' | 'sdkwork';

/**
 * Presets express deliberate brand looks. `sdkwork` is the adaptive default:
 * empty overrides, so the page follows the host semantic tokens and mode in
 * both light and dark.
 */
export function createSdkworkIamUserCenterMeThemePresetTokens(
  preset: SdkworkIamUserCenterMeThemePreset = 'sdkwork',
): SdkworkIamUserCenterMeThemeTokens {
  if (preset === 'midnight') {
    return {
      accent: '#3b82f6',
      accentContrast: '#ffffff',
      accentSoftBackground: 'rgba(59, 130, 246, 0.16)',
      controlBackground: 'rgba(255, 255, 255, 0.06)',
      dangerForeground: '#f87171',
      dangerSoftBackground: 'rgba(248, 113, 113, 0.14)',
      divider: 'rgba(148, 163, 184, 0.14)',
      pageBackground: '#020617',
      surfaceBackground: 'rgba(15, 23, 42, 0.92)',
      surfaceBorder: 'rgba(148, 163, 184, 0.16)',
      textMuted: '#94a3b8',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
    };
  }

  if (preset === 'paper') {
    return {
      accent: '#0f766e',
      accentContrast: '#ffffff',
      accentSoftBackground: 'rgba(15, 118, 110, 0.10)',
      controlBackground: 'rgba(28, 25, 23, 0.04)',
      dangerForeground: '#b91c1c',
      dangerSoftBackground: 'rgba(185, 28, 28, 0.08)',
      divider: 'rgba(120, 113, 108, 0.12)',
      pageBackground: '#faf9f7',
      surfaceBackground: '#ffffff',
      surfaceBorder: 'rgba(120, 113, 108, 0.16)',
      textMuted: '#78716c',
      textPrimary: '#1c1917',
      textSecondary: '#44403c',
    };
  }

  return {};
}

/**
 * CSS declarations that apply explicit token overrides on the page root; the
 * consuming surface merges them into its root style. Only provided tokens
 * produce declarations, keyed by their literal CSS variable names.
 */
export function createSdkworkIamUserCenterMeTokenStyleOverrides(
  tokens?: SdkworkIamUserCenterMeThemeTokens,
): Partial<Record<SdkworkIamUserCenterMeTokenCssVariableName, string>> {
  if (!tokens) {
    return {};
  }

  const declarations: Record<string, string> = {};
  for (const [tokenKey, variableName] of Object.entries(SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES)) {
    const value = tokens[tokenKey as SdkworkIamUserCenterMeThemeTokenKey];
    if (value !== undefined) {
      declarations[variableName] = value;
    }
  }
  return declarations as Partial<Record<SdkworkIamUserCenterMeTokenCssVariableName, string>>;
}

/**
 * Dual-mode component-token sheet scoped to the Me page root class. Mode is
 * inherited from the host mode root; the sheet itself never resolves mode.
 */
export function createSdkworkIamUserCenterMeThemeCss(): string {
  const lightBlock = renderTokenBlock(
    `.${SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS}`,
    SDKWORK_IAM_USER_CENTER_ME_TOKEN_DEFAULTS_LIGHT,
  );
  const darkScope = `:where(.dark, [data-sdk-color-mode='dark'])`;
  const darkBlock = renderTokenBlock(
    `.${SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS}:where(.dark, [data-sdk-color-mode='dark']),${darkScope} .${SDKWORK_IAM_USER_CENTER_ME_ROOT_CLASS}`,
    SDKWORK_IAM_USER_CENTER_ME_TOKEN_DEFAULTS_DARK,
  );
  return `${lightBlock}\n${darkBlock}`;
}

function renderTokenBlock(
  selector: string,
  tokens: Readonly<Record<SdkworkIamUserCenterMeThemeTokenKey, string>>,
): string {
  const declarations = Object.entries(SDKWORK_IAM_USER_CENTER_ME_TOKEN_VARIABLES)
    .map(([tokenKey, variableName]) => `  ${variableName}:${tokens[tokenKey as SdkworkIamUserCenterMeThemeTokenKey]};`)
    .join('\n');
  return `${selector}{\n${declarations}\n}`;
}
