/** Update operator-managed tenant application domain, access permissions, and deploy anchor. */
export interface IamInstallationManagementUpdateCommand {
  primaryDomain?: string;
  accessPermissions?: string[];
  /** Deploy application the installation serves. An update may only fill a MISSING anchor: this is the repair for an installation provisioned before the deployment link existed, and it makes the access-token subject and the relying party resolvable. Re-pointing an installation that already serves a deploy application is a deploy identity migration, not an update, and is answered with 409. */
  deployApplicationId?: string;
}
