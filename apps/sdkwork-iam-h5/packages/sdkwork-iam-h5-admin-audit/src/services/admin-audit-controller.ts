// SDKWORK-IAM-H5-ADMIN-AUDIT: authored controller.
/**
 * Admin audit controller over the injected IAM service.
 *
 * One query: the event page from the backend-api. Server-searched and server-paged,
 * because an audit trail is the largest list in the whole console and an operator searches
 * it by actor or action rather than paging through it.
 */

import { readSdkworkIamH5Page, type SdkworkIamH5ListQuery } from "@sdkwork/iam-h5-commons";

import type {
  CreateSdkworkIamH5AdminAuditControllerInput,
  SdkworkIamH5AdminAuditController,
  SdkworkIamH5AdminAuditEvent,
  SdkworkIamH5AdminAuditServicePort,
} from "../types/admin-audit-types.js";

/**
 * Build the admin audit controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5AdminAuditController(
  input: SdkworkIamH5AdminAuditServicePort | CreateSdkworkIamH5AdminAuditControllerInput,
): SdkworkIamH5AdminAuditController {
  const service = "service" in input ? input.service : input;

  return {
    async fetchEventsPage(query) {
      const page = readSdkworkIamH5Page<unknown>(
        await service.iam.auditEvents.list(toListParams(query)),
      );
      return {
        ...page,
        items: page.items.flatMap((item) => {
          const event = toEvent(item);
          return event ? [event] : [];
        }),
      };
    },
  };
}

function toListParams(query: SdkworkIamH5ListQuery): Record<string, unknown> {
  const q = query.q?.trim();
  return {
    ...(query.cursor === undefined ? {} : { cursor: query.cursor }),
    ...(query.page === undefined ? {} : { page: query.page }),
    ...(query.page_size === undefined ? {} : { page_size: query.page_size }),
    ...(q === undefined || q === "" ? {} : { q }),
  };
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function toEvent(value: unknown): SdkworkIamH5AdminAuditEvent | undefined {
  const record = toRecord(value);
  const id =
    readString(record.auditEventId) ??
    readString(record.audit_event_id) ??
    readString(record.eventId) ??
    readString(record.id);
  // Without an identity the row cannot be opened or referenced later, so it is dropped
  // instead of rendered as an untraceable line.
  if (!id) return undefined;
  const occurredAt =
    readString(record.occurredAt) ??
    readString(record.occurred_at) ??
    readString(record.createdAt) ??
    readString(record.created_at);
  const actor =
    readString(record.actorName) ??
    readString(record.actorId) ??
    readString(record.actor_id) ??
    readString(record.userId);
  const action = readString(record.action) ?? readString(record.eventType);
  const resource =
    readString(record.resource) ?? readString(record.resourceType) ?? readString(record.target);
  return {
    id,
    ...(occurredAt === undefined ? {} : { occurredAt }),
    ...(actor === undefined ? {} : { actor }),
    ...(action === undefined ? {} : { action }),
    ...(resource === undefined ? {} : { resource }),
  };
}
