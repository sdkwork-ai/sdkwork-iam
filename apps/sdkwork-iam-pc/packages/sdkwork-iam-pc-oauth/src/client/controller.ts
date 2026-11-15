/**
 * Transport adapter and state controller for the user-facing official-account
 * surface.
 *
 * Both are owned by `@sdkwork/iam-pc-official-accounts`; this module is a thin
 * shell that keeps the historical export names and pins the self-service
 * posture (`D1`: `self_managed_account` rows maintained by their own user). The
 * app-API transport stays `createSelfServiceTransport` — the wire contract
 * (`wechatAppId` on create, blank secrets kept, account id addressing) is
 * unchanged.
 */
import {
  DEFAULT_SELF_SERVICE_CAPABILITIES,
  OfficialAccountsController,
} from "@sdkwork/iam-pc-official-accounts";

import type { SdkworkIamOfficialAccountsClient } from "../types";

export {
  DEFAULT_OFFICIAL_ACCOUNTS_PAGE_SIZE,
  readOfficialAccountMenu,
  toOfficialAccount,
  toOfficialAccountCommand,
  toOfficialAccountCreateCommand,
  type OfficialAccountsSelfServiceApi as SdkworkIamOfficialAccountsApi,
} from "@sdkwork/iam-pc-official-accounts";
export { createSelfServiceTransport as createSdkworkIamOfficialAccountsClient } from "@sdkwork/iam-pc-official-accounts";

/**
 * The signed-in account's own official-account controller.
 *
 * It is the shared controller with the self-service capability set, so the
 * state machine, commit points, and mutation semantics are the same everywhere;
 * only the host posture differs.
 */
export class SdkworkIamOfficialAccountsController extends OfficialAccountsController {
  /** @param client - the injected self-service transport (`createSelfServiceTransport`). */
  constructor(client: SdkworkIamOfficialAccountsClient) {
    super(client, DEFAULT_SELF_SERVICE_CAPABILITIES);
  }
}
