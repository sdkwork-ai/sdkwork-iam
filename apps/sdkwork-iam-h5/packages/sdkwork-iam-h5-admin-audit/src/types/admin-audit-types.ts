// SDKWORK-IAM-H5-ADMIN-AUDIT-TYPES: authored types.
/**
 * Types of the admin audit trail.
 *
 * An audit row answers the only question that matters when something looks wrong: who did
 * what, to which resource, and when. Every field is therefore optional except the identity
 * and the time — a row without them cannot be placed on a timeline.
 */

import type { SdkworkIamH5ListQuery, SdkworkIamH5Page } from "@sdkwork/iam-h5-commons";
import type { SdkworkIamService } from "@sdkwork/iam-service";

/** The service port this capability consumes (admin tier: backend-api resources). */
export type SdkworkIamH5AdminAuditServicePort = Pick<SdkworkIamService, "iam">;

/** One audit event, flattened for the screen. */
export interface SdkworkIamH5AdminAuditEvent {
  readonly id: string;
  readonly occurredAt?: string;
  readonly actor?: string;
  readonly action?: string;
  readonly resource?: string;
}

/** The controller the screen binds to. */
export interface SdkworkIamH5AdminAuditController {
  fetchEventsPage(query: SdkworkIamH5ListQuery): Promise<SdkworkIamH5Page<SdkworkIamH5AdminAuditEvent>>;
}

/** Controller construction input. */
export interface CreateSdkworkIamH5AdminAuditControllerInput {
  readonly service: SdkworkIamH5AdminAuditServicePort;
}
