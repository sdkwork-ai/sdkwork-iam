/** One role binding. Tenant and organization identity come from the authenticated context; roleId is immutable after creation and delete revokes rather than removes the row. */
export interface IamRoleBinding {
  id: string;
  tenantId: string;
  organizationId: string;
  roleId: string;
  roleCode: string;
  principalKind: 'user' | 'organization_membership' | 'group' | 'service_account';
  principalId: string;
  /** Resolved user display name for this binding page, or null when unavailable. */
  principalDisplayName?: string | null;
  /** Resolved user login name for this binding page, or null when unavailable. */
  principalUsername?: string | null;
  scopeKind: 'tenant' | 'organization' | 'department';
  scopeId: string;
  effect: 'allow' | 'deny';
  status: 'active' | 'revoked';
  dataScopeKind: 'scope' | 'self' | 'department' | 'department_and_children' | 'organization' | 'tenant';
  /** Inclusive RFC3339 start instant, or null for no lower bound. */
  effectiveFrom: string | null;
  /** Exclusive RFC3339 end instant, or null for no upper bound. */
  effectiveTo: string | null;
}
