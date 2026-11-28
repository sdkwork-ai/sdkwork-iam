/** Partial role-binding update. Omitted fields keep their stored values; an explicit null clears only effectiveFrom or effectiveTo. id, tenantId, organizationId, roleId, roleCode, status, and audit fields are server-owned and cannot be written. */
export interface IamRoleBindingUpdateCommand {
  effect?: 'allow' | 'deny';
  principalKind?: 'user' | 'organization_membership' | 'group' | 'service_account';
  principalId?: string;
  scopeKind?: 'tenant' | 'organization' | 'department';
  scopeId?: string;
  dataScopeKind?: 'scope' | 'self' | 'department' | 'department_and_children' | 'organization' | 'tenant';
  /** Omitted keeps the value; null clears the lower bound. */
  effectiveFrom?: string | null;
  /** Omitted keeps the value; null clears the upper bound. */
  effectiveTo?: string | null;
}
