import { Check, LoaderCircle } from "lucide-react";
import type { ReactNode } from "react";
import type { SdkworkAuthMessages } from "../auth-copy.ts";
import {
  SDKWORK_AUTH_SURFACE_THEME_STYLE,
  createSdkworkAuthLightShellStyle,
  mergeSdkworkAuthClassNames,
  mergeSdkworkAuthStyles,
  resolveSdkworkAuthAppearance,
  type SdkworkAuthAppearanceConfig,
  type SdkworkAuthPresentation,
} from "../auth-appearance.ts";

/** The account choice copy block (page title, fallback label, the two actions). */
export type SdkworkAuthAccountChoiceCopy = SdkworkAuthMessages["accountChoice"];

export interface SdkworkAuthAccountChoiceProps {
  /** Host-supplied appearance contract, the same one the auth shell accepts. */
  appearance?: SdkworkAuthAppearanceConfig;
  /** Display name of the account the browser is already signed in as. */
  accountName: string;
  /** Delivery URL of that account's avatar, when the profile carries one. */
  avatarUrl?: string;
  /** Product name the account is being signed in to (the host brand). */
  brandName: string;
  /** Whether a completion is already running, so the card cannot start a second one. */
  busy?: boolean;
  copy: SdkworkAuthAccountChoiceCopy;
  /** Product header rendered above the card (brand plus the account menu). */
  header?: ReactNode;
  /** Short fallback mark rendered when the account has no avatar. */
  initials: string;
  /** Continue the pending sign-in with the account that is already signed in. */
  onContinue(): void;
  /** Raise the account method form so a different account can sign in. */
  onSwitchAccount(): void;
  /** Dialog or full page; the modal host already supplies the backdrop. */
  presentation?: SdkworkAuthPresentation;
}

function AccountAvatar({
  avatarUrl,
  initials,
}: {
  avatarUrl?: string;
  initials: string;
}) {
  if (avatarUrl) {
    return (
      <img
        alt=""
        className="h-12 w-12 shrink-0 rounded-full bg-zinc-200 object-cover"
        data-testid="sdkwork-auth-account-avatar"
        src={avatarUrl}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-semibold uppercase text-zinc-600"
    >
      {initials}
    </span>
  );
}

/**
 * The "choose login account" card a hosted auth page shows when the browser
 * already holds a session and an OAuth authorization is waiting for it.
 *
 * The card is the decision point: the account row continues the pending
 * sign-in with the account the browser is signed in as, and the footer action
 * raises the account method form for a different account. Nothing is
 * auto-completed here, so the browser user confirms which account the app gets.
 */
export function SdkworkAuthAccountChoice({
  accountName,
  appearance,
  avatarUrl,
  brandName,
  busy = false,
  copy,
  header,
  initials,
  onContinue,
  onSwitchAccount,
  presentation = "page",
}: SdkworkAuthAccountChoiceProps) {
  const resolvedAppearance = resolveSdkworkAuthAppearance(appearance);
  const isModalPresentation = presentation === "modal";

  return (
    <div
      className={mergeSdkworkAuthClassNames(
        "sdkwork-auth-surface relative flex w-full items-center justify-center text-[var(--sdkwork-auth-content-text-color,#09090b)]",
        isModalPresentation
          ? "bg-transparent p-0"
          : "min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[var(--sdkwork-auth-page-background-color,#fafafa)] p-4 dark:bg-zinc-950 sm:p-8",
        resolvedAppearance?.pageClassName,
      )}
      data-testid="sdkwork-auth-account-choice"
      style={resolvedAppearance?.pageStyle}
    >
      <style>{SDKWORK_AUTH_SURFACE_THEME_STYLE}</style>
      {header !== undefined && presentation === "page" ? (
        <div className="absolute inset-x-0 top-4 z-20 mx-auto w-full max-w-[560px] px-6 sm:top-6">
          {header}
        </div>
      ) : null}
      <div
        className={mergeSdkworkAuthClassNames(
          "relative z-10 flex w-full max-w-[560px] flex-col rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-zinc-200/70 dark:bg-zinc-950 dark:ring-zinc-800",
          isModalPresentation
            ? "max-h-[min(90dvh,720px)] overflow-y-auto"
            : "min-h-[min(78dvh,700px)]",
          resolvedAppearance?.shellClassName,
        )}
        style={mergeSdkworkAuthStyles(
          createSdkworkAuthLightShellStyle(),
          resolvedAppearance?.shellStyle,
        )}
      >
        <h1
          className={mergeSdkworkAuthClassNames(
            "text-center text-lg font-semibold tracking-tight text-[var(--sdkwork-auth-content-text-color,#09090b)]",
            resolvedAppearance?.titleClassName,
          )}
          style={resolvedAppearance?.titleStyle}
        >
          {copy.title}
        </h1>

        <button
          aria-busy={busy || undefined}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl bg-zinc-100 p-4 text-left transition-colors hover:bg-zinc-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:cursor-progress dark:bg-zinc-900 dark:hover:bg-zinc-800"
          data-testid="sdkwork-auth-account-continue"
          disabled={busy}
          onClick={onContinue}
          type="button"
        >
          <AccountAvatar avatarUrl={avatarUrl} initials={initials} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-medium text-zinc-900 dark:text-zinc-50">
              {accountName}
            </span>
            <span className="block truncate text-sm text-zinc-500 dark:text-zinc-400">
              {brandName}
            </span>
          </span>
          {busy ? (
            <LoaderCircle
              aria-hidden="true"
              className="h-6 w-6 shrink-0 animate-spin text-zinc-900 dark:text-zinc-100"
            />
          ) : (
            <Check
              aria-hidden="true"
              className="h-6 w-6 shrink-0 text-zinc-900 dark:text-zinc-100"
            />
          )}
        </button>

        <div className="mt-auto pt-10 text-center">
          <button
            className="text-sm font-medium text-[var(--sdkwork-auth-muted-color,#71717a)] transition-colors hover:text-primary-600 disabled:cursor-progress dark:text-zinc-400"
            data-testid="sdkwork-auth-account-switch"
            disabled={busy}
            onClick={onSwitchAccount}
            type="button"
          >
            {copy.switchAccount}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface SdkworkAuthSessionCheckProps {
  appearance?: SdkworkAuthAppearanceConfig;
  copy: Pick<SdkworkAuthAccountChoiceCopy, "checking">;
  /** Product header rendered above the card. */
  header?: ReactNode;
  presentation?: SdkworkAuthPresentation;
}

/**
 * The neutral card a hosted auth page shows while the stored session is being
 * revalidated.
 *
 * It exists so an already signed-in browser never sees the login form painted
 * and then torn away: the page holds this card until bootstrap answers, and
 * then renders either the account choice or the login form for a visitor with
 * no valid session.
 */
export function SdkworkAuthSessionCheck({
  appearance,
  copy,
  header,
  presentation = "page",
}: SdkworkAuthSessionCheckProps) {
  const resolvedAppearance = resolveSdkworkAuthAppearance(appearance);
  const isModalPresentation = presentation === "modal";

  return (
    <div
      className={mergeSdkworkAuthClassNames(
        "sdkwork-auth-surface relative flex w-full items-center justify-center text-[var(--sdkwork-auth-content-text-color,#09090b)]",
        isModalPresentation
          ? "bg-transparent p-0"
          : "min-h-[100dvh] overflow-x-hidden overflow-y-auto bg-[var(--sdkwork-auth-page-background-color,#fafafa)] p-4 dark:bg-zinc-950 sm:p-8",
        resolvedAppearance?.pageClassName,
      )}
      data-testid="sdkwork-auth-session-check"
      style={resolvedAppearance?.pageStyle}
    >
      <style>{SDKWORK_AUTH_SURFACE_THEME_STYLE}</style>
      {header !== undefined && presentation === "page" ? (
        <div className="absolute inset-x-0 top-4 z-20 mx-auto w-full max-w-[560px] px-6 sm:top-6">
          {header}
        </div>
      ) : null}
      <div
        className={mergeSdkworkAuthClassNames(
          "relative z-10 flex w-full max-w-[560px] flex-col items-center gap-4 rounded-3xl bg-white p-10 shadow-2xl ring-1 ring-zinc-200/70 dark:bg-zinc-950 dark:ring-zinc-800",
          resolvedAppearance?.shellClassName,
        )}
        role="status"
        style={mergeSdkworkAuthStyles(
          createSdkworkAuthLightShellStyle(),
          resolvedAppearance?.shellStyle,
        )}
      >
        <LoaderCircle
          aria-hidden="true"
          className="h-6 w-6 animate-spin text-[var(--sdkwork-auth-muted-color,#71717a)]"
        />
        <p className="text-sm text-[var(--sdkwork-auth-muted-color,#71717a)]">
          {copy.checking}
        </p>
      </div>
    </div>
  );
}
