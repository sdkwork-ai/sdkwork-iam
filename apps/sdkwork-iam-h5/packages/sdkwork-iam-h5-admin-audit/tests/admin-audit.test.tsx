import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SdkworkIamH5I18nProvider } from "@sdkwork/iam-h5-commons";

import {
  createSdkworkIamH5AdminAuditController,
  IAM_H5_ADMIN_AUDIT_I18N_CATALOG,
  SdkworkIamH5AdminAuditScreen,
  type SdkworkIamH5AdminAuditServicePort,
} from "../src/index";

/**
 * The audit trail is the operator's only record of what happened, so the cases pin the
 * two things a ticket depends on: the actor/action pair leads the row, and an event
 * without an identity is dropped rather than shown as an untraceable line.
 */

function createServiceMock(items: readonly unknown[] = [
  { action: "update", actor_id: "user-1", audit_event_id: "evt-1", created_at: "2026-01-01T00:00:00Z", resource: "role:tenant-admin" },
  { action: "create", auditEventId: "evt-2", occurredAt: "2026-01-02T00:00:00Z", userId: "user-2" },
  { action: "orphan" },
]) {
  const queries: Record<string, unknown>[] = [];
  const port = {
    iam: {
      auditEvents: {
        list: async (params?: Record<string, unknown>) => {
          queries.push(params ?? {});
          return { items, pageInfo: { hasMore: false } };
        },
      },
    },
  } as unknown as SdkworkIamH5AdminAuditServicePort;
  return { port, queries };
}

function renderScreen(port: SdkworkIamH5AdminAuditServicePort) {
  const controller = createSdkworkIamH5AdminAuditController(port);
  return render(
    <SdkworkIamH5I18nProvider catalogs={[IAM_H5_ADMIN_AUDIT_I18N_CATALOG]} locale="en-US">
      <SdkworkIamH5AdminAuditScreen controller={controller} />
    </SdkworkIamH5I18nProvider>,
  );
}

describe("admin audit trail", () => {
  it("leads each row with the action and the actor", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("update · user-1")).toBeTruthy();
    expect(await screen.findByText("create · user-2")).toBeTruthy();
  });

  it("shows the resource and the time so a search can be narrowed", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("role:tenant-admin · 2026-01-01T00:00:00Z")).toBeTruthy();
    // An event with no resource still shows its time rather than an empty second line.
    expect(await screen.findByText("2026-01-02T00:00:00Z")).toBeTruthy();
  });

  it("drops an event without an identity", async () => {
    const { port } = createServiceMock();
    renderScreen(port);

    expect(await screen.findByText("update · user-1")).toBeTruthy();
    expect(screen.queryByText("orphan")).toBeNull();
  });

  it("shows the empty state", async () => {
    const { port } = createServiceMock([]);
    renderScreen(port);

    expect(await screen.findByText("No audit event was recorded yet.")).toBeTruthy();
  });
});
