import type { ReactNode } from "react";

interface SdkworkAuthMethodTabItem {
  description?: string;
  icon?: ReactNode;
  label: string;
  value: string;
}

export interface SdkworkAuthMethodTabsProps {
  items: SdkworkAuthMethodTabItem[];
  onChange(value: string): void;
  value: string;
}

export function SdkworkAuthMethodTabs({
  items,
  onChange,
  value,
}: SdkworkAuthMethodTabsProps) {
  // The tab row layout is owned by SDKWORK_AUTH_SURFACE_THEME_STYLE through
  // `.sdkwork-auth-tabs-grid[data-columns]`, not by Tailwind utilities: every
  // embedding application stacks plugin stylesheets into the same cascade
  // layer, and a later sheet's plain `.grid-cols-1` declaration beats an
  // earlier sheet's `sm:grid-cols-*` rule regardless of viewport width.
  const columns = items.length >= 3 ? 3 : Math.max(items.length, 1);

  return (
    <div className="sdkwork-auth-tabs border-b border-[var(--sdkwork-auth-divider-color,rgba(24,24,27,0.08))]">
      <div className="sdkwork-auth-tabs-grid" data-columns={columns}>
        {items.map((item) => {
          const isActive = item.value === value;

          return (
            <button
              className={`sdkwork-auth-tab-button relative flex min-h-[44px] items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary-600 text-[var(--sdkwork-auth-tab-active-text-color,#09090b)] dark:border-primary-400 dark:text-white"
                  : "border-transparent text-[var(--sdkwork-auth-tab-inactive-text-color,#71717a)] hover:text-[var(--sdkwork-auth-tab-hover-text-color,#18181b)] dark:hover:text-zinc-100"
              }`}
              data-state={isActive ? "active" : "inactive"}
              key={item.value}
              onClick={() => onChange(item.value)}
              type="button"
            >
              {item.icon ? (
                <span
                  className={`sdkwork-auth-tab-icon ${
                    isActive
                      ? "text-primary-600 dark:text-primary-300"
                      : "text-zinc-400 dark:text-zinc-500"
                  }`}
                >
                  {item.icon}
                </span>
              ) : null}
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
