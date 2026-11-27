import { useId } from "react";
import { Eye, EyeOff } from "lucide-react";

import { useSdkworkIamH5AuthMessages } from "../i18n";
import type { SdkworkIamH5AuthMode } from "../types/auth-h5-types";

export interface SdkworkIamH5AuthFormFieldsProps {
  mode: SdkworkIamH5AuthMode;
  account: string;
  code: string;
  confirmPassword: string;
  countdown: number;
  password: string;
  setAccount: (value: string) => void;
  setCode: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setPassword: (value: string) => void;
  setShowPwd: (value: boolean) => void;
  showPwd: boolean;
  handleSendCode: () => void;
}

export function SdkworkIamH5AuthFormFields({
  mode,
  account,
  code,
  confirmPassword,
  countdown,
  password,
  setAccount,
  setCode,
  setConfirmPassword,
  setPassword,
  setShowPwd,
  showPwd,
  handleSendCode,
}: SdkworkIamH5AuthFormFieldsProps) {
  const messages = useSdkworkIamH5AuthMessages();
  const fieldId = useId();
  const accountId = `${fieldId}-account`;
  const passwordId = `${fieldId}-password`;
  const confirmPasswordId = `${fieldId}-confirm-password`;
  const codeId = `${fieldId}-code`;
  const showPasswordRow = mode === "login-pwd" || mode === "register" || mode === "forgot";
  const showConfirmPasswordRow = mode === "register";
  const showCodeRow = mode === "login-code" || mode === "register" || mode === "forgot";

  const codeField = showCodeRow ? (
    <div className="flex min-h-12 items-center border-b border-[var(--iam-h5-auth-border)] py-3 transition-colors focus-within:border-[var(--iam-h5-auth-green)]">
      <label className="sr-only" htmlFor={codeId}>
        {messages.common.codeLabel}
      </label>
      <input
        id={codeId}
        name="code"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        enterKeyHint={mode === "login-code" ? "done" : "next"}
        placeholder={messages.common.codePlaceholder}
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
        className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
      />
      <button
        type="button"
        onClick={handleSendCode}
        disabled={countdown > 0}
        className="flex min-h-11 shrink-0 items-center pl-4 text-[15px] font-medium text-[var(--iam-h5-auth-link)] transition-opacity disabled:opacity-50 active:opacity-70"
      >
        {countdown > 0 ? `${countdown}s` : messages.common.getCode}
      </button>
    </div>
  ) : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="group flex min-h-12 items-center border-b border-[var(--iam-h5-auth-border)] py-3 transition-colors focus-within:border-[var(--iam-h5-auth-green)]">
        <label
          className="mr-4 text-[16px] font-medium opacity-50"
          htmlFor={accountId}
        >
          {messages.common.accountLabel}
        </label>
        <input
          id={accountId}
          name="username"
          type="text"
          autoCapitalize="none"
          autoComplete="username"
          enterKeyHint="next"
          spellCheck={false}
          placeholder={messages.common.accountPlaceholder}
          value={account}
          onChange={(event) => setAccount(event.target.value.trim())}
          className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        />
      </div>

      {/* Registration verifies the account before it collects a new password. */}
      {mode === "register" ? codeField : null}

      {showPasswordRow ? (
        <div className="flex min-h-12 items-center border-b border-[var(--iam-h5-auth-border)] py-3 transition-colors focus-within:border-[var(--iam-h5-auth-green)]">
          <label className="sr-only" htmlFor={passwordId}>
            {mode === "forgot" ? messages.common.newPasswordLabel : messages.common.passwordLabel}
          </label>
          <input
            id={passwordId}
            name={mode === "forgot" ? "newPassword" : "password"}
            type={showPwd ? "text" : "password"}
            autoComplete={mode === "login-pwd" ? "current-password" : "new-password"}
            enterKeyHint={showConfirmPasswordRow || showCodeRow ? "next" : "done"}
            placeholder={
              mode === "forgot"
                ? messages.common.setNewPasswordPlaceholder
                : messages.common.passwordPlaceholder
            }
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
          <button
            type="button"
            aria-controls={passwordId}
            aria-label={showPwd ? messages.common.hidePassword : messages.common.showPassword}
            aria-pressed={showPwd}
            onClick={() => setShowPwd(!showPwd)}
            className="flex h-11 w-11 shrink-0 items-center justify-center pl-4 opacity-60 transition-transform active:scale-90"
          >
            {showPwd ? <Eye className="h-5 w-5" aria-hidden /> : <EyeOff className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      ) : null}

      {showConfirmPasswordRow ? (
        <div className="flex min-h-12 items-center border-b border-[var(--iam-h5-auth-border)] py-3 transition-colors focus-within:border-[var(--iam-h5-auth-green)]">
          <label className="sr-only" htmlFor={confirmPasswordId}>
            {messages.common.confirmPasswordLabel}
          </label>
          <input
            id={confirmPasswordId}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            enterKeyHint="done"
            placeholder={messages.common.confirmPasswordPlaceholder}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
        </div>
      ) : null}

      {mode === "register" ? null : codeField}
    </div>
  );
}
