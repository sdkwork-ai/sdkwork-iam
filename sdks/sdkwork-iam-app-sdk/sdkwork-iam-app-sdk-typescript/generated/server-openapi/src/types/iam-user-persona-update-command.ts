/** Full persona replacement; omitted interests mean an empty list. */
export interface IamUserPersonaUpdateCommand {
  /** Chosen persona role code, or null to clear it. */
  role?: string | null;
  /** Followed interest codes; must be active catalog codes. */
  interests?: string[];
  /** Whether the first-run prompt was answered. */
  promptDismissed?: boolean;
}
