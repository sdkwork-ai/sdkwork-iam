import type { ComponentType } from "react";

import type {
  SdkworkIamH5UserCenterMeActionsSlotProps,
  SdkworkIamH5UserCenterMeContextCardSlotProps,
  SdkworkIamH5UserCenterMeFooterSlotProps,
  SdkworkIamH5UserCenterMeHeaderSlotProps,
  SdkworkIamH5UserCenterMeHeroSlotProps,
  SdkworkIamH5UserCenterMeMenuItemSlotProps,
  SdkworkIamH5UserCenterMeMenuSlotProps,
  SdkworkIamH5UserCenterMeSlotContainerProps,
  SdkworkIamH5UserCenterMeStatesSlotProps,
} from "../../appearance/user-center-me-appearance";
import {
  mergeSdkworkIamH5UserCenterMeClassNames,
} from "../../appearance/user-center-me-appearance";

/**
 * Default slot renderers for the "Me" page. Structure only: every color and
 * surface resolves through `--sdk-comp-iam-me-*` component tokens, so these
 * renderers follow the host theme without any local palette.
 */

export function SdkworkIamH5UserCenterMeDefaultPage({
  children,
  className,
  style,
}: SdkworkIamH5UserCenterMeSlotContainerProps) {
  return (
    <div className={className} style={style}>
      {children}
    </div>
  );
}

export function SdkworkIamH5UserCenterMeDefaultHeader({
  className,
  style,
  title,
}: SdkworkIamH5UserCenterMeHeaderSlotProps) {
  return (
    <header
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__header", className)}
      style={style}
    >
      <h1 className="sdkwork-iam-user-center-me__header-title">{title}</h1>
    </header>
  );
}

export function SdkworkIamH5UserCenterMeDefaultHero({
  avatar,
  className,
  contextChips,
  displayName,
  style,
  username,
}: SdkworkIamH5UserCenterMeHeroSlotProps) {
  return (
    <section
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__hero", className)}
      style={style}
    >
      {avatar}
      <div className="sdkwork-iam-user-center-me__hero-body">
        <p className="sdkwork-iam-user-center-me__hero-name">{displayName}</p>
        {username ? (
          <p className="sdkwork-iam-user-center-me__hero-username">{username}</p>
        ) : null}
        {contextChips ? (
          <div className="sdkwork-iam-user-center-me__hero-chips">{contextChips}</div>
        ) : null}
      </div>
    </section>
  );
}

export function SdkworkIamH5UserCenterMeDefaultContextCard({
  className,
  rows,
  style,
}: SdkworkIamH5UserCenterMeContextCardSlotProps) {
  return (
    <dl
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__context-card", className)}
      style={style}
    >
      {rows.map((row) => (
        <div className="sdkwork-iam-user-center-me__context-row" key={row.id}>
          <dt className="sdkwork-iam-user-center-me__context-label">{row.label}</dt>
          <dd className="sdkwork-iam-user-center-me__context-value">{row.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SdkworkIamH5UserCenterMeDefaultMenuItem({
  className,
  danger,
  disabled,
  label,
  onSelect,
  style,
  value,
}: SdkworkIamH5UserCenterMeMenuItemSlotProps) {
  return (
    <button
      type="button"
      className={mergeSdkworkIamH5UserCenterMeClassNames(
        "sdkwork-iam-user-center-me__item",
        danger ? "sdkwork-iam-user-center-me__item--danger" : undefined,
        className,
      )}
      style={style}
      onClick={onSelect}
      disabled={disabled}
    >
      <span className="sdkwork-iam-user-center-me__item-label">{label}</span>
      {value !== undefined && value !== null && value !== "" ? (
        <span className="sdkwork-iam-user-center-me__item-value">{value}</span>
      ) : null}
      <span className="sdkwork-iam-user-center-me__item-chevron" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function SdkworkIamH5UserCenterMeDefaultMenu({
  className,
  renderItem,
  sections,
  style,
}: SdkworkIamH5UserCenterMeMenuSlotProps & {
  /** Slot used to render every row; resolved by the screen. */
  renderItem: ComponentType<SdkworkIamH5UserCenterMeMenuItemSlotProps>;
}) {
  return (
    <nav
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__menu", className)}
      style={style}
    >
      {sections.map((section) => (
        <section className="sdkwork-iam-user-center-me__section" key={section.id}>
          {section.title !== undefined && section.title !== null && section.title !== "" ? (
            <h2 className="sdkwork-iam-user-center-me__section-title">{section.title}</h2>
          ) : null}
          <ul className="sdkwork-iam-user-center-me__item-list">
            {section.items.map((item) => {
              const ItemSlot = renderItem;
              return (
                <li key={item.id}>
                  <ItemSlot {...item} />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

export function SdkworkIamH5UserCenterMeDefaultActions({
  className,
  onSignOut,
  signOutDisabled,
  signOutLabel,
  signingOut,
  style,
}: SdkworkIamH5UserCenterMeActionsSlotProps) {
  return (
    <div
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__actions", className)}
      style={style}
    >
      <button
        type="button"
        className="sdkwork-iam-user-center-me__sign-out"
        onClick={onSignOut}
        disabled={signingOut || signOutDisabled === true}
      >
        {signOutLabel}
      </button>
    </div>
  );
}

export function SdkworkIamH5UserCenterMeDefaultStates({
  className,
  errorLabel,
  loadingLabel,
  onRetry,
  retryLabel,
  status,
  style,
}: SdkworkIamH5UserCenterMeStatesSlotProps) {
  if (status === "loading") {
    return (
      <div
        className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__states", className)}
        role="status"
        aria-live="polite"
        style={style}
      >
        <div className="sdkwork-iam-user-center-me__spinner" aria-hidden="true" />
        <span className="sdkwork-iam-user-center-me__visually-hidden">{loadingLabel}</span>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div
        className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__states", className)}
        style={style}
      >
        <p className="sdkwork-iam-user-center-me__states-message" role="alert">
          {errorLabel}
        </p>
        {onRetry ? (
          <button type="button" className="sdkwork-iam-user-center-me__retry" onClick={onRetry}>
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

export function SdkworkIamH5UserCenterMeDefaultFooter({
  className,
  note,
  style,
}: SdkworkIamH5UserCenterMeFooterSlotProps) {
  if (note === undefined || note === null || note === "") {
    return null;
  }
  return (
    <footer
      className={mergeSdkworkIamH5UserCenterMeClassNames("sdkwork-iam-user-center-me__footer", className)}
      style={style}
    >
      {note}
    </footer>
  );
}

/** Avatar well: the profile image when present, initials otherwise. */
export function SdkworkIamH5UserCenterMeAvatar({
  className,
  displayName,
  style,
  url,
}: {
  className?: string;
  displayName: string;
  style?: SdkworkIamH5UserCenterMeSlotContainerProps["style"];
  url?: string;
}) {
  const classes = mergeSdkworkIamH5UserCenterMeClassNames(
    "sdkwork-iam-user-center-me__hero-avatar",
    className,
  );
  if (url) {
    return <img className={classes} style={style} src={url} alt="" />;
  }
  return (
    <span className={classes} style={style} aria-hidden="true">
      {readDisplayNameInitials(displayName)}
    </span>
  );
}

function readDisplayNameInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return Array.from(parts[0]).slice(0, 1).join("").toUpperCase();
  }
  const first = Array.from(parts[0])[0] ?? "";
  const second = Array.from(parts[1])[0] ?? "";
  return `${first}${second}`.toUpperCase();
}
