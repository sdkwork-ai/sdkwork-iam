import { useSdkworkIamH5AuthMessages } from "../i18n";
import type { SdkworkIamH5AuthMode } from "../types/auth-h5-types";

export interface SdkworkIamH5AuthModeLinksProps {
  mode: SdkworkIamH5AuthMode;
  onChangeMode: (mode: SdkworkIamH5AuthMode) => void;
  /** Login mode the back-to-login link returns to when password login is off. */
  defaultLoginMode?: SdkworkIamH5AuthMode;
  showForgotPassword?: boolean;
  showLoginWithCode?: boolean;
  showLoginWithPassword?: boolean;
  showRegister?: boolean;
}

const LINK_CLASS =
  "flex min-h-11 cursor-pointer items-center px-1 text-left active:opacity-70";

export function SdkworkIamH5AuthModeLinks({
  mode,
  onChangeMode,
  defaultLoginMode = "login-pwd",
  showForgotPassword = true,
  showLoginWithCode = true,
  showLoginWithPassword = true,
  showRegister = true,
}: SdkworkIamH5AuthModeLinksProps) {
  const messages = useSdkworkIamH5AuthMessages();
  const isLogin = mode === "login-pwd" || mode === "login-code";

  return (
    <div className="flex items-center justify-between gap-2 px-1 text-[14px] font-medium text-[var(--iam-h5-auth-link)]">
      {mode === "login-pwd" && showLoginWithCode ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode("login-code")} type="button">
          {messages.links.loginWithCode}
        </button>
      ) : null}
      {mode === "login-code" && showLoginWithPassword ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode("login-pwd")} type="button">
          {messages.links.loginWithPwd}
        </button>
      ) : null}
      {isLogin && (showForgotPassword || showRegister) ? (
        <div className="flex gap-1">
          {showForgotPassword ? (
            <button className={LINK_CLASS} onClick={() => onChangeMode("forgot")} type="button">
              {messages.links.forgotPassword}
            </button>
          ) : null}
          {showRegister ? (
            <button className={LINK_CLASS} onClick={() => onChangeMode("register")} type="button">
              {messages.links.registerAccount}
            </button>
          ) : null}
        </div>
      ) : null}
      {!isLogin ? (
        <button className={LINK_CLASS} onClick={() => onChangeMode(defaultLoginMode)} type="button">
          {messages.links.backToLogin}
        </button>
      ) : null}
    </div>
  );
}
