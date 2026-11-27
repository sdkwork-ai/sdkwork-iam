import { useSdkworkIamH5AuthMessages } from "../i18n";

export interface SdkworkIamH5AuthFooterProps {
  agreed: boolean;
  setAgreed: (agreed: boolean) => void;
  setShowTerms: (term: string) => void;
}

export function SdkworkIamH5AuthFooter({
  agreed,
  setAgreed,
  setShowTerms,
}: SdkworkIamH5AuthFooterProps) {
  const messages = useSdkworkIamH5AuthMessages();

  return (
    <div className="flex items-start gap-2 px-8 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
      <label className="flex min-h-11 min-w-11 shrink-0 items-center">
        <input
          checked={agreed}
          className="peer sr-only"
          onChange={(event) => setAgreed(event.target.checked)}
          type="checkbox"
        />
        <span
          aria-hidden
          className={
            "flex h-[18px] w-[18px] items-center justify-center rounded-full border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--iam-h5-auth-link)] peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-[var(--iam-h5-auth-bg)] " +
            (agreed
              ? "border-[var(--iam-h5-auth-green)] bg-[var(--iam-h5-auth-green)]"
              : "border-[var(--iam-h5-auth-border-soft)]")
          }
        >
          {agreed ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
        <span className="sr-only">{messages.footer.readAndAgree}</span>
      </label>
      <p className="pt-2 text-[12px] leading-relaxed text-[var(--iam-h5-auth-text-sub)]">
        {messages.footer.readAndAgree}{" "}
        <button
          type="button"
          onClick={() => setShowTerms(messages.footer.termsOfService)}
          className="inline-flex min-h-11 cursor-pointer items-center px-0.5 text-[var(--iam-h5-auth-link)] active:opacity-70"
        >
          {messages.footer.termsOfService}
        </button>{" "}
        {messages.footer.and}{" "}
        <button
          type="button"
          onClick={() => setShowTerms(messages.footer.privacyPolicy)}
          className="inline-flex min-h-11 cursor-pointer items-center px-0.5 text-[var(--iam-h5-auth-link)] active:opacity-70"
        >
          {messages.footer.privacyPolicy}
        </button>
      </p>
    </div>
  );
}
