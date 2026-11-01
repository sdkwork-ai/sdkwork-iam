import type { IamPersonaLabels } from './iam-persona-labels';

/** One selectable persona role. */
export interface IamPersonaRole {
  code: string;
  /** Authorization role code this persona maps onto, when one exists. */
  iamRoleCode?: string | null;
  sortOrder: number;
  labels: IamPersonaLabels;
  descriptions: IamPersonaLabels;
}
