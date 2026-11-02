/**
 * Loading, empty, error and list rendering for IAM H5 screens.
 *
 * Each state is a distinct component so a screen has to name which one it shows.
 * That matters for the two states products get wrong: a failed **first** page is
 * an error with a retry, while a failed **next** page is a notice above the rows
 * already loaded (`useSdkworkIamH5PagedList` keeps them), and an empty filter
 * result is not the same screen as an empty dataset.
 */

import type { ReactNode } from "react";

import type { SdkworkIamH5ErrorInfo } from "../errors";
import { SdkworkIamH5Button } from "./primitives";

/** Props of {@link SdkworkIamH5LoadingState}. */
export interface SdkworkIamH5LoadingStateProps {
  /** What is being loaded, announced to assistive technology. */
  label?: string;
}

/** The first-load spinner. */
export function SdkworkIamH5LoadingState({ label = "Loading" }: SdkworkIamH5LoadingStateProps) {
  return (
    <div aria-busy="true" aria-live="polite" className="sdkwork-iam-h5-state" role="status">
      <span aria-hidden="true" className="sdkwork-iam-h5-spinner" />
      <span className="sdkwork-iam-h5-sr-only">{label}</span>
    </div>
  );
}

/** Props of {@link SdkworkIamH5EmptyState}. */
export interface SdkworkIamH5EmptyStateProps {
  /** Optional action offered from the empty state. */
  action?: { label: string; onClick: () => void };
  description?: string;
  title: string;
}

/** The no-records state. */
export function SdkworkIamH5EmptyState({ action, description, title }: SdkworkIamH5EmptyStateProps) {
  return (
    <div className="sdkwork-iam-h5-state">
      <p className="sdkwork-iam-h5-state__title">{title}</p>
      {description ? <p className="sdkwork-iam-h5-state__detail">{description}</p> : null}
      {action ? (
        <SdkworkIamH5Button onClick={action.onClick} variant="secondary">
          {action.label}
        </SdkworkIamH5Button>
      ) : null}
    </div>
  );
}

/** Props of {@link SdkworkIamH5ErrorState}. */
export interface SdkworkIamH5ErrorStateProps {
  error: SdkworkIamH5ErrorInfo;
  /** Retry handler; rendered only when supplied. */
  onRetry?: () => void;
  /** Localized label for the retry control. */
  retryLabel?: string;
  /** Localized heading. */
  title?: string;
}

/** The failed-load state: message, optional code, optional retry. */
export function SdkworkIamH5ErrorState({
  error,
  onRetry,
  retryLabel = "Retry",
  title = "Something went wrong",
}: SdkworkIamH5ErrorStateProps) {
  return (
    <div className="sdkwork-iam-h5-state sdkwork-iam-h5-state--error" role="alert">
      <p className="sdkwork-iam-h5-state__title">{title}</p>
      <p className="sdkwork-iam-h5-state__detail">{error.message}</p>
      {error.code ? (
        <p className="sdkwork-iam-h5-state__detail">
          <code>{error.code}</code>
        </p>
      ) : null}
      {onRetry ? (
        <SdkworkIamH5Button onClick={onRetry} variant="secondary">
          {retryLabel}
        </SdkworkIamH5Button>
      ) : null}
    </div>
  );
}

/** One list row. */
export interface SdkworkIamH5ListRowDescriptor {
  /** Optional trailing content such as a status badge. */
  accessory?: ReactNode;
  /** Stable key; also the accessibility identity of the row. */
  id: string;
  /** Invoked when the row opens a detail screen. */
  onPress?: () => void;
  /** Primary line. */
  primary: ReactNode;
  /** Secondary line: ids, timestamps, metadata. */
  secondary?: ReactNode;
}

/** Props of {@link SdkworkIamH5List}. */
export interface SdkworkIamH5ListProps {
  rows: readonly SdkworkIamH5ListRowDescriptor[];
}

/**
 * A row list.
 *
 * Rows with `onPress` render as buttons so they are reachable by keyboard and
 * announced as actionable; rows without it stay static list items.
 */
export function SdkworkIamH5List({ rows }: SdkworkIamH5ListProps) {
  return (
    <ul className="sdkwork-iam-h5-list">
      {rows.map((row) => (
        <li key={row.id}>
          {row.onPress ? (
            <button
              className="sdkwork-iam-h5-list__row sdkwork-iam-h5-list__row--interactive"
              onClick={row.onPress}
              type="button"
            >
              <span className="sdkwork-iam-h5-list__primary">{row.primary}</span>
              {row.secondary ? (
                <span className="sdkwork-iam-h5-list__secondary">{row.secondary}</span>
              ) : null}
              {row.accessory}
            </button>
          ) : (
            <div className="sdkwork-iam-h5-list__row">
              <span className="sdkwork-iam-h5-list__primary">{row.primary}</span>
              {row.secondary ? (
                <span className="sdkwork-iam-h5-list__secondary">{row.secondary}</span>
              ) : null}
              {row.accessory}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Props of {@link SdkworkIamH5ListFooter}. */
export interface SdkworkIamH5ListFooterProps {
  hasMore: boolean;
  loadingMore: boolean;
  /** Localized "load more" label. */
  moreLabel?: string;
  onLoadMore: () => void;
}

/**
 * The list's trailing control.
 *
 * A failed *next* page must not look like the end of the list, so the control
 * stays enabled after an error and the caller renders the notice separately.
 */
export function SdkworkIamH5ListFooter({
  hasMore,
  loadingMore,
  moreLabel = "Load more",
  onLoadMore,
}: SdkworkIamH5ListFooterProps) {
  if (!hasMore) return null;
  return (
    <div style={{ padding: "var(--sdkwork-iam-h5-space-md)" }}>
      <SdkworkIamH5Button
        block
        disabled={loadingMore}
        onClick={onLoadMore}
        variant="secondary"
      >
        {loadingMore ? "…" : moreLabel}
      </SdkworkIamH5Button>
    </div>
  );
}
