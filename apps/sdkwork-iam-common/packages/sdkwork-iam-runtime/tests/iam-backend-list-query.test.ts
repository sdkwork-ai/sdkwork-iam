import { describe, expect, it } from "vitest";

import { createClient } from "@sdkwork/iam-backend-sdk";

/**
 * Why the list facades must hand the backend SDK `pageSize` rather than
 * `page_size`.
 *
 * Each generated `list` spells its parameters out inline and emits the wire query
 * name `page_size` from `params.pageSize`; `buildQueryString` only serialises that
 * inline list, so any other key in the params object is never sent. A caller
 * passing the wire spelling therefore loses the page size silently — the request
 * still returns 200 and the server falls back to its own default page.
 *
 * Pinned here, in the package that constructs the generated clients, so the
 * facade's translation has executable evidence rather than only a comment.
 */
function recordingFetch(): { readonly urls: string[]; readonly fetch: typeof globalThis.fetch } {
  const urls: string[] = [];
  return {
    urls,
    fetch: (async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      urls.push(url);
      return new Response(
        JSON.stringify({ code: 0, data: { items: [], total: "0", pageInfo: { hasMore: false } } }),
        { headers: { "content-type": "application/json" }, status: 200 },
      );
    }) as typeof globalThis.fetch,
  };
}

describe("generated IAM backend SDK list query parameters", () => {
  it("sends page_size only when it was passed as pageSize", async () => {
    const recorder = recordingFetch();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = recorder.fetch;
    try {
      const client = createClient({
        accessToken: "wire-probe-token",
        authMode: "dual-token",
        baseUrl: "http://127.0.0.1:9/",
        platform: "pc",
      } as never);

      await client.iam.providerAccounts.list({ page_size: 5, mine: true } as never);
      await client.iam.providerAccounts.list({ pageSize: 7, mine: true });

      const [wireSpelling, sdkSpelling] = recorder.urls;
      // Both calls reach the endpoint with the boolean filter intact, so the two
      // differ in nothing but the page size.
      expect(wireSpelling).toContain("/iam/provider_accounts");
      expect(wireSpelling).toContain("mine=true");
      expect(sdkSpelling).toContain("/iam/provider_accounts");

      expect(wireSpelling).not.toContain("page_size");
      expect(sdkSpelling).toContain("page_size=7");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
