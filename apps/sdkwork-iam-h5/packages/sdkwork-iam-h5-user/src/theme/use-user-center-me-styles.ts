import { useEffect } from "react";

import { createSdkworkIamUserCenterMeThemeCss } from "@sdkwork/iam-user-center-core";

import { SDKWORK_IAM_USER_CENTER_ME_STRUCTURE_CSS } from "../theme/user-center-me-structure-css";

const TOKENS_STYLE_ELEMENT_ID = "sdkwork-iam-user-center-me-tokens";
const STRUCTURE_STYLE_ELEMENT_ID = "sdkwork-iam-user-center-me-structure";

/**
 * Injects the dual-mode token sheet and the structural stylesheet once per
 * document (idempotent by element id). Never touches the mode root and never
 * reads `prefers-color-scheme` (THEME_DARKMODE_SPEC.md F1/F2/F8).
 */
export function useSdkworkIamH5UserCenterMeStyles(): void {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    ensureStyleElement(TOKENS_STYLE_ELEMENT_ID, createSdkworkIamUserCenterMeThemeCss());
    ensureStyleElement(STRUCTURE_STYLE_ELEMENT_ID, SDKWORK_IAM_USER_CENTER_ME_STRUCTURE_CSS);
    return undefined;
  }, []);
}

function ensureStyleElement(id: string, css: string): void {
  if (document.getElementById(id) !== null) {
    return;
  }
  const element = document.createElement("style");
  element.id = id;
  element.textContent = css;
  document.head.appendChild(element);
}
