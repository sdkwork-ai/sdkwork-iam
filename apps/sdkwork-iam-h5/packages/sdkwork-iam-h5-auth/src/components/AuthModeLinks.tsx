import { useSdkworkIamH5AuthMessages } from "../i18n";
import type { SdkworkIamH5AuthMode } from "../types/auth-h5-types";

export interface SdkworkIamH5AuthModeLinksProps {
  mode: SdkworkIamH5AuthMode;
  onChangeMode: (mode: SdkworkIamH5AuthMode) => void;
}

const LINK_CLASS =
  "flex min-h-11 cursor-pointer items-center px-1 text-left active:opacity-70";

export function SdkworkIamH5AuthModeLinks({
  mode,
  onChangeMode,
}: SdkworkIamH5AuthModeLinksProps) {
  const messages = useSdkworkIamH5AuthMessages();
  const isLogin = mode === "login-pwd" || mode === "login-code";

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-[14px] font-medium text-[var(--iam-h5-auth-link)]">
      {mode === "login-pwd" ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode("login-code")} type="button">
          {messages.links.loginWithCode}
        </button>
      ) : null}
      {mode === "login-code" ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode("login-pwd")} type="button">
          {messages.links.loginWithPwd}
        </button>
      ) : null}
      {isLogin ? (
        <div className="flex gap-1">
          <button className={LINK_CLASS} onClick={() => onChangeMode("forgot")} type="button">
            {messages.links.forgotPassword}
          </button>
          <button className={LINK_CLASS} onClick={() => onChangeMode("register")} type="button">
            {messages.links.registerAccount}
          </button>
        </div>
      ) : null}
      {!isLogin ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode("login-pwd")} type="button">
          {messages.links.backToLogin}
        </button>
      ) : null}
    </div>
  );
}
