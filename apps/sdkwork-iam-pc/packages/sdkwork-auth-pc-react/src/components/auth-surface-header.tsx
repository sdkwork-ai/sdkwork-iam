import type { ReactNode } from "react";
import {
  resolveSdkworkAuthBrandLogoUrl,
  resolveSdkworkAuthBrandMark,
  resolveSdkworkAuthBrandName,
  type SdkworkAuthBrand,
} from "../auth-brand.ts";
import { SdkworkAuthAccountMenu } from "./auth-account-menu.tsx";

/** The signed-in identity the header shows with its sign-out menu. */
export interface SdkworkAuthSurfaceAccount {
  displayName: string;
  email: string;
  initials: string;
  /** Accessible label of the account menu. */
  menuLabel: string;
  /** Sign-out action label / in-progress label. */
  signOutLabel: string;
  signingOut: boolean;
  signedInLabel: string;
  onSignOut(): void;
}

export interface SdkworkAuthSurfaceHeaderProps {
  /** Product brand; falls back to the shared IAM identity when absent. */
  brand?: SdkworkAuthBrand;
  /**
   * Host-rendered brand lockup (logo plus wordmark) that must match the
   * product's own navigation exactly. When present it replaces the generic
   * brand mark/name on the left.
   */
  brandNode?: ReactNode;
  /** The signed-in account, when the surface should offer switching/sign-out. */
  account?: SdkworkAuthSurfaceAccount;
  /** Extra trailing content rendered before the account menu. */
  trailing?: ReactNode;
}

/**
 * Page-level host that places the product header at the page's top corners.
 *
 * The header row itself already splits brand (left) from account (right); this
 * host spans the whole page instead of the centered card column, so the brand
 * sits at the top-left and the sign-out control at the top-right on every
 * hosted auth surface.
 * @param props - the header row and whether it is pinned to the page top.
 * @returns the positioned header host.
 */
export function SdkworkAuthSurfaceHeaderHost({
  children,
  pinned = true,
}: {
  children: ReactNode;
  /**
   * `true` pins the header over the page's top edge; `false` lays it out in the
   * page's own flex column (the desktop hand-off page).
   */
  pinned?: boolean;
}) {
  return (
    <div
      className={pinned
        ? "absolute inset-x-0 top-4 z-20 w-full px-4 sm:top-6 sm:px-8"
        : "relative z-20 w-full shrink-0"}
    >
      {children}
    </div>
  );
}

/**
 * The single product header every hosted auth surface renders.
 *
 * The brand identifies the deployment, and a signed-in browser gets the
 * account menu so it can end the session (or switch accounts) from the auth
 * page itself instead of hunting for the settings menu. Plain web pages,
 * desktop hand-off pages and the hosted OAuth entry all render this one
 * component, so the login surface never grows a second header design.
 */
export function SdkworkAuthSurfaceHeader({
  account,
  brand,
  brandNode,
  trailing,
}: SdkworkAuthSurfaceHeaderProps) {
  const brandName = resolveSdkworkAuthBrandName(brand);
  const brandLogoUrl = resolveSdkworkAuthBrandLogoUrl(brand);

  return (
    <header className="relative z-20 flex w-full items-center justify-between gap-3">
      {brandNode ?? (
        <div className="flex min-w-0 items-center gap-2 text-sm font-bold tracking-tight text-zinc-600 dark:text-zinc-300">
          {brandLogoUrl ? (
            <img
              alt=""
              className="h-7 w-auto max-w-[6rem] shrink-0 rounded-lg object-contain"
              data-testid="sdkwork-auth-brand-logo"
              src={brandLogoUrl}
            />
          ) : (
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-[10px] font-black tracking-wide text-white dark:bg-white dark:text-zinc-950"
              data-testid="sdkwork-auth-brand-mark"
            >
              {resolveSdkworkAuthBrandMark(brandName)}
            </span>
          )}
          <span className="truncate" data-testid="sdkwork-auth-brand-name">
            {brandName}
          </span>
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2">
        {trailing}
        {account ? (
          <div
            aria-label={account.menuLabel}
            className="relative z-20 shrink-0"
            role="group"
          >
            <SdkworkAuthAccountMenu
              displayName={account.displayName}
              email={account.email}
              initials={account.initials}
              menuLabel={account.menuLabel}
              onSignOut={account.onSignOut}
              signedInLabel={account.signedInLabel}
              signOutLabel={account.signOutLabel}
              signingOut={account.signingOut}
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
