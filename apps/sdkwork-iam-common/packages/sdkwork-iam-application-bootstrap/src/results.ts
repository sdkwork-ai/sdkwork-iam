/**
 * Installation answers whose wire field is still spelled the legacy way.
 *
 * The IAM transport migration moves `tenantApplicationId` to `installationId`;
 * until the generated clients carry the canonical name, every adapter maps the
 * legacy key once here. Keeping the mapping in one function means the rest of
 * the package — and its consumers — only ever read `installationId`.
 */

/**
 * Normalizes one installation answer onto the canonical `installationId`.
 * @param result - raw installation answer, from the wire or a generated client
 * @returns the answer carrying `installationId` when the legacy field named it
 */
export function normalizeInstallationResult<T extends Record<string, unknown>>(result: T): T {
  const legacy = result.tenantApplicationId;
  if (result.installationId !== undefined || typeof legacy !== "string" || legacy.trim() === "") {
    return result;
  }
  return { ...result, installationId: legacy.trim() };
}
