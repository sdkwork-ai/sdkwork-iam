import { ShieldCheck } from "lucide-react";

import { useSdkworkIamH5AuthMessages } from "../i18n";
import type { SdkworkIamH5AuthMode } from "../types/auth-h5-types";

const MODE_TITLE_KEYS: Record<SdkworkIamH5AuthMode, "loginPwd" | "loginCode" | "register" | "forgot"> = {
  "login-pwd": "loginPwd",
  "login-code": "loginCode",
  register: "register",
  forgot: "forgot",
};

/**
 * Tech-blue IAM auth header.
 *
 * A shield mark on the accent field replaces the legacy green chat glyph: the
 * surface is an identity/security entry, not an IM entry. The fill comes from
 * `--iam-h5-auth-brand-mark-bg`, so a host that runs a flat palette swaps the
 * field instead of forking this component, and no gradient/elevation ships by
 * default.
 */
export function SdkworkIamH5AuthHeader({ mode }: { mode: SdkworkIamH5AuthMode }) {
  const messages = useSdkworkIamH5AuthMessages();
  return (
    <div className="mb-10 flex flex-col items-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--iam-h5-auth-brand-mark-bg)]">
        <ShieldCheck className="h-9 w-9 text-white" />
      </div>
      <h1 className="text-center text-2xl font-semibold">
        {messages.modes[MODE_TITLE_KEYS[mode]]}
      </h1>
    </div>
  );
}
