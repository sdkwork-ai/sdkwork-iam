/**
 * Admin policy catalog (`admin.iam.permission.policies`, path `/admin/iam/policies`).
 *
 * Which policies this tenant defines and whether each allows or denies. The effect is
 * shown on the row because "allow" and "deny" are otherwise indistinguishable by name.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  useSdkworkIamH5PagedList,
} from "@sdkwork/iam-h5-commons";

import { useIamH5AdminPermissionMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminPolicy,
  SdkworkIamH5AdminPolicyController,
} from "../types/admin-permission-types.js";

/** Props of {@link SdkworkIamH5AdminPolicyScreen}. */
export interface SdkworkIamH5AdminPolicyScreenProps {
  controller: SdkworkIamH5AdminPolicyController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The admin policy catalog screen. */
export function SdkworkIamH5AdminPolicyScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminPolicyScreenProps): ReactElement {
  const messages = useIamH5AdminPermissionMessages();
  const policies = useSdkworkIamH5PagedList<SdkworkIamH5AdminPolicy>(
    useCallback((query) => controller.fetchPoliciesPage(query), [controller]),
  );

  const listMessages = {
    emptyDetail: messages.states.emptyPoliciesDetail,
    emptySearch: messages.states.emptySearch,
    emptyTitle: messages.states.emptyPolicies,
    errorMessage: messages.errors.policies,
    errorTitle: messages.states.errorTitle,
    loading: messages.states.loading,
    loadMore: messages.states.loadMore,
    loadMoreErrorMessage: messages.errors.more,
    retry: messages.states.retry,
  };

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.policies.title}>
      <SdkworkIamH5PagedListSection<SdkworkIamH5AdminPolicy>
        buildRow={(policy) => ({
          accessory:
            policy.effect === undefined ? undefined : (
              <SdkworkIamH5Badge tone={policy.effect === "deny" ? "danger" : "success"}>
                {policy.effect}
              </SdkworkIamH5Badge>
            ),
          id: policy.id,
          primary: policy.code,
          secondary: policy.id,
        })}
        list={policies}
        messages={listMessages}
        searchLabel={messages.policies.searchPolicies}
        title={messages.policies.policiesSection}
      />
    </SdkworkIamH5Screen>
  );
}
