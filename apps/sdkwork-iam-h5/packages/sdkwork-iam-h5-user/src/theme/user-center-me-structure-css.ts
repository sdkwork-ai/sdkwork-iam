/**
 * Structural stylesheet for the H5 "Me" page default renderers.
 *
 * Layout and touch behavior only — every color resolves through the
 * `--sdk-comp-iam-me-*` component tokens declared by
 * `@sdkwork/iam-user-center-core` (THEME_DARKMODE_SPEC.md); no palette hex
 * appears here. The sheet is injected once per document and never restyles
 * host chrome (`html`/`body`) or uses `!important`.
 */
export const SDKWORK_IAM_USER_CENTER_ME_STRUCTURE_CSS = `
.sdkwork-iam-user-center-me__page {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--sdk-comp-iam-me-page-background);
  color: var(--sdk-comp-iam-me-text-primary);
  font-family: inherit;
  padding-bottom: env(safe-area-inset-bottom);
}
.sdkwork-iam-user-center-me__page *,
.sdkwork-iam-user-center-me__page *::before,
.sdkwork-iam-user-center-me__page *::after {
  box-sizing: border-box;
}
.sdkwork-iam-user-center-me__header {
  padding: calc(12px + env(safe-area-inset-top)) 16px 8px;
}
.sdkwork-iam-user-center-me__header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  line-height: 1.3;
  color: var(--sdk-comp-iam-me-text-primary);
}
.sdkwork-iam-user-center-me__hero {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 4px 12px 0;
  padding: 16px;
  border: 1px solid var(--sdk-comp-iam-me-surface-border);
  border-radius: 16px;
  background: var(--sdk-comp-iam-me-surface-background);
}
.sdkwork-iam-user-center-me__hero-avatar {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--sdk-comp-iam-me-accent-soft-background);
  color: var(--sdk-comp-iam-me-accent);
  font-size: 20px;
  font-weight: 600;
  object-fit: cover;
}
.sdkwork-iam-user-center-me__hero-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.sdkwork-iam-user-center-me__hero-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.35;
  color: var(--sdk-comp-iam-me-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdkwork-iam-user-center-me__hero-username {
  margin: 0;
  font-size: 13px;
  line-height: 1.4;
  color: var(--sdk-comp-iam-me-text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdkwork-iam-user-center-me__hero-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.sdkwork-iam-user-center-me__chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sdk-comp-iam-me-accent-soft-background);
  color: var(--sdk-comp-iam-me-accent);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.6;
}.sdkwork-iam-user-center-me__context-card {
  margin: 12px 12px 0;
  padding: 4px 16px;
  border: 1px solid var(--sdk-comp-iam-me-surface-border);
  border-radius: 16px;
  background: var(--sdk-comp-iam-me-surface-background);
}
.sdkwork-iam-user-center-me__context-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  font-size: 13px;
  line-height: 1.5;
}
.sdkwork-iam-user-center-me__context-row + .sdkwork-iam-user-center-me__context-row {
  border-top: 1px solid var(--sdk-comp-iam-me-divider);
}
.sdkwork-iam-user-center-me__context-label {
  margin: 0;
  color: var(--sdk-comp-iam-me-text-muted);
  flex: none;
}
.sdkwork-iam-user-center-me__context-value {
  margin: 0;
  color: var(--sdk-comp-iam-me-text-secondary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdkwork-iam-user-center-me__menu {
  margin: 12px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.sdkwork-iam-user-center-me__section {
  margin: 0;
  padding: 0;
  border: 1px solid var(--sdk-comp-iam-me-surface-border);
  border-radius: 16px;
  background: var(--sdk-comp-iam-me-surface-background);
  overflow: hidden;
}
.sdkwork-iam-user-center-me__section-title {
  padding: 12px 16px 2px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--sdk-comp-iam-me-text-muted);
}
.sdkwork-iam-user-center-me__item-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.sdkwork-iam-user-center-me__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 14px 16px;
  border: 0;
  border-top: 1px solid var(--sdk-comp-iam-me-divider);
  background: transparent;
  color: var(--sdk-comp-iam-me-text-primary);
  font: inherit;
  font-size: 15px;
  line-height: 1.4;
  text-align: left;
  cursor: pointer;
}
.sdkwork-iam-user-center-me__item:first-child {
  border-top: 0;
}
.sdkwork-iam-user-center-me__item:active {
  background: var(--sdk-comp-iam-me-control-background);
}
.sdkwork-iam-user-center-me__item:disabled {
  color: var(--sdk-comp-iam-me-text-muted);
  cursor: default;
}
.sdkwork-iam-user-center-me__item:focus-visible {
  outline: 2px solid var(--sdk-comp-iam-me-accent);
  outline-offset: -2px;
}
.sdkwork-iam-user-center-me__item--danger {
  color: var(--sdk-comp-iam-me-danger-foreground);
}
.sdkwork-iam-user-center-me__item-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sdkwork-iam-user-center-me__item-value {
  margin-left: auto;
  flex: none;
  max-width: 50%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--sdk-comp-iam-me-text-muted);
}
.sdkwork-iam-user-center-me__item-chevron {
  flex: none;
  color: var(--sdk-comp-iam-me-text-muted);
  font-size: 14px;
  line-height: 1;
}
.sdkwork-iam-user-center-me__actions {
  margin-top: auto;
  padding: 20px 12px 16px;
}
.sdkwork-iam-user-center-me__sign-out {
  width: 100%;
  padding: 13px 16px;
  border: 0;
  border-radius: 12px;
  background: var(--sdk-comp-iam-me-danger-soft-background);
  color: var(--sdk-comp-iam-me-danger-foreground);
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
  cursor: pointer;
}
.sdkwork-iam-user-center-me__sign-out:disabled {
  opacity: 0.6;
  cursor: default;
}
.sdkwork-iam-user-center-me__sign-out:focus-visible {
  outline: 2px solid var(--sdk-comp-iam-me-danger-foreground);
  outline-offset: 2px;
}
.sdkwork-iam-user-center-me__states {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  color: var(--sdk-comp-iam-me-text-muted);
  font-size: 14px;
  text-align: center;
}
.sdkwork-iam-user-center-me__states-message {
  margin: 0;
}
.sdkwork-iam-user-center-me__spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid var(--sdk-comp-iam-me-divider);
  border-top-color: var(--sdk-comp-iam-me-accent);
  animation: sdkwork-iam-user-center-me-spin 0.9s linear infinite;
}
.sdkwork-iam-user-center-me__retry {
  padding: 9px 22px;
  border: 0;
  border-radius: 999px;
  background: var(--sdk-comp-iam-me-accent);
  color: var(--sdk-comp-iam-me-accent-contrast);
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  cursor: pointer;
}
.sdkwork-iam-user-center-me__retry:focus-visible {
  outline: 2px solid var(--sdk-comp-iam-me-accent);
  outline-offset: 2px;
}
.sdkwork-iam-user-center-me__footer {
  padding: 4px 16px 16px;
  text-align: center;
  font-size: 11px;
  line-height: 1.5;
  color: var(--sdk-comp-iam-me-text-muted);
}
.sdkwork-iam-user-center-me__visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
@keyframes sdkwork-iam-user-center-me-spin {
  to {
    transform: rotate(360deg);
  }
}
@media (prefers-reduced-motion: reduce) {
  .sdkwork-iam-user-center-me__spinner {
    animation: none;
  }
}
`.trim();
