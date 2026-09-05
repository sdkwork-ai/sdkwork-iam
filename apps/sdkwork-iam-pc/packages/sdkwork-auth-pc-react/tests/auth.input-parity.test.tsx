import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import {
  SDKWORK_AUTH_I18N_CATALOG,
  SdkworkAccountPasswordLoginForm,
  SdkworkPasswordField,
} from "../src";

/**
 * Regression guard for the account/email vs password field mismatch:
 * every auth text input must carry the same borderless inline style as the
 * password input, so no host/`Input`-base border or panel background can
 * leak through (the "white border" bug).
 */
function assertBorderless(input: HTMLElement, label: string) {
  const style = getComputedStyle(input);
  expect(style.borderWidth, `${label} border-width`).toBe("0px");
  expect(style.borderStyle, `${label} border-style`).toBe("solid");
  expect(
    ["transparent", "rgba(0, 0, 0, 0)"],
    `${label} border-color`,
  ).toContain(style.borderColor);
  expect(
    ["transparent", "rgba(0, 0, 0, 0)"],
    `${label} background`,
  ).toContain(style.backgroundColor);
  expect(style.boxShadow, `${label} box-shadow`).toBe("none");
  expect(style.outline, `${label} outline`).toBe("none");
  expect(style.height, `${label} height parity`).toBe("2.75rem");
}

describe("auth input parity", () => {
  it("renders account input with the same borderless inline style as the password input", () => {
    const onSubmit = vi.fn(async () => {});

    render(
      <SdkworkI18nProvider catalogs={[SDKWORK_AUTH_I18N_CATALOG]} locale="en-US">
        <SdkworkAccountPasswordLoginForm
          onSubmit={onSubmit}
        />
        <SdkworkPasswordField
          id="parity-password"
          label="Parity Password"
          onChange={() => {}}
          value=""
        />
      </SdkworkI18nProvider>,
    );

    const account = document.getElementById(
      "sdkwork-auth-account",
    ) as HTMLInputElement;
    expect(account).not.toBeNull();
    assertBorderless(account, "account input");

    const password = document.getElementById(
      "parity-password",
    ) as HTMLInputElement;
    expect(password).not.toBeNull();
    assertBorderless(password, "password input");

    const accountFrame = account.parentElement;
    expect(accountFrame).not.toBeNull();
    const accountFrameStyle = getComputedStyle(accountFrame!);
    expect(accountFrameStyle.borderWidth).toBe("0px");
    expect(accountFrameStyle.overflow).toBe("hidden");
    expect(accountFrameStyle.borderRadius).toBe("0.5rem");
  });
});
