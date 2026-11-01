import type { IamPersonaLabels } from './iam-persona-labels';

/** One selectable interest direction. */
export interface IamPersonaInterest {
  code: string;
  sortOrder: number;
  labels: IamPersonaLabels;
}
