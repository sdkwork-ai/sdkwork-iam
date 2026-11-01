import type { IamPersonaInterest } from './iam-persona-interest';
import type { IamPersonaRole } from './iam-persona-role';

/** The selectable persona taxonomy with every active locale. */
export interface IamPersonaCatalog {
  /** Opaque catalog version; refresh the cached catalog when it changes. */
  version: string;
  roles: IamPersonaRole[];
  interests: IamPersonaInterest[];
}
