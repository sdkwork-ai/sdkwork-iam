import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkOrganizationSelectionDialog } from "../src/components/organization-selection-dialog.tsx";
import { SdkworkQrLoginPanel } from "../src/components/qr-login-panel.tsx";
import {
  SDKWORK_AUTH_ICON_FIELD_FRAME_CLASS_NAME,
  SDKWORK_AUTH_PASSWORD_FRAME_CLASS_NAME,
} from "../src/components/auth/form-control-styles.ts";
import { SDKWORK_AUTH_SURFACE_THEME_STYLE } from "../src/auth-appearance.ts";
import type { SdkworkAuthQrPanelState } from "../src/auth-config.ts";
import {
  SDKWORK_AUTH_I18N_CATALOG,
  type SdkworkAuthOrganizationSelectionChallenge,
} from "../src";

const challenge: SdkworkAuthOrganizationSelectionChallenge = {
  challengeType: "ORGANIZATION_SELECTION",
  continuationToken: "continuation-token",
  organizations: [
    {
      displayName: "Primary Workspace",
      organizationId: "org-1",
      tenantId: "100001",
    },
    {
      displayName: "Secondary Workspace",
      organizationId: "org-2",
      tenantId: "100001",
    },
  ],
};

const copy = {
  cancel: "Cancel",
  description: "Choose the workspace to use for this session.",
  errorTitle: "Selection failed",
  personalAccount: "Personal account",
  personalDescription: "Continue without an organization",
  selecting: "Continuing...",
  tenantLabel: "Tenant",
  title: "Choose login context",
};

describe("auth keyboard focus", () => {
  it("uses token-based focus-visible outlines, including framed fields", () => {
    expect(SDKWORK_AUTH_SURFACE_THEME_STYLE).toContain(":focus-visible");
    expect(SDKWORK_AUTH_SURFACE_THEME_STYLE).toContain("var(--sdk-color-brand-primary, #dc2626)");
    expect(SDKWORK_AUTH_SURFACE_THEME_STYLE).toContain(".sdkwork-auth-field-frame:focus-within");
    expect(SDKWORK_AUTH_ICON_FIELD_FRAME_CLASS_NAME).toContain("sdkwork-auth-field-frame");
    expect(SDKWORK_AUTH_PASSWORD_FRAME_CLASS_NAME).toContain("sdkwork-auth-field-frame");
  });
});

describe("organization selection accessibility", () => {
  it("names the dialog, focuses a choice without selecting it, and traps keyboard focus", () => {
    const onCancel = vi.fn();
    const onSelectOrganization = vi.fn();
    render(
      <SdkworkOrganizationSelectionDialog
        challenge={challenge}
        copy={copy}
        onCancel={onCancel}
        onSelectOrganization={onSelectOrganization}
      />,
    );

    const dialog = screen.getByRole("dialog", { name: copy.title });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription(copy.description);
    const firstChoice = screen.getByRole("button", { name: /primary workspace/i });
    const cancel = screen.getByRole("button", { name: copy.cancel });
    expect(firstChoice).toHaveFocus();
    expect(onSelectOrganization).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(firstChoice, { key: "Tab", shiftKey: true });
    expect(cancel).toHaveFocus();
    fireEvent.keyDown(cancel, { key: "Tab" });
    expect(firstChoice).toHaveFocus();
    fireEvent.keyDown(firstChoice, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("restores focus and body scrolling when dismissed", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)} type="button">Open chooser</button>
          {open ? (
            <SdkworkOrganizationSelectionDialog
              challenge={challenge}
              copy={copy}
              onCancel={() => setOpen(false)}
              onSelectOrganization={vi.fn()}
            />
          ) : null}
        </>
      );
    }

    document.body.style.overflow = "auto";
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open chooser" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("does not cancel with Escape while a selection is in progress", () => {
    const onCancel = vi.fn();
    render(
      <SdkworkOrganizationSelectionDialog
        challenge={challenge}
        copy={copy}
        onCancel={onCancel}
        onSelectOrganization={vi.fn()}
        selectedOrganizationId="org-1"
      />,
    );

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(copy.selecting);
  });
});

function qrPanel(qrState: SdkworkAuthQrPanelState, qrErrorMessage?: string) {
  return (
    <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale="en-US">
      <SdkworkQrLoginPanel
        onRefresh={vi.fn()}
        panelDescription="Scan with your mobile app"
        panelTitle="QR sign in"
        qrCode={null}
        qrErrorMessage={qrErrorMessage}
        qrImageSrc="data:image/png;base64,"
        qrState={qrState}
      />
    </SdkworkI18nProvider>
  );
}

describe("QR login announcements", () => {
  it("keeps a polite status region mounted and announces scan progress", () => {
    const { rerender } = render(qrPanel("pending"));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();

    rerender(qrPanel("scanned"));
    expect(screen.getByRole("status")).toHaveTextContent(/scanned/i);
    expect(screen.getByRole("status")).toHaveTextContent(/complete login/i);
  });

  it("uses an assertive alert for expired or failed QR states", () => {
    const { rerender } = render(qrPanel("pending"));
    rerender(qrPanel("error", "The QR service is unavailable."));
    expect(screen.getByRole("alert")).toHaveTextContent(/unavailable/i);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
