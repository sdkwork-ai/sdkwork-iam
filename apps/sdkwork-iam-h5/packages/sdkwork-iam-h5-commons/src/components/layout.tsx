/**
 * Screen chrome and content containers for IAM H5 screens.
 *
 * `SdkworkIamH5Screen` is the single page frame: it owns the kit root element,
 * injects the stylesheet once, renders the shared mobile title bar and the
 * scrolling content region. Capability screens therefore never assemble their own
 * header, which is what `APP_MOBILE_REACT_UI_SPEC.md` section 3 requires of shell
 * chrome.
 *
 * The title bar itself is implemented here rather than imported from
 * `@sdkwork/shell-mobile-react`: that package is not a declared dependency of this
 * client root, and adding it is a workspace-protocol change outside an IAM page
 * task. `SdkworkIamH5Screen` is the seam a later swap targets — its props are the
 * shared component's props (`title`, `onBack`, `right`, `backLabel`).
 */

import { useState, type ReactNode } from "react";

import { ensureSdkworkIamH5KitStyles } from "../theme/styles";

/** Props of {@link SdkworkIamH5Screen}. */
export interface SdkworkIamH5ScreenProps {
  /** Accessible label of the back control. */
  backLabel?: string;
  children: ReactNode;
  /** Removes the content padding, for a screen that draws full-bleed rows. */
  flush?: boolean;
  /** Back handler. Omitted when the screen is a root tab. */
  onBack?: () => void;
  /** Trailing actions in the title bar. */
  rightSlot?: ReactNode;
  /** Resolved title text (already localized by the caller). */
  title: string;
}

/** The IAM H5 page frame. */
export function SdkworkIamH5Screen({
  backLabel = "Back",
  children,
  flush = false,
  onBack,
  rightSlot,
  title,
}: SdkworkIamH5ScreenProps) {
  // Injecting during the first render (not in an effect) keeps the very first
  // paint styled; the helper is idempotent per document.
  useState(() => ensureSdkworkIamH5KitStyles());

  return (
    <div className="sdkwork-iam-h5">
      <header className="sdkwork-mobile-navbar">
        {onBack ? (
          <button
            aria-label={backLabel}
            className="sdkwork-mobile-navbar__back"
            onClick={onBack}
            type="button"
          >
            <span aria-hidden="true">‹</span>
          </button>
        ) : null}
        <h1 className="sdkwork-mobile-navbar__title">{title}</h1>
        {rightSlot ? <span className="sdkwork-mobile-navbar__right">{rightSlot}</span> : null}
      </header>
      <main className={flush ? "sdkwork-iam-h5__main sdkwork-iam-h5__main--flushed" : "sdkwork-iam-h5__main"}>
        {children}
      </main>
    </div>
  );
}

/** Props of {@link SdkworkIamH5Card}. */
export interface SdkworkIamH5CardProps {
  /** Short caption under the title. */
  caption?: string;
  children: ReactNode;
  /** Removes the body padding, for a card that contains a full-bleed list. */
  flush?: boolean;
  /** Heading text; omitted when the card is a bare container. */
  title?: string;
}

/** A titled content card. */
export function SdkworkIamH5Card({ caption, children, flush = false, title }: SdkworkIamH5CardProps) {
  return (
    <section className="sdkwork-iam-h5-card">
      {title ? (
        <header className="sdkwork-iam-h5-card__header">
          <h2 className="sdkwork-iam-h5-card__title">{title}</h2>
          {caption ? <p className="sdkwork-iam-h5-card__caption">{caption}</p> : null}
        </header>
      ) : null}
      <div className={flush ? "sdkwork-iam-h5-card__body sdkwork-iam-h5-card__body--flush" : "sdkwork-iam-h5-card__body"}>
        {children}
      </div>
    </section>
  );
}

/** One term/definition pair. */
export interface SdkworkIamH5KeyValueItem {
  label: string;
  /** Rendered as text when not provided, so a screen can pass a badge. */
  value: ReactNode;
}

/** Props of {@link SdkworkIamH5KeyValueList}. */
export interface SdkworkIamH5KeyValueListProps {
  items: readonly SdkworkIamH5KeyValueItem[];
}

/** A definition list of labelled values. */
export function SdkworkIamH5KeyValueList({ items }: SdkworkIamH5KeyValueListProps) {
  return (
    <dl className="sdkwork-iam-h5-kv">
      {items.map((item) => (
        <div key={item.label} style={{ display: "contents" }}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** One bottom-tab entry. */
export interface SdkworkIamH5TabItem {
  id: string;
  label: string;
  /** Path the tab navigates to. */
  path: string;
}

/** Props of {@link SdkworkIamH5TabBar}. */
export interface SdkworkIamH5TabBarProps {
  activePath: string;
  items: readonly SdkworkIamH5TabItem[];
  onNavigate: (path: string) => void;
}

/**
 * The bottom tab bar.
 *
 * Rendering is a `<nav>` of buttons rather than links: the shell owns routing, and
 * a button keeps the bar working when the host mounts the surface without a
 * router.
 */
export function SdkworkIamH5TabBar({ activePath, items, onNavigate }: SdkworkIamH5TabBarProps) {
  return (
    <nav aria-label="Primary" className="sdkwork-iam-h5-tabbar">
      {items.map((item) => {
        const active = activePath === item.path;
        return (
          <button
            aria-current={active ? "page" : undefined}
            className="sdkwork-iam-h5-tabbar__item"
            key={item.id}
            onClick={() => onNavigate(item.path)}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
