/**
 * Password change screen (`app.iam.user-center.password`, `/user/password`).
 *
 * Validation is *client-side courtesy only*: the draft is checked against the
 * minimum length and the confirmation before it is sent, so a typo costs no round
 * trip. The server still owns the real policy, and its refusal is what the screen
 * shows when it disagrees.
 */

import { useState, type ReactElement } from "react";

import {
  SdkworkIamH5Button,
  SdkworkIamH5Card,
  SdkworkIamH5Field,
  SdkworkIamH5Notice,
  SdkworkIamH5Screen,
  describeSdkworkIamH5Error,
} from "@sdkwork/iam-h5-commons";

import { useIamH5UserCenterMessages } from "../i18n/index.js";
import {
  validateSdkworkIamH5PasswordDraft,
  type SdkworkIamH5UserCenterController,
} from "../types/user-center-h5-types.js";

/** Props of {@link SdkworkIamH5UserCenterPasswordScreen}. */
export interface SdkworkIamH5UserCenterPasswordScreenProps {
  controller: SdkworkIamH5UserCenterController;
  onBack?: () => void;
  /** Called after the server accepts the change. */
  onChanged?: () => void;
  title?: string;
}

/** The password screen. */
export function SdkworkIamH5UserCenterPasswordScreen({
  controller,
  onBack,
  onChanged,
  title,
}: SdkworkIamH5UserCenterPasswordScreenProps): ReactElement {
  const messages = useIamH5UserCenterMessages();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [requestError, setRequestError] = useState<string | undefined>();
  const [changed, setChanged] = useState(false);

  const submit = () => {
    const invalid = validateSdkworkIamH5PasswordDraft({ confirmPassword, newPassword, oldPassword });
    setChanged(false);
    setRequestError(undefined);
    if (invalid) {
      setFormError(messages.password.errors[invalid]);
      return;
    }
    setFormError(undefined);
    setSubmitting(true);
    controller
      .changePassword({ confirmPassword, newPassword, oldPassword })
      .then(() => {
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setChanged(true);
        onChanged?.();
      })
      .catch((error: unknown) => {
        setRequestError(describeSdkworkIamH5Error(error, messages.errors.password).message);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.password.title}>
      {formError ? <SdkworkIamH5Notice tone="danger">{formError}</SdkworkIamH5Notice> : null}
      {requestError ? <SdkworkIamH5Notice tone="danger">{requestError}</SdkworkIamH5Notice> : null}
      {changed ? <SdkworkIamH5Notice tone="success">{messages.password.changed}</SdkworkIamH5Notice> : null}

      <SdkworkIamH5Card caption={messages.password.hint} title={messages.password.title}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <SdkworkIamH5Field
            label={messages.password.oldPassword}
            onChange={setOldPassword}
            secret
            value={oldPassword}
          />
          <SdkworkIamH5Field
            label={messages.password.newPassword}
            onChange={setNewPassword}
            secret
            value={newPassword}
          />
          <SdkworkIamH5Field
            label={messages.password.confirmPassword}
            onChange={setConfirmPassword}
            secret
            value={confirmPassword}
          />
          <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
            <SdkworkIamH5Button block disabled={submitting} type="submit">
              {submitting ? messages.password.submitting : messages.password.submit}
            </SdkworkIamH5Button>
          </div>
        </form>
      </SdkworkIamH5Card>
    </SdkworkIamH5Screen>
  );
}
