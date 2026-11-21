/** Update operator-managed tenant application domain and access permissions. */
export interface IamInstallationManagementUpdateCommand {
  primaryDomain?: string;
  accessPermissions?: string[];
}
