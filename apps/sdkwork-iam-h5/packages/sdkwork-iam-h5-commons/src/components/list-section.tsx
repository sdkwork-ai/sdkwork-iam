/**
 * A searchable, server-paginated list section.
 *
 * Every IAM list screen needs the same four states and the same failure
 * distinction: a failed **first** page is an error with a retry; a failed **next**
 * page is a notice above the rows already on screen; an empty *search result* is
 * not an empty dataset. Writing that per screen produced three subtly different
 * versions in the first two screens, so it lives here once.
 */

import type { ReactElement, ReactNode } from "react";

import type { SdkworkIamH5PagedList } from "../hooks/list-state";
import {
  SdkworkIamH5EmptyState,
  SdkworkIamH5ErrorState,
  SdkworkIamH5List,
  SdkworkIamH5ListFooter,
  SdkworkIamH5LoadingState,
} from "./states";
import { SdkworkIamH5Card } from "./layout";
import { SdkworkIamH5Notice, SdkworkIamH5SearchField } from "./primitives";
import type { SdkworkIamH5ListRowDescriptor } from "./states";

/** Localized copy the section renders. */
export interface SdkworkIamH5PagedListSectionMessages {
  readonly emptyDetail: string;
  readonly emptySearch: string;
  readonly emptyTitle: string;
  readonly errorMessage: string;
  readonly errorTitle: string;
  readonly loading: string;
  readonly loadMore: string;
  readonly loadMoreErrorMessage: string;
  readonly retry: string;
}

/** Props of {@link SdkworkIamH5PagedListSection}. */
export interface SdkworkIamH5PagedListSectionProps<TItem> {
  /** Builds one row from a record; the section owns layout, not domain columns. */
  buildRow: (item: TItem) => SdkworkIamH5ListRowDescriptor;
  /** Optional action offered from the empty state (e.g. "add"). */
  emptyAction?: { label: string; onClick: () => void };
  list: SdkworkIamH5PagedList<TItem>;
  messages: SdkworkIamH5PagedListSectionMessages;
  searchLabel: string;
  title: string;
}

/**
 * Render one list section of a screen.
 * @param props - list state, row builder and localized copy.
 * @returns the card containing search, rows and the load-more control.
 */
export function SdkworkIamH5PagedListSection<TItem>({
  buildRow,
  emptyAction,
  list,
  messages,
  searchLabel,
  title,
}: SdkworkIamH5PagedListSectionProps<TItem>): ReactElement {
  const firstLoadFailed = list.status === "error" && list.items.length === 0;
  const filtered = list.search.trim() !== "";
  const rows = list.items.map(buildRow);

  let body: ReactNode;
  if (firstLoadFailed && list.error) {
    body = (
      <SdkworkIamH5ErrorState
        error={{ message: `${messages.errorMessage} ${list.error.message}`.trim() }}
        onRetry={() => void list.refresh()}
        retryLabel={messages.retry}
        title={messages.errorTitle}
      />
    );
  } else if (list.status === "loading") {
    body = <SdkworkIamH5LoadingState label={messages.loading} />;
  } else if (rows.length === 0) {
    body = (
      <SdkworkIamH5EmptyState
        action={filtered ? undefined : emptyAction}
        description={filtered ? messages.emptySearch : messages.emptyDetail}
        title={filtered ? messages.emptySearch : messages.emptyTitle}
      />
    );
  } else {
    body = (
      <>
        {list.error ? (
          <SdkworkIamH5Notice tone="danger">
            {messages.loadMoreErrorMessage} {list.error.message}
          </SdkworkIamH5Notice>
        ) : null}
        <SdkworkIamH5List rows={rows} />
        <SdkworkIamH5ListFooter
          hasMore={list.hasMore}
          loadingMore={list.loadingMore}
          moreLabel={messages.loadMore}
          onLoadMore={() => void list.loadMore()}
        />
      </>
    );
  }

  return (
    <SdkworkIamH5Card title={title}>
      <SdkworkIamH5SearchField
        label={searchLabel}
        onChange={list.setSearch}
        placeholder={searchLabel}
        value={list.search}
      />
      {body}
    </SdkworkIamH5Card>
  );
}
