/**
 * Operator transport wiring for the unified official-account aggregate.
 *
 * The CRUD implementation lives in `@sdkwork/iam-pc-official-accounts`; this
 * module only maps the backend-admin controller's own resource-account actions
 * onto the shared operator operations. Every action keeps its existing wire
 * shape:
 *
 * - `createAccountSetup` still performs the one-click setup
 *   (integration → client → resource account) for the requested channel kind;
 * - profile, credentials, provider configuration, and the enable switch stay
 *   separate writes, so the drawer's dependency order and dirty checks keep
 *   working unchanged;
 * - the enable switch still updates the account and its login integration.
 */
import {
  DEFAULT_OPERATOR_CAPABILITIES,
  createOfficialAccountsController,
  createOperatorTransport,
  toOfficialAccount,
} from "@sdkwork/iam-pc-official-accounts";
import type {
  OfficialAccountsOperatorOperations,
  OfficialAccountsPage,
  OfficialAccount,
  OfficialAccountsController,
  OfficialAccountDraft,
} from "@sdkwork/iam-pc-official-accounts";

import type {
  SdkworkIamOauthAccountConfig,
  SdkworkIamOauthAdminController,
} from "../types/oauth-admin-types";
import { readAccountIntegrationId, readDisplayName, readResourceAccountId, readResourceAccountKind } from "../utils/oauth-admin-utils";

/** Default page size when a caller does not ask for one. */
const DEFAULT_PAGE_SIZE = 20;

/**
 * Normalizes one backend record, tolerating a record this package cannot read.
 * @param record - the controller's resource-account record.
 * @returns the shared account model, when readable.
 */
function toAccount(record: unknown): OfficialAccount | undefined {
  try {
    return toOfficialAccount(record as Record<string, unknown>);
  } catch {
    return undefined;
  }
}

/**
 * Maps the backend-admin controller onto the shared operator operations.
 * @param controller - the OAuth admin controller that owns the backend SDK.
 * @returns the operations `createOperatorTransport` consumes.
 */
export function createOfficialAccountOperatorOperations(
  controller: SdkworkIamOauthAdminController,
): OfficialAccountsOperatorOperations {
  /**
   * Resolves the login integration behind a resource account. The shared
   * transport addresses accounts by id; the backend actions that also touch the
   * integration still need its id.
   * @param resourceAccountId - the resource account id.
   * @returns the linked integration id, or an empty string when unlinked.
   */
  const integrationIdOf = (resourceAccountId: string): string => {
    const record = controller.getState().resourceAccounts.find(
      (candidate) => readResourceAccountId(candidate) === resourceAccountId,
    );
    return readAccountIntegrationId(record);
  };

  /**
   * Reads the stored record of one resource account.
   * @param resourceAccountId - the resource account id.
   * @returns the raw record, when the snapshot holds it.
   */
  const recordOf = (resourceAccountId: string): unknown => controller.getState().resourceAccounts.find(
    (candidate) => readResourceAccountId(candidate) === resourceAccountId,
  );

  return {
    async list(query): Promise<OfficialAccountsPage> {
      const page = query.page ?? 1;
      const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
      const params: Record<string, unknown> = { page, page_size: pageSize };
      if (query.q !== undefined && query.q.trim() !== "") params.q = query.q.trim();
      if (query.accountType !== undefined && query.accountType !== "") {
        params.accountType = query.accountType;
      }
      if (query.authorizationStatus !== undefined && query.authorizationStatus !== "") {
        params.authorizationStatus = query.authorizationStatus;
      }
      if (query.enabled !== undefined && query.enabled !== "") params.enabled = query.enabled;
      // The shared controller refreshes its list after a mutation. The visible
      // list of this page owns its own paged session, so the transport reads a
      // page without disturbing that session's page, filters, or status.
      const readPage = controller.listResourceAccountPage;
      if (typeof readPage !== "function") {
        return { items: [], totalItems: 0, page, pageSize };
      }
      const listPage = await readPage.call(controller, params);
      const pageInfo = listPage.pageInfo;
      return {
        items: listPage.items
          .filter((item) => readResourceAccountKind(item) === "official_account")
          .map(toAccount)
          .filter((account): account is OfficialAccount => account !== undefined),
        totalItems: Number(pageInfo?.totalItems ?? listPage.items.length),
        page: pageInfo?.page ?? page,
        pageSize: pageInfo?.pageSize ?? pageSize,
      };
    },
    async create(draft: OfficialAccountDraft) {
      const kind = draft.resourceAccountKind ?? "official_account";
      // The shared panel hands over its flat draft; the backend one-click setup
      // takes the developer-configuration document. Fold the panel fields into
      // that document so a create never drops the domains, notification, logo,
      // or menu draft the operator entered.
      // The shared draft model and the backend document describe the same
      // provider configuration; their menu arrays differ only in mutability.
      const config = {
        ...((draft.config ?? {}) as unknown as SdkworkIamOauthAccountConfig),
        ...(draft.logoUrl === undefined ? {} : { logoUrl: draft.logoUrl }),
        ...(draft.jsSecureDomains === undefined
          ? {}
          : { jsSecureDomains: [...draft.jsSecureDomains] }),
        ...(draft.webAuthDomains === undefined
          ? {}
          : { webAuthDomains: [...draft.webAuthDomains] }),
        ...(draft.businessDomains === undefined
          ? {}
          : { businessDomains: [...draft.businessDomains] }),
        ...(draft.customMenu === undefined ? {} : { customMenu: draft.customMenu }),
        ...(draft.redirectUri === undefined ? {} : { redirectUri: draft.redirectUri }),
        ...(draft.notifyUrl === undefined
          && draft.notifyToken === undefined
          && draft.notifyEncodingAesKey === undefined
          && draft.notifyEncryptMode === undefined
          ? {}
          : {
            notify: {
              ...(draft.notifyUrl === undefined ? {} : { url: draft.notifyUrl }),
              ...(draft.notifyToken === undefined ? {} : { token: draft.notifyToken }),
              ...(draft.notifyEncodingAesKey === undefined
                ? {}
                : { encodingAesKey: draft.notifyEncodingAesKey }),
              ...(draft.notifyEncryptMode === undefined
                ? {}
                : {
                  // The shared panel spells the plaintext mode `plaintext`;
                  // the backend account document spells it `plain`.
                  encryptMode: draft.notifyEncryptMode === "plaintext"
                    ? "plain"
                    : draft.notifyEncryptMode,
                }),
            },
          }),
      } as unknown as SdkworkIamOauthAccountConfig;
      return controller.createAccountSetup(kind, {
        ...(draft.accountType === undefined ? {} : { accountType: draft.accountType }),
        appId: draft.appId ?? "",
        appSecret: draft.appSecret ?? "",
        config,
        displayName: draft.displayName,
        enabled: draft.enabled ?? true,
        ...(draft.originalId === undefined ? {} : { originalId: draft.originalId }),
        redirectUri: draft.redirectUri ?? config.redirectUri ?? "",
      });
    },
    async updateProfile(id, profile) {
      // The backend profile action addresses the row by its display name as
      // well, so a group that omits it inherits the stored one.
      const displayName = profile.displayName ?? readDisplayName(recordOf(id));
      if (displayName === "") {
        return;
      }
      await controller.updateAccountProfile(id, integrationIdOf(id), {
        displayName,
        ...(profile.accountType === undefined ? {} : { accountType: profile.accountType }),
        ...(profile.originalId === undefined ? {} : { originalId: profile.originalId }),
      });
    },
    async updateCredentials(id, credentials) {
      await controller.updateAccountCredentials(id, credentials);
    },
    async updateConfig(id, config) {
      // Both models describe the same `provider_config_json` document; the
      // shared model keeps provider-owned keys open, the backend model names
      // the ones it interprets.
      await controller.updateAccountConfig(id, config as unknown as SdkworkIamOauthAccountConfig);
    },
    async remove(id) {
      await controller.deleteResourceAccount(id);
    },
    async setEnabled(id, enabled) {
      await controller.setResourceAccountEnabled(id, integrationIdOf(id), enabled);
    },
    async setQrLogin(id, enabled) {
      await controller.setResourceAccountQrLogin(id, enabled);
    },
    async createFollowQrCode(id) {
      const qr = await controller.createAccountFollowQrCode(id);
      return {
        qrCode: qr.qrCode,
        qrContent: qr.qrContent,
        scene: qr.scene,
        ticket: qr.ticket,
        permanent: qr.permanent,
        expireSeconds: qr.expireSeconds,
        qrMode: qr.qrMode,
      };
    },
    async runVerification(id) {
      await controller.runResourceAccountVerification(id);
    },
    toAccount,
  };
}

/**
 * Builds the operator-mode official-account controller over a backend-admin
 * controller.
 *
 * @param controller - the OAuth admin controller that owns the backend SDK.
 * @returns the shared controller with the operator capability set.
 */
export function createIamOauthOfficialAccountController(
  controller: SdkworkIamOauthAdminController,
): OfficialAccountsController {
  return createOfficialAccountsController(
    createOperatorTransport(createOfficialAccountOperatorOperations(controller)),
    DEFAULT_OPERATOR_CAPABILITIES,
  );
}
