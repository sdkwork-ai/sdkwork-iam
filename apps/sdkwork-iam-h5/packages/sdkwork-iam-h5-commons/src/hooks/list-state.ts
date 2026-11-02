/**
 * List/async state hooks for IAM H5 screens.
 *
 * Every IAM list is server-paginated (`PAGINATION_SPEC.md`: one page at a time,
 * `page_size` default 20, no client-side slicing of a full download). These hooks
 * are the only place the kit sequences that: they own the request state machine,
 * keep a failed page from erasing the rows already on screen, and expose
 * `loadMore` so a screen renders a "load more" affordance instead of a spinner
 * that replaces the list.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { describeSdkworkIamH5Error, type SdkworkIamH5ErrorInfo } from "../errors";

/** Lifecycle of one screen resource. */
export type SdkworkIamH5LoadStatus = "idle" | "loading" | "ready" | "error";

/** One page of a server-side list. */
export interface SdkworkIamH5Page<TItem> {
  readonly items: readonly TItem[];
  /** Whether the server reported another page. */
  readonly hasMore?: boolean;
  /** Cursor for the next page when the contract uses cursor pagination. */
  readonly nextCursor?: string;
  /** Zero-based page index the server answered. */
  readonly page?: number;
  /** Items per page the server honoured. */
  readonly pageSize?: number;
}

/** Query accepted by a page fetcher. */
export interface SdkworkIamH5ListQuery {
  readonly cursor?: string;
  readonly page?: number;
  readonly page_size?: number;
  readonly q?: string;
}

/** Fetches one page for a list screen. */
export type SdkworkIamH5PageFetcher<TItem> = (
  query: SdkworkIamH5ListQuery,
) => Promise<SdkworkIamH5Page<TItem>>;

/** Default page size the kit requests; matches `PAGINATION_SPEC.md`. */
export const SDKWORK_IAM_H5_DEFAULT_PAGE_SIZE = 20;

/**
 * Read a generated-SDK page envelope into the kit's shape.
 *
 * The generated SDKs unwrap `data`, so a page arrives as `{ items, pageInfo }`;
 * older service ports return a bare array. Both are accepted so a capability can
 * adopt the hook before every endpoint is migrated.
 * @param value - whatever the port resolved.
 * @returns the normalized page.
 */
export function readSdkworkIamH5Page<TItem>(value: unknown): SdkworkIamH5Page<TItem> {
  if (Array.isArray(value)) {
    return { items: value as readonly TItem[] };
  }
  if (value !== null && typeof value === "object") {
    const record = value as {
      items?: unknown;
      pageInfo?: { hasMore?: unknown; nextCursor?: unknown; page?: unknown; pageSize?: unknown; total?: unknown };
      total?: unknown;
    };
    const items = Array.isArray(record.items) ? (record.items as readonly TItem[]) : [];
    const pageInfo = record.pageInfo;
    const pageSize = typeof pageInfo?.pageSize === "number" ? pageInfo.pageSize : undefined;
    const page = typeof pageInfo?.page === "number" ? pageInfo.page : undefined;
    const nextCursor = typeof pageInfo?.nextCursor === "string" ? pageInfo.nextCursor : undefined;
    const total = typeof pageInfo?.total === "number" ? pageInfo.total : typeof record.total === "number" ? record.total : undefined;
    const explicitHasMore = typeof pageInfo?.hasMore === "boolean" ? pageInfo.hasMore : undefined;
    // Without an explicit flag the only honest inference is "a full page implies
    // there may be another"; a short page ends the walk. Guessing `true` forever
    // makes the load-more button spin against an empty page.
    const hasMore =
      explicitHasMore ??
      (nextCursor !== undefined
        ? true
        : page !== undefined && pageSize !== undefined
          ? (page + 1) * pageSize < (total ?? Number.POSITIVE_INFINITY)
          : pageSize !== undefined && items.length >= pageSize);
    return {
      ...(page !== undefined ? { page } : {}),
      ...(pageSize !== undefined ? { pageSize } : {}),
      ...(nextCursor !== undefined ? { nextCursor } : {}),
      hasMore,
      items,
    };
  }
  return { items: [] };
}

/** Value returned by {@link useSdkworkIamH5PagedList}. */
export interface SdkworkIamH5PagedList<TItem> {
  /** Rows loaded so far, in server order. */
  readonly items: readonly TItem[];
  /** `loading` only covers the first page; later pages set `loadingMore`. */
  readonly status: SdkworkIamH5LoadStatus;
  readonly loadingMore: boolean;
  readonly error: SdkworkIamH5ErrorInfo | undefined;
  readonly hasMore: boolean;
  /** Current server-side search term. */
  readonly search: string;
  /** Replace the search term and reload from the first page. */
  readonly setSearch: (value: string) => void;
  /** Reload from the first page, keeping the search term. */
  readonly refresh: () => Promise<void>;
  /** Append the next page. */
  readonly loadMore: () => Promise<void>;
}

/**
 * Drive one server-paginated list.
 * @param fetcher - resolves one page; must be stable across renders.
 * @param options - page size and initial search term.
 * @returns list state plus the actions a screen binds to.
 */
export function useSdkworkIamH5PagedList<TItem>(
  fetcher: SdkworkIamH5PageFetcher<TItem>,
  options: { pageSize?: number; initialSearch?: string } = {},
): SdkworkIamH5PagedList<TItem> {
  const pageSize = options.pageSize ?? SDKWORK_IAM_H5_DEFAULT_PAGE_SIZE;
  const [items, setItems] = useState<readonly TItem[]>([]);
  const [status, setStatus] = useState<SdkworkIamH5LoadStatus>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<SdkworkIamH5ErrorInfo | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearchState] = useState(options.initialSearch ?? "");
  const cursorRef = useRef<string | undefined>(undefined);
  const pageRef = useRef(0);
  // Guards against a stale response overwriting a newer one: a search keystroke
  // can start a second load while the first is in flight, and the older answer
  // must not win.
  const requestRef = useRef(0);
  // The fetcher is read through a ref so an inline arrow at the call site cannot
  // retrigger the mount effect: the hook is stable by contract, and a caller that
  // rebuilds its fetcher every render must not turn one screen into a refetch
  // loop.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const runFirstPage = useCallback(
    async (term: string) => {
      const request = requestRef.current + 1;
      requestRef.current = request;
      setStatus("loading");
      setError(undefined);
      try {
        const page = await fetcherRef.current({ page: 0, page_size: pageSize, ...(term ? { q: term } : {}) });
        if (requestRef.current !== request) return;
        pageRef.current = 0;
        cursorRef.current = page.nextCursor;
        setItems(page.items);
        setHasMore(page.hasMore ?? false);
        setStatus("ready");
      } catch (loadError) {
        if (requestRef.current !== request) return;
        setStatus("error");
        setError(describeSdkworkIamH5Error(loadError, "Unable to load this list."));
      }
    },
    [pageSize],
  );

  const refresh = useCallback(async () => {
    await runFirstPage(search);
  }, [runFirstPage, search]);

  const loadMore = useCallback(async () => {
    if (loadingMore || status === "loading" || !hasMore) return;
    const request = requestRef.current;
    setLoadingMore(true);
    setError(undefined);
    try {
      const nextPage = pageRef.current + 1;
      const page = await fetcherRef.current({
        page: nextPage,
        page_size: pageSize,
        ...(search ? { q: search } : {}),
        ...(cursorRef.current ? { cursor: cursorRef.current } : {}),
      });
      if (requestRef.current !== request) return;
      pageRef.current = nextPage;
      cursorRef.current = page.nextCursor ?? cursorRef.current;
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore ?? false);
    } catch (loadError) {
      if (requestRef.current !== request) return;
      // Keep the rows already on screen: a failed page is not an empty list.
      setError(describeSdkworkIamH5Error(loadError, "Unable to load more."));
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, pageSize, search, status]);

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      void runFirstPage(value);
    },
    [runFirstPage],
  );

  useEffect(() => {
    void runFirstPage(options.initialSearch ?? "");
    // Intentionally keyed on the fetcher identity only: re-running on every
    // `options` object would refetch on each parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runFirstPage]);

  return useMemo(
    () => ({ error, hasMore, items, loadMore, loadingMore, refresh, search, setSearch, status }),
    [error, hasMore, items, loadMore, loadingMore, refresh, search, setSearch, status],
  );
}

/** Value returned by {@link useSdkworkIamH5Resource}. */
export interface SdkworkIamH5Resource<TValue> {
  readonly data: TValue | undefined;
  readonly status: SdkworkIamH5LoadStatus;
  readonly error: SdkworkIamH5ErrorInfo | undefined;
  readonly reload: () => Promise<void>;
}

/**
 * Drive one record read (detail, profile, settings).
 * @param load - resolves the value; must be stable across renders.
 * @returns resource state plus `reload`.
 */
export function useSdkworkIamH5Resource<TValue>(
  load: () => Promise<TValue>,
): SdkworkIamH5Resource<TValue> {
  const [data, setData] = useState<TValue | undefined>(undefined);
  const [status, setStatus] = useState<SdkworkIamH5LoadStatus>("idle");
  const [error, setError] = useState<SdkworkIamH5ErrorInfo | undefined>();
  const requestRef = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  const reload = useCallback(async () => {
    const request = requestRef.current + 1;
    requestRef.current = request;
    setStatus("loading");
    setError(undefined);
    try {
      const value = await loadRef.current();
      if (requestRef.current !== request) return;
      setData(value);
      setStatus("ready");
    } catch (loadError) {
      if (requestRef.current !== request) return;
      setStatus("error");
      setError(describeSdkworkIamH5Error(loadError, "Unable to load this record."));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return useMemo(() => ({ data, error, reload, status }), [data, error, reload, status]);
}
