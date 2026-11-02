/**
 * Design tokens for the SDKWork IAM H5 client.
 *
 * The H5 root ships no utility-CSS build step, so the kit expresses its theme as
 * CSS custom properties injected once (`./styles.ts`) and exposes the same values
 * as TypeScript constants for inline styles and tests. Every token is a
 * `--sdkwork-iam-h5-*` property so a host can re-theme the whole surface without
 * patching a component.
 *
 * `APP_MOBILE_REACT_UI_SPEC.md` section 3 keeps shared visual primitives
 * domain-neutral; these are the only colour/spacing decisions the primitives make.
 */

/** Colour roles, in the semantic vocabulary the screens use. */
export interface SdkworkIamH5ColorTokens {
  /** Page background behind cards. */
  readonly background: string;
  /** Card and sheet surface. */
  readonly surface: string;
  /** Nested surface inside a card (list rows, code blocks). */
  readonly surfaceMuted: string;
  /** Primary text. */
  readonly text: string;
  /** Secondary text: labels, metadata, hints. */
  readonly textMuted: string;
  /** Text on a primary-filled control. */
  readonly textInverse: string;
  /** Hairline borders and row dividers. */
  readonly border: string;
  /** Brand accent for primary actions and the active tab. */
  readonly primary: string;
  /** Primary fill while hovered/pressed. */
  readonly primaryStrong: string;
  /** Danger: destructive actions and error states. */
  readonly danger: string;
  /** Success: completed actions. */
  readonly success: string;
  /** Warning: degraded but usable. */
  readonly warning: string;
  /** Focus ring, kept separate so it stays visible on every surface. */
  readonly focus: string;
}

/** Spacing scale, in CSS pixels. */
export interface SdkworkIamH5SpacingTokens {
  readonly xxs: number;
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
}

/** Corner radii, in CSS pixels. */
export interface SdkworkIamH5RadiusTokens {
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly pill: number;
}

/** The complete H5 token set. */
export interface SdkworkIamH5Tokens {
  readonly colors: SdkworkIamH5ColorTokens;
  readonly radius: SdkworkIamH5RadiusTokens;
  readonly spacing: SdkworkIamH5SpacingTokens;
}

/** Light theme — the default the kit renders in. */
export const SDKWORK_IAM_H5_LIGHT_TOKENS: SdkworkIamH5Tokens = {
  colors: {
    background: "#f5f6f7",
    border: "#e3e6e8",
    danger: "#c02626",
    focus: "#2563eb",
    primary: "#1f6feb",
    primaryStrong: "#1858bd",
    success: "#177245",
    surface: "#ffffff",
    surfaceMuted: "#f0f2f4",
    text: "#16191c",
    textInverse: "#ffffff",
    textMuted: "#5c6670",
    warning: "#a15c00",
  },
  radius: { lg: 14, md: 10, pill: 999, sm: 6 },
  spacing: { lg: 20, md: 14, sm: 10, xl: 28, xs: 6, xxs: 3 },
};

/**
 * Dark theme.
 *
 * Supplied so a host switching `data-sdkwork-iam-h5-theme` never lands on
 * unreadable contrast; the kit itself never auto-switches, because the host owns
 * the appearance decision.
 */
export const SDKWORK_IAM_H5_DARK_TOKENS: SdkworkIamH5Tokens = {
  colors: {
    background: "#121417",
    border: "#2b3138",
    danger: "#f87171",
    focus: "#7aa7ff",
    primary: "#5b9dff",
    primaryStrong: "#7aa7ff",
    success: "#4ade80",
    surface: "#1b1f24",
    surfaceMuted: "#232a31",
    text: "#eef1f4",
    textInverse: "#0b0d10",
    textMuted: "#a3adb8",
    warning: "#fbbf24",
  },
  radius: { lg: 14, md: 10, pill: 999, sm: 6 },
  spacing: { lg: 20, md: 14, sm: 10, xl: 28, xs: 6, xxs: 3 },
};

/** Theme name accepted by the root attribute the stylesheet keys off. */
export type SdkworkIamH5ThemeName = "light" | "dark";
