/**
 * Route manifest for the cloud account center console.
 *
 * `permissionPrefix` is the resource prefix the account center's operations derive
 * from, so a host can gate the entry on `iam.provider_accounts.read` without
 * restating the operation-to-permission mapping. The shared levels additionally
 * require `iam.provider_accounts.manage_shared`, and the `platform` level
 * membership of the platform tenant; a host reads both off the session and asks
 * `resolveIamCloudAccountManageableScopeLevels` which levels to offer, so it does
 * not have to restate either rule.
 *
 * There is deliberately no level list here. An earlier revision exported one, and
 * because the page translates level names by key it was the *only* thing keeping
 * the tenant console's three levels and the platform admin's four from being
 * spelled twice — a second copy of a rule the server owns is a copy that drifts,
 * so the projection now lives in `@sdkwork/iam-contracts` alone.
 */
export const IAM_PC_CONSOLE_CLOUD_ACCOUNT_ROUTES = {
  basePath: "/console/iam/cloud-accounts",
  defaultPath: "/console/iam/cloud-accounts",
  moduleId: "iam-console-cloud-account",
  permissionPrefix: "iam.provider_accounts",
} as const;
