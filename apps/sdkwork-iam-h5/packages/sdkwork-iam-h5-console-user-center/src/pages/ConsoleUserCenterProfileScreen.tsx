/**
 * Console user-center profile (`console.iam.user-center.profile`, path
 * `/console/iam/user`).
 *
 * The operator's own record plus the tenant's verification policy. The policy is what
 * most verification tickets are really about — "will this user be asked to verify an
 * email?" — and the app profile screen never surfaces it.
 */

import { useCallback, type ReactElement } from "react";

import {
  SdkworkIamH5Card,
  SdkworkIamH5KeyValueList,
  SdkworkIamH5LoadingState,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  useSdkworkIamH5Resource,
} from "@sdkwork/iam-h5-commons";

import { useIamH5ConsoleUserCenterMessages } from "../i18n/index.js";
import type { SdkworkIamH5ConsoleUserCenterController } from "../types/console-user-center-types.js";

/** Props of {@link SdkworkIamH5ConsoleUserCenterProfileScreen}. */
export interface SdkworkIamH5ConsoleUserCenterProfileScreenProps {
  controller: SdkworkIamH5ConsoleUserCenterController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** The console user-center profile. */
export function SdkworkIamH5ConsoleUserCenterProfileScreen({
  controller,
  onBack,
}: SdkworkIamH5ConsoleUserCenterProfileScreenProps): ReactElement {
  const messages = useIamH5ConsoleUserCenterMessages();
  const account = useSdkworkIamH5Resource(useCallback(() => controller.loadAccount(), [controller]));
  const policy = useSdkworkIamH5Resource(
    useCallback(() => controller.loadVerificationPolicy(), [controller]),
  );

  const requirement = (required: boolean): string =>
    required ? messages.profile.required : messages.profile.optional;
  const notReported = messages.profile.notReported;

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.profile.title}>
      <SdkworkIamH5Card title={messages.profile.accountSection}>
        {account.status === "loading" && !account.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {account.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.account}</SdkworkIamH5Notice>
        ) : null}
        {account.data ? (
          <SdkworkIamH5KeyValueList
            items={[
              { label: messages.profile.userId, value: account.data.userId ?? notReported },
              {
                label: messages.profile.displayName,
                value: account.data.displayName ?? notReported,
              },
              { label: messages.profile.email, value: account.data.email ?? notReported },
              { label: messages.profile.phone, value: account.data.phone ?? notReported },
            ]}
          />
        ) : null}
      </SdkworkIamH5Card>

      <SdkworkIamH5Card title={messages.profile.verificationSection}>
        {policy.status === "loading" && !policy.data ? (
          <SdkworkIamH5LoadingState label={messages.states.loading} />
        ) : null}
        {policy.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.verification}</SdkworkIamH5Notice>
        ) : null}
        {policy.data ? (
          <SdkworkIamH5KeyValueList
            items={[
              {
                label: messages.profile.verification.contact,
                value: requirement(policy.data.contactRequired),
              },
              {
                label: messages.profile.verification.email,
                value: requirement(policy.data.emailRequired),
              },
              {
                label: messages.profile.verification.oauth,
                value: requirement(policy.data.oauthRequired),
              },
            ]}
          />
        ) : null}
      </SdkworkIamH5Card>
    </SdkworkIamH5Screen>
  );
}
