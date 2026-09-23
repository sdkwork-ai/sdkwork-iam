import { ChevronsUpDown, X } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { cn, Input, Popover, PopoverAnchor, PopoverContent } from "@sdkwork/ui-pc-react";

export interface RegionComboboxProps {
  /**
   * Accessible name of the clear control.
   *
   * The control carries an icon and no text, so this is the only thing that
   * names it; it says which field it empties rather than just "clear", because
   * a form can hold several clearable values.
   */
  clearLabel: string;
  disabled?: boolean;
  /** Shown in the list when a typed query matches none of the provider's candidates. */
  emptyText: string;
  /** Why the list follows the provider, and that the list is not a constraint. */
  hint: string;
  label: string;
  onChange: (regionCode: string) => void;
  /** The selected provider's candidates; empty when it publishes no regions. */
  options: readonly string[];
  placeholder: string;
  /** Localized name of a candidate, falling back to the code for one not carried. */
  resolveLabel: (regionCode: string) => string;
  value: string;
}

/**
 * Index of the candidate a freshly typed value completes, or `-1` for none.
 *
 * Only a **prefix** counts as a completion, and the distinction is what keeps
 * <kbd>Enter</kbd> honest. With a completion highlighted, <kbd>Enter</kbd> takes
 * it — that is what a combobox is for. Without one it does nothing, so
 * <kbd>Enter</kbd> reaches the surrounding form and the operator's own text is
 * what gets submitted. Accepting a *substring* match instead would mean that
 * typing `cn-hangzhou-2` — a region this provider does not publish — silently
 * collapsed to `cn-hangzhou` on submit.
 */
export function regionCompletionIndex(regionCode: string, options: readonly string[]): number {
  const query = regionCode.trim().toLowerCase();
  if (query.length === 0) {
    return -1;
  }
  return options.findIndex((code) => code.toLowerCase().startsWith(query));
}

/**
 * The provider's own name for a value, or `undefined` when it has none to give.
 *
 * `undefined` covers both "no value" and "a value this provider does not
 * publish" — a hand-typed `cn-hangzhou-2`, or a code left over from another
 * provider — and it also covers a code the provider carries but the catalogue
 * cannot name, because painting that over the field would just draw the code on
 * top of itself. Comparison is case-insensitive, matching the rule the provider
 * switch uses for the same question.
 */
export function regionNameFor(
  regionCode: string,
  options: readonly string[],
  resolveLabel: (regionCode: string) => string,
): string | undefined {
  const candidate = regionCode.trim().toLowerCase();
  if (candidate.length === 0) {
    return undefined;
  }
  const carried = options.find((code) => code.toLowerCase() === candidate);
  if (carried === undefined) {
    return undefined;
  }
  const name = resolveLabel(carried);
  return name === carried ? undefined : name;
}

/**
 * A region field that is both a text input and a candidate list.
 *
 * Region is provider-scoped vocabulary whose candidates are *convenience*, not
 * contract: `region_code` is free `TEXT`, the server never validates it, and the
 * resolver never matches on it. So the field stays a real input — anything can
 * be typed and is kept verbatim — and the list only saves typing. That is also
 * why the list follows the selected provider (`options` is whatever the caller
 * resolved for the current vendor) and why a provider with no region concept
 * simply gets no list rather than an empty dropdown.
 *
 * The value it holds is always the **code**, because that is what the API
 * stores and what the list's prefix matching runs against; the provider's name
 * for that code is painted over it while the field is at rest, so the operator
 * reads `华东1（杭州）` rather than `cn-hangzhou`. Editing reveals the code: a
 * field being typed into has to show the text that will be submitted, and a name
 * is a presentation of the value rather than the value.
 *
 * The popup is anchored through a Radix `Popover` so it is portalled out of the
 * dialog body's scroll container, and it keeps focus in the input rather than
 * stealing it, because the input is what the operator is typing into.
 *
 * A value can be removed in one gesture: the clear control empties the field and
 * leaves the caret in it. Without one, a region chosen by mistake has to be
 * emptied a character at a time, and no other control on the page touches this
 * field.
 */
export function RegionCombobox({
  clearLabel,
  disabled,
  emptyText,
  hint,
  label,
  onChange,
  options,
  placeholder,
  resolveLabel,
  value,
}: RegionComboboxProps) {
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // Whether the operator is in the field *as text*. Focus counts, because the
  // caret is in the value; picking a candidate does not, because that ends the
  // interaction — which is why a pick settles the field back onto the name.
  const [editing, setEditing] = useState(false);
  const name = regionNameFor(value, options, resolveLabel);
  const query = value.trim().toLowerCase();
  const matches = options.filter(
    (code) =>
      query.length === 0
      || code.toLowerCase().includes(query)
      || resolveLabel(code).toLowerCase().includes(query),
  );
  // A provider with nothing to offer keeps an ordinary input: an empty dropdown
  // would be a promise the field cannot keep.
  const hasList = options.length > 0;
  const expanded = open && hasList;
  const active = matches.length > 0 ? Math.min(Math.max(activeIndex, -1), matches.length - 1) : -1;
  // Only offer to clear something that is there, and never on a field the
  // operator cannot change at all -- a disabled control that looks usable is
  // worse than one that is absent. Note this does not depend on `hasList`: a
  // provider with no candidates is exactly where a typed region is most likely
  // to need removing.
  const clearable = value.length > 0 && disabled !== true;
  // Room for whichever adornments are showing, so the text never runs beneath
  // them. Two need more than one, and that is the only reason this is a choice
  // rather than a constant. The input and the name layer share it, or the name
  // would truncate at a different place than the code it covers.
  const textInset = hasList && clearable ? "pr-14" : hasList || clearable ? "pr-9" : undefined;

  const commit = (regionCode: string) => {
    onChange(regionCode);
    setOpen(false);
    setActiveIndex(-1);
    // A pick completes the interaction rather than continuing it, so the field
    // stops being edited and is left showing the region's name. `setEditing` is
    // what states that; the blur is what makes it true of the browser. Neither is
    // redundant — the field must not depend on a blur event arriving in order to
    // stop displaying a code.
    setEditing(false);
    inputRef.current?.blur();
  };

  /**
   * Empty the field, and stay in it.
   *
   * Clearing is a step towards the *next* value rather than the end of the
   * interaction: the operator either types a code this provider does not publish
   * or picks another one, and both start from the field. Focusing it is what
   * opens the list anyway, so the open is stated outright instead of depending
   * on a focus event arriving -- the field may already hold focus, and then no
   * `focus` event would fire at all.
   */
  const clear = () => {
    onChange("");
    setActiveIndex(-1);
    setOpen(hasList);
    inputRef.current?.focus();
  };

  /**
   * Keep the list open while the operator is inside the field itself.
   *
   * Radix's dismissable layer treats focus and pointer events outside the popup
   * as a reason to close, and the input is **outside** the popup — it is the
   * anchor, not a child. So clicking or focusing the field the popup belongs to
   * would count as leaving it, and the list would close on the gesture that was
   * meant to open it. Both handlers therefore re-announce our own field as
   * inside: anything within it is not an outside interaction.
   */
  const keepOpenWithinField = (event: { detail: { originalEvent: Event }; preventDefault: () => void }) => {
    const target = event.detail.originalEvent.target;
    if (target instanceof Node && rootRef.current?.contains(target)) {
      event.preventDefault();
    }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!expanded) {
        setOpen(true);
        return;
      }
      setActiveIndex(active < 0 ? 0 : Math.min(active + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      if (!expanded) {
        return;
      }
      event.preventDefault();
      setActiveIndex(active <= 0 ? 0 : active - 1);
    } else if (event.key === "Enter") {
      if (expanded && active >= 0) {
        event.preventDefault();
        commit(matches[active]);
      }
    } else if (event.key === "Escape") {
      if (expanded) {
        event.preventDefault();
        setOpen(false);
      }
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div className="space-y-1 text-sm" data-slot="cloud-account-region">
      <span className="block text-[var(--sdk-color-text-secondary)]">{label}</span>
      <Popover onOpenChange={setOpen} open={expanded}>
        <PopoverAnchor asChild>
          <div className="relative" ref={rootRef}>
            <Input
              aria-autocomplete="list"
              aria-controls={expanded ? listboxId : undefined}
              aria-expanded={expanded}
              aria-label={label}
              autoComplete="off"
              className={textInset}
              disabled={disabled}
              onChange={(event) => {
                const next = event.target.value;
                setEditing(true);
                onChange(next);
                setOpen(true);
                setActiveIndex(regionCompletionIndex(next, options));
              }}
              onBlur={() => setEditing(false)}
              onFocus={(event) => {
                const wasNamed = name !== undefined && !editing;
                setEditing(true);
                if (hasList) {
                  setOpen(true);
                }
                if (!wasNamed) {
                  return;
                }
                // The click landed on the *name*, whose glyphs sit at different
                // offsets than the code appearing underneath it, so the caret the
                // browser placed can fall mid-code and typing would splice into it
                // (`ap-sin|gapore`). The operator is replacing a value they cannot
                // see the edges of, so send the caret to the end instead.
                const input = event.currentTarget;
                if (input.selectionStart === input.selectionEnd) {
                  const end = input.value.length;
                  input.setSelectionRange(end, end);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              ref={inputRef}
              role="combobox"
              value={value}
            />
            {name !== undefined && !editing ? (
              <span
                // Presentation of the value, not the value: assistive tech reads
                // the code the field actually holds, so this layer is hidden from
                // it. The field's own surface paints over the code underneath,
                // which is why nothing here is transparent.
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-px left-3 right-3 flex items-center bg-[var(--sdk-color-surface-panel)]"
                data-slot="cloud-account-region-name"
              >
                <span className={cn("truncate", textInset)}>
                  {name}
                </span>
              </span>
            ) : null}
            {clearable || hasList ? (
              // One flex container for both adornments, rather than an absolute
              // offset per icon: with two of them, a hard-coded `right-9` for the
              // second is a number that goes wrong the moment either icon's size
              // changes. The container itself takes no pointer events -- the input
              // must stay reachable between the icons -- so only the button opts
              // back in.
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1">
                {clearable ? (
                  <button
                    // Emptying the field is reachable from the keyboard by
                    // editing the value, so this is deliberately not a tab stop:
                    // one per region field would put a button between every pair
                    // of inputs in the form.
                    aria-label={clearLabel}
                    className="pointer-events-auto rounded-[var(--sdk-radius-control)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--sdk-color-brand-primary)]"
                    data-slot="cloud-account-region-clear"
                    // `mousedown` with the default prevented, like the options
                    // below: it keeps focus in the input instead of moving it onto
                    // this button, and it runs before the pointer-down handler
                    // that would dismiss the popup. It also sits inside the field,
                    // so `keepOpenWithinField` already counts it as an inside
                    // interaction rather than a reason to close.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      clear();
                    }}
                    tabIndex={-1}
                    type="button"
                  >
                    {/*
                      The colour sits on this span rather than on the button, and
                      that is load-bearing rather than stylistic: the app ships an
                      *unlayered* `button, input, select, textarea { color: inherit }`
                      which follows the `utilities` layer, and an unlayered
                      declaration beats a layered one — so a `text-*` utility on a
                      native `<button>` never takes effect. Measured in the browser:
                      with the utilities on the button it computed to the field's
                      own text colour and the hover state was a no-op, while the
                      same class on the sibling `span` resolved to the token.
                    */}
                    <span className="text-[var(--sdk-color-text-muted)] transition-colors hover:text-[var(--sdk-color-text-primary)]">
                      <X size={15} />
                    </span>
                  </button>
                ) : null}
                {hasList ? (
                  <span aria-hidden="true" className="text-[var(--sdk-color-text-muted)]">
                    <ChevronsUpDown size={15} />
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>
        </PopoverAnchor>
        {expanded ? (
          <PopoverContent
            align="start"
            // `listbox` rather than the popover's default `dialog`: the popup
            // renders inside the editor Modal, and a second dialog role there
            // would announce a dialog inside a dialog.
            className="max-h-56 w-[var(--radix-popper-anchor-width)] overflow-y-auto p-1"
            id={listboxId}
            onFocusOutside={keepOpenWithinField}
            // The input is the thing being typed into, so opening the list must
            // not move focus into it.
            onOpenAutoFocus={(event) => event.preventDefault()}
            onPointerDownOutside={keepOpenWithinField}
            role="listbox"
          >
            {matches.length === 0 ? (
              <p className="px-3 py-2 text-xs text-[var(--sdk-color-text-muted)]">{emptyText}</p>
            ) : (
              matches.map((code, index) => (
                <button
                  aria-selected={index === active}
                  className={cn(
                    "flex w-full min-w-0 items-center justify-between gap-3 rounded-[var(--sdk-radius-control)] px-3 py-2 text-left text-sm",
                    index === active
                      ? "bg-[var(--sdk-color-brand-primary-soft)] text-[var(--sdk-color-text-primary)]"
                      : "text-[var(--sdk-color-text-secondary)]",
                  )}
                  id={`${listboxId}-${index}`}
                  key={code}
                  // `mousedown` rather than `click`, with the default prevented:
                  // this keeps focus in the input, so the operator can carry on
                  // typing, and it fires before the pointer-down handler that
                  // would dismiss the popup.
                  onMouseDown={(event) => {
                    event.preventDefault();
                    commit(code);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span className="truncate">{resolveLabel(code)}</span>
                  <span className="shrink-0 text-xs text-[var(--sdk-color-text-muted)]">{code}</span>
                </button>
              ))
            )}
          </PopoverContent>
        ) : null}
      </Popover>
      <p className="text-xs text-[var(--sdk-color-text-secondary)]">{hint}</p>
    </div>
  );
}
