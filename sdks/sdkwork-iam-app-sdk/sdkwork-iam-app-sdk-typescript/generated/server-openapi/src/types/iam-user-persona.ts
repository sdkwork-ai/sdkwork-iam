/** The caller persona. role is null until a role is chosen. */
export interface IamUserPersona {
  /** Chosen persona role code, or null while unchosen. */
  role: string | null;
  /** Followed interest codes in catalog order. */
  interests: string[];
  /** Whether the first-run prompt was answered without choosing a role. */
  promptDismissed: boolean;
  /** True once a role is chosen. */
  hasSelection: boolean;
  /** Catalog version the stored selection was validated against. */
  catalogVersion: string | null;
  /** Last write time, or null before the first write. */
  updatedAt: string | null;
}
