import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
} from "react";
import { ArrowLeft, ChevronDown, LogOut } from "lucide-react";

export interface SdkworkAuthAccountMenuProps {
  displayName: string;
  email?: string;
  initials?: string;
  signedInLabel: string;
  signOutLabel: string;
  /** Accessible name for the account chip and its popup menu. */
  menuLabel: string;
  onSignOut: () => void;
  signingOut?: boolean;
  backLabel?: string;
  onBack?: () => void;
}

/** Grace period so the pointer can travel from the trigger into the menu. */
const MOUSE_LEAVE_CLOSE_DELAY_MS = 160;

function resolveInitials(displayName: string, initials?: string): string {
  const provided = initials?.trim();
  if (provided) {
    return provided.slice(0, 2).toUpperCase();
  }

  const words = displayName.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
}

/**
 * Signed-in account chip with a hover/click menu. The popup opens when the
 * pointer enters the chip and when the trigger receives focus (so keyboard
 * users reach the menu with Tab), closes after a short mouse-leave delay,
 * outside pointer down, Escape, or an action, and never carries copy of its
 * own: every visible string comes from the caller.
 */
export function SdkworkAuthAccountMenu({
  backLabel,
  displayName,
  email,
  initials,
  menuLabel,
  onBack,
  onSignOut,
  signedInLabel,
  signingOut = false,
  signOutLabel,
}: SdkworkAuthAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);
  // Pointer interaction suppresses the focus-open path: a tap focuses the
  // trigger before its click event, and opening on focus would then be
  // toggled straight back to closed by that same click.
  const pointerDownRef = useRef(false);
  // Escape restores focus to the trigger; the resulting focus event must not
  // reopen the menu it just closed.
  const suppressFocusOpenRef = useRef(false);
  const menuId = `sdkwork-auth-account-menu-${useId().replace(/[^a-zA-Z0-9_-]/gu, "")}`;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      globalThis.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeMenu = useCallback((restoreFocus = false) => {
    clearCloseTimer();
    setOpen(false);
    if (!restoreFocus) {
      return;
    }

    suppressFocusOpenRef.current = true;
    triggerRef.current?.focus();
    // `focus()` fires synchronously when focus actually moves. When the
    // trigger already had focus there is no event to reset the flag, so clear
    // it on the next microtask.
    globalThis.queueMicrotask(() => {
      suppressFocusOpenRef.current = false;
    });
  }, [clearCloseTimer]);

  const openMenu = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) {
        return;
      }
      closeMenu();
    };
    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      closeMenu(true);
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [closeMenu, open]);

  const handleMouseLeave = () => {
    clearCloseTimer();
    closeTimerRef.current = globalThis.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, MOUSE_LEAVE_CLOSE_DELAY_MS);
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    pointerDownRef.current = false;
    const nextFocus = event.relatedTarget;
    if (nextFocus instanceof Node && containerRef.current?.contains(nextFocus)) {
      return;
    }
    closeMenu();
  };

  const handleTriggerClick = () => {
    pointerDownRef.current = false;
    if (open) {
      closeMenu();
      return;
    }
    openMenu();
  };

  const handleTriggerFocus = () => {
    if (suppressFocusOpenRef.current) {
      suppressFocusOpenRef.current = false;
      return;
    }
    if (pointerDownRef.current) {
      return;
    }
    openMenu();
  };

  return (
    <div
      className="relative"
      onBlur={handleBlur}
      onMouseEnter={openMenu}
      onMouseLeave={handleMouseLeave}
      ref={containerRef}
    >
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={menuLabel}
        className="flex max-w-full items-center gap-2 rounded-full border border-zinc-200 bg-white/90 py-1 pl-1 pr-2.5 text-left shadow-sm transition-colors hover:border-primary-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100 dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-primary-500/60 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950"
        data-testid="sdkwork-auth-account-menu-trigger"
        onClick={handleTriggerClick}
        onFocus={handleTriggerFocus}
        onPointerCancel={() => {
          pointerDownRef.current = false;
        }}
        onPointerDown={() => {
          pointerDownRef.current = true;
        }}
        onPointerUp={() => {
          pointerDownRef.current = false;
        }}
        ref={triggerRef}
        type="button"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-600 text-[11px] font-black uppercase tracking-wide text-white">
          {resolveInitials(displayName, initials)}
        </span>
        <span className="max-w-[7rem] truncate text-sm font-semibold text-zinc-700 dark:text-zinc-100 sm:max-w-[10rem]">
          {displayName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={open
            ? "h-3.5 w-3.5 shrink-0 rotate-180 text-zinc-400 transition-transform duration-150"
            : "h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform duration-150"}
        />
      </button>

      {open ? (
        <div
          aria-label={menuLabel}
          className="absolute right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-1.5 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
          data-testid="sdkwork-auth-account-menu"
          id={menuId}
          role="menu"
        >
          <div className="px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500">
              {signedInLabel}
            </div>
            <div className="mt-1 truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {displayName}
            </div>
            {email ? (
              <div className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                {email}
              </div>
            ) : null}
          </div>
          {backLabel && onBack ? (
            <button
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-zinc-200 dark:hover:bg-zinc-800/70"
              onClick={() => {
                closeMenu();
                onBack();
              }}
              role="menuitem"
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-400" />
              <span className="truncate">{backLabel}</span>
            </button>
          ) : null}
          <div className="my-1 h-px bg-zinc-200 dark:bg-zinc-800" role="separator" />
          <button
            aria-busy={signingOut || undefined}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium text-primary-600 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-primary-400 dark:hover:bg-zinc-800/70"
            data-testid="sdkwork-auth-account-menu-sign-out"
            disabled={signingOut}
            onClick={() => {
              closeMenu();
              onSignOut();
            }}
            role="menuitem"
            type="button"
          >
            <LogOut aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="truncate">{signOutLabel}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
