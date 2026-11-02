/**
 * The H5 kit stylesheet.
 *
 * Injected once per document instead of a side-effect CSS import, matching the
 * `@sdkwork/shell-mobile-react` navbar: a source-linked consumer then needs no
 * bundler CSS configuration, and a host that renders two IAM surfaces still gets
 * one stylesheet.
 *
 * Every rule is scoped under `.sdkwork-iam-h5` so the kit cannot restyle a host
 * application, and every colour resolves through a `--sdkwork-iam-h5-*` custom
 * property so re-theming needs no selector override.
 */

import { SDKWORK_IAM_H5_DARK_TOKENS, SDKWORK_IAM_H5_LIGHT_TOKENS } from "./tokens";

const STYLE_ATTRIBUTE = "data-sdkwork-iam-h5-kit";

function customProperties(prefix: string, tokens: typeof SDKWORK_IAM_H5_LIGHT_TOKENS): string {
  const { colors, radius, spacing } = tokens;
  return [
    `${prefix}-color-background: ${colors.background};`,
    `${prefix}-color-surface: ${colors.surface};`,
    `${prefix}-color-surface-muted: ${colors.surfaceMuted};`,
    `${prefix}-color-text: ${colors.text};`,
    `${prefix}-color-text-muted: ${colors.textMuted};`,
    `${prefix}-color-text-inverse: ${colors.textInverse};`,
    `${prefix}-color-border: ${colors.border};`,
    `${prefix}-color-primary: ${colors.primary};`,
    `${prefix}-color-primary-strong: ${colors.primaryStrong};`,
    `${prefix}-color-danger: ${colors.danger};`,
    `${prefix}-color-success: ${colors.success};`,
    `${prefix}-color-warning: ${colors.warning};`,
    `${prefix}-color-focus: ${colors.focus};`,
    `${prefix}-space-xxs: ${spacing.xxs}px;`,
    `${prefix}-space-xs: ${spacing.xs}px;`,
    `${prefix}-space-sm: ${spacing.sm}px;`,
    `${prefix}-space-md: ${spacing.md}px;`,
    `${prefix}-space-lg: ${spacing.lg}px;`,
    `${prefix}-space-xl: ${spacing.xl}px;`,
    `${prefix}-radius-sm: ${radius.sm}px;`,
    `${prefix}-radius-md: ${radius.md}px;`,
    `${prefix}-radius-lg: ${radius.lg}px;`,
    `${prefix}-radius-pill: ${radius.pill}px;`,
  ].join("\n  ");
}

/** The complete kit stylesheet. */
export const SDKWORK_IAM_H5_KIT_CSS = `
.sdkwork-iam-h5 {
  ${customProperties("--sdkwork-iam-h5", SDKWORK_IAM_H5_LIGHT_TOKENS)}
  background: var(--sdkwork-iam-h5-color-background);
  box-sizing: border-box;
  color: var(--sdkwork-iam-h5-color-text);
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 15px;
  inline-size: 100%;
  line-height: 1.5;
  min-block-size: 100%;
}
.sdkwork-iam-h5[data-sdkwork-iam-h5-theme="dark"] {
  ${customProperties("--sdkwork-iam-h5", SDKWORK_IAM_H5_DARK_TOKENS)}
}
.sdkwork-iam-h5 *,
.sdkwork-iam-h5 *::before,
.sdkwork-iam-h5 *::after {
  box-sizing: border-box;
}
.sdkwork-iam-h5 :focus-visible {
  outline: 2px solid var(--sdkwork-iam-h5-color-focus);
  outline-offset: 2px;
}

/* ---------- layout ---------- */
.sdkwork-iam-h5__main {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow-y: auto;
  overscroll-behavior-y: contain;
  padding: var(--sdkwork-iam-h5-space-md);
  -webkit-overflow-scrolling: touch;
}
.sdkwork-iam-h5__main--flushed { padding: 0; }
.sdkwork-iam-h5__toolbar {
  display: flex;
  gap: var(--sdkwork-iam-h5-space-sm);
  margin-block-end: var(--sdkwork-iam-h5-space-md);
}
.sdkwork-iam-h5__toolbar > * { flex: 1 1 auto; }

/* ---------- card / section ---------- */
.sdkwork-iam-h5-card {
  background: var(--sdkwork-iam-h5-color-surface);
  border: 1px solid var(--sdkwork-iam-h5-color-border);
  border-radius: var(--sdkwork-iam-h5-radius-lg);
  overflow: hidden;
}
.sdkwork-iam-h5-card + .sdkwork-iam-h5-card { margin-block-start: var(--sdkwork-iam-h5-space-md); }
.sdkwork-iam-h5-card__header {
  align-items: baseline;
  border-block-end: 1px solid var(--sdkwork-iam-h5-color-border);
  display: flex;
  gap: var(--sdkwork-iam-h5-space-sm);
  justify-content: space-between;
  padding: var(--sdkwork-iam-h5-space-sm) var(--sdkwork-iam-h5-space-md);
}
.sdkwork-iam-h5-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
}
.sdkwork-iam-h5-card__caption {
  color: var(--sdkwork-iam-h5-color-text-muted);
  font-size: 0.8125rem;
  margin: 0;
}
.sdkwork-iam-h5-card__body { padding: var(--sdkwork-iam-h5-space-md); }
.sdkwork-iam-h5-card__body--flush { padding: 0; }

/* ---------- key/value ---------- */
.sdkwork-iam-h5-kv {
  display: grid;
  gap: var(--sdkwork-iam-h5-space-xs) var(--sdkwork-iam-h5-space-md);
  grid-template-columns: minmax(6rem, 38%) 1fr;
  margin: 0;
}
.sdkwork-iam-h5-kv > dt {
  color: var(--sdkwork-iam-h5-color-text-muted);
  font-size: 0.8125rem;
  margin: 0;
}
.sdkwork-iam-h5-kv > dd {
  font-size: 0.875rem;
  margin: 0;
  overflow-wrap: anywhere;
}

/* ---------- list ---------- */
.sdkwork-iam-h5-list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sdkwork-iam-h5-list__row {
  border-block-end: 1px solid var(--sdkwork-iam-h5-color-border);
  display: flex;
  flex-direction: column;
  gap: var(--sdkwork-iam-h5-space-xxs);
  inline-size: 100%;
  padding: var(--sdkwork-iam-h5-space-sm) var(--sdkwork-iam-h5-space-md);
  text-align: start;
}
.sdkwork-iam-h5-list__row:last-child { border-block-end: 0; }
.sdkwork-iam-h5-list__row--interactive {
  appearance: none;
  background: none;
  border-inline: 0;
  border-block-start: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.sdkwork-iam-h5-list__row--interactive:active { background: var(--sdkwork-iam-h5-color-surface-muted); }
.sdkwork-iam-h5-list__primary {
  font-size: 0.9375rem;
  font-weight: 550;
  overflow-wrap: anywhere;
}
.sdkwork-iam-h5-list__secondary {
  color: var(--sdkwork-iam-h5-color-text-muted);
  font-size: 0.8125rem;
  overflow-wrap: anywhere;
}

/* ---------- states ---------- */
.sdkwork-iam-h5-state {
  align-items: center;
  color: var(--sdkwork-iam-h5-color-text-muted);
  display: flex;
  flex-direction: column;
  gap: var(--sdkwork-iam-h5-space-sm);
  justify-content: center;
  padding: var(--sdkwork-iam-h5-space-xl) var(--sdkwork-iam-h5-space-md);
  text-align: center;
}
.sdkwork-iam-h5-state__title {
  color: var(--sdkwork-iam-h5-color-text);
  font-size: 0.9375rem;
  font-weight: 600;
  margin: 0;
}
.sdkwork-iam-h5-state__detail { font-size: 0.8125rem; margin: 0; }
.sdkwork-iam-h5-state--error .sdkwork-iam-h5-state__title { color: var(--sdkwork-iam-h5-color-danger); }
.sdkwork-iam-h5-spinner {
  animation: sdkwork-iam-h5-spin 0.9s linear infinite;
  block-size: 1.25rem;
  border: 2px solid var(--sdkwork-iam-h5-color-border);
  border-block-start-color: var(--sdkwork-iam-h5-color-primary);
  border-radius: var(--sdkwork-iam-h5-radius-pill);
  inline-size: 1.25rem;
}
@keyframes sdkwork-iam-h5-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .sdkwork-iam-h5-spinner { animation-duration: 3s; }
}

/* ---------- controls ---------- */
.sdkwork-iam-h5-button {
  align-items: center;
  appearance: none;
  border: 1px solid transparent;
  border-radius: var(--sdkwork-iam-h5-radius-md);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  gap: var(--sdkwork-iam-h5-space-xs);
  justify-content: center;
  min-block-size: 2.5rem;
  padding-inline: var(--sdkwork-iam-h5-space-md);
}
.sdkwork-iam-h5-button:disabled { cursor: not-allowed; opacity: 0.5; }
.sdkwork-iam-h5-button--primary {
  background: var(--sdkwork-iam-h5-color-primary);
  color: var(--sdkwork-iam-h5-color-text-inverse);
}
.sdkwork-iam-h5-button--secondary {
  background: var(--sdkwork-iam-h5-color-surface);
  border-color: var(--sdkwork-iam-h5-color-border);
  color: var(--sdkwork-iam-h5-color-text);
}
.sdkwork-iam-h5-button--danger {
  background: var(--sdkwork-iam-h5-color-danger);
  color: var(--sdkwork-iam-h5-color-text-inverse);
}
.sdkwork-iam-h5-button--block { inline-size: 100%; }

.sdkwork-iam-h5-field { display: flex; flex-direction: column; gap: var(--sdkwork-iam-h5-space-xxs); }
.sdkwork-iam-h5-field + .sdkwork-iam-h5-field { margin-block-start: var(--sdkwork-iam-h5-space-sm); }
.sdkwork-iam-h5-field__label {
  color: var(--sdkwork-iam-h5-color-text-muted);
  font-size: 0.8125rem;
  font-weight: 550;
}
.sdkwork-iam-h5-field__control,
.sdkwork-iam-h5-field__select {
  background: var(--sdkwork-iam-h5-color-surface);
  border: 1px solid var(--sdkwork-iam-h5-color-border);
  border-radius: var(--sdkwork-iam-h5-radius-md);
  color: inherit;
  font: inherit;
  min-block-size: 2.5rem;
  padding: var(--sdkwork-iam-h5-space-xs) var(--sdkwork-iam-h5-space-sm);
  inline-size: 100%;
}
.sdkwork-iam-h5-field__control--multiline { min-block-size: 5.5rem; resize: vertical; }
.sdkwork-iam-h5-field__error { color: var(--sdkwork-iam-h5-color-danger); font-size: 0.8125rem; }
.sdkwork-iam-h5-field__hint { color: var(--sdkwork-iam-h5-color-text-muted); font-size: 0.75rem; }
.sdkwork-iam-h5-search { position: relative; }
.sdkwork-iam-h5-search .sdkwork-iam-h5-field__control { padding-inline-start: var(--sdkwork-iam-h5-space-md); }

/* ---------- notice ---------- */
.sdkwork-iam-h5-notice {
  border: 1px solid var(--sdkwork-iam-h5-color-border);
  border-radius: var(--sdkwork-iam-h5-radius-md);
  font-size: 0.875rem;
  margin-block-end: var(--sdkwork-iam-h5-space-md);
  padding: var(--sdkwork-iam-h5-space-sm) var(--sdkwork-iam-h5-space-md);
}
.sdkwork-iam-h5-notice--info { background: var(--sdkwork-iam-h5-color-surface-muted); }
.sdkwork-iam-h5-notice--danger {
  background: transparent;
  border-color: var(--sdkwork-iam-h5-color-danger);
  color: var(--sdkwork-iam-h5-color-danger);
}
.sdkwork-iam-h5-notice--success {
  background: transparent;
  border-color: var(--sdkwork-iam-h5-color-success);
  color: var(--sdkwork-iam-h5-color-success);
}

/* ---------- tab bar ---------- */
.sdkwork-iam-h5-tabbar {
  background: var(--sdkwork-iam-h5-color-surface);
  border-block-start: 1px solid var(--sdkwork-iam-h5-color-border);
  display: flex;
  padding-block-end: env(safe-area-inset-bottom);
}
.sdkwork-iam-h5-tabbar__item {
  align-items: center;
  appearance: none;
  background: none;
  border: 0;
  color: var(--sdkwork-iam-h5-color-text-muted);
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  font: inherit;
  font-size: 0.6875rem;
  gap: 2px;
  justify-content: center;
  min-block-size: 3rem;
  padding-block: var(--sdkwork-iam-h5-space-xs);
}
.sdkwork-iam-h5-tabbar__item[aria-current="page"] {
  color: var(--sdkwork-iam-h5-color-primary);
  font-weight: 600;
}

/* ---------- badge ---------- */
.sdkwork-iam-h5-badge {
  border: 1px solid var(--sdkwork-iam-h5-color-border);
  border-radius: var(--sdkwork-iam-h5-radius-pill);
  font-size: 0.75rem;
  padding: 0 var(--sdkwork-iam-h5-space-xs);
  white-space: nowrap;
}
.sdkwork-iam-h5-badge--success { border-color: var(--sdkwork-iam-h5-color-success); color: var(--sdkwork-iam-h5-color-success); }
.sdkwork-iam-h5-badge--danger { border-color: var(--sdkwork-iam-h5-color-danger); color: var(--sdkwork-iam-h5-color-danger); }
.sdkwork-iam-h5-badge--warning { border-color: var(--sdkwork-iam-h5-color-warning); color: var(--sdkwork-iam-h5-color-warning); }

.sdkwork-iam-h5-sr-only {
  block-size: 1px;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  inline-size: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
}
`;

/**
 * Injects the kit stylesheet once per document.
 *
 * Safe in a non-DOM (server render or Node test) environment: it does nothing.
 * @returns whether a `<style>` element is present afterwards.
 */
export function ensureSdkworkIamH5KitStyles(): boolean {
  if (typeof document === "undefined") return false;
  const existing = document.querySelector(`style[${STYLE_ATTRIBUTE}]`);
  if (existing) return true;
  const element = document.createElement("style");
  element.setAttribute(STYLE_ATTRIBUTE, "");
  element.textContent = SDKWORK_IAM_H5_KIT_CSS;
  document.head.appendChild(element);
  return true;
}
