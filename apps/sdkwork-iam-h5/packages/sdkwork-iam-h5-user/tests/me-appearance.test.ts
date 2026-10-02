import { describe, expect, it } from "vitest";

import {
  mergeSdkworkIamH5UserCenterMeClassNames,
  mergeSdkworkIamH5UserCenterMeStyles,
  resolveSdkworkIamH5UserCenterMeAppearance,
} from "../src/index";

describe("@sdkwork/iam-h5-user-center appearance", () => {
  it("defaults to the adaptive sdkwork preset without inline token overrides", () => {
    const resolved = resolveSdkworkIamH5UserCenterMeAppearance();
    expect(resolved.preset).toBe("sdkwork");
    expect(resolved.rootClassName).toContain("sdkwork-iam-user-center-me");
    expect(resolved.rootClassName).toContain("sdkwork-iam-user-center-me__page");
    expect(resolved.rootStyle).toBeUndefined();
  });

  it("applies preset tokens as CSS custom properties on the page root", () => {
    const resolved = resolveSdkworkIamH5UserCenterMeAppearance({ preset: "midnight" });
    expect(resolved.rootStyle?.["--sdk-comp-iam-me-page-background"]).toBe("#020617");
    expect(resolved.rootStyle?.["--sdk-comp-iam-me-text-primary"]).toBe("#f8fafc");
  });

  it("lets explicit theme tokens win over the preset", () => {
    const resolved = resolveSdkworkIamH5UserCenterMeAppearance({
      preset: "paper",
      theme: { accent: "#123456" },
    });
    expect(resolved.rootStyle?.["--sdk-comp-iam-me-accent"]).toBe("#123456");
    expect(resolved.rootStyle?.["--sdk-comp-iam-me-page-background"]).toBe("#faf9f7");
  });

  it("merges class names and styles without dropping later values", () => {
    expect(mergeSdkworkIamH5UserCenterMeClassNames("a", undefined, false, "b")).toBe("a b");
    expect(
      mergeSdkworkIamH5UserCenterMeStyles({ color: "red" }, undefined, { padding: 4 }),
    ).toEqual({ color: "red", padding: 4 });
    expect(mergeSdkworkIamH5UserCenterMeStyles(undefined, null)).toBeUndefined();
  });

  it("keeps slot and slotProps config available to the screen", () => {
    const Hero = () => null;
    const resolved = resolveSdkworkIamH5UserCenterMeAppearance({
      slots: { Hero },
      slotProps: { hero: { className: "custom-hero" } },
      heroClassName: "region-hero",
    });
    expect(resolved.slots?.Hero).toBe(Hero);
    expect(resolved.slotProps?.hero?.className).toBe("custom-hero");
    expect(resolved.regions.heroClassName).toBe("region-hero");
  });
});
