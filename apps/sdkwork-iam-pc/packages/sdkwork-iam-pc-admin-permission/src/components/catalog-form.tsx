/**
 * Shared form primitives for the IAM permission administration workspaces.
 *
 * Roles, permissions, policies, and authorization pages keep their localized
 * copy in their own workspace dictionaries; these primitives only carry the
 * value binding so every catalog drawer renders with the same field styling.
 */
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@sdkwork/ui-pc-react";

/** Sentinel value representing "no selection" for CatalogSelect (Radix Select
 *  items cannot carry an empty string value). */
const CATALOG_SELECT_EMPTY = "__catalog_select_empty__";

export function CatalogField({
  disabled,
  hint,
  label,
  onChange,
  placeholder,
  value,
}: {
  disabled?: boolean;
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <Input
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
      {hint ? <span className="block text-xs text-[var(--sdk-color-text-muted)]">{hint}</span> : null}
    </label>
  );
}

export function CatalogSelect({
  label,
  onChange,
  options,
  placeholder,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="block space-y-2 text-sm">
      <span>{label}</span>
      <Select
        onValueChange={(next) => onChange(next === CATALOG_SELECT_EMPTY ? "" : next)}
        value={value || CATALOG_SELECT_EMPTY}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {placeholder ? <SelectItem value={CATALOG_SELECT_EMPTY}>{placeholder}</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

export function toErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Locale tags tried in order for a persisted locale map, most specific first. */
function localeCandidates(locale: string | undefined): string[] {
  const requested = (locale ?? "").trim().replaceAll("_", "-");
  if (!requested) {
    return ["en-US", "zh-CN"];
  }
  const [base] = requested.split("-");
  const candidates = [requested];
  if (base && base.toLowerCase() !== requested.toLowerCase()) {
    candidates.push(base);
  }
  candidates.push("en-US", "zh-CN");
  return candidates;
}

/**
 * Resolves one display label from a persisted locale map.
 *
 * The IAM API ships catalog display text as machine vocabulary — a
 * `labels`/`descriptions` object keyed by BCP 47 tag plus the row's stored
 * `name` — and the caller renders it in its own locale (I18N_SPEC section 7).
 * Resolution is exact tag, then language-only tag, then `en-US`, then `zh-CN`,
 * and only then the caller's fallback: the stored `name`, which is what a
 * tenant-authored role and an untranslated catalog row legitimately have.
 */
export function localizedLabel(
  labels: Readonly<Record<string, string>> | undefined,
  locale: string | undefined,
  fallback: string,
): string {
  if (!labels) {
    return fallback;
  }
  const byTag = new Map(
    Object.entries(labels).map(([tag, value]) => [tag.trim().toLowerCase(), value] as const),
  );
  for (const candidate of localeCandidates(locale)) {
    const hit = byTag.get(candidate.toLowerCase());
    if (hit && hit.trim()) {
      return hit;
    }
  }
  return fallback;
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
