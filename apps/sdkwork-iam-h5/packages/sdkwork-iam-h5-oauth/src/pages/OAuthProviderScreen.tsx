/**
 * Third-party sign-in provider screen (`app.iam.oauth.providers`,
 * `/oauth/providers`).
 *
 * The list is server-paginated and searchable like every other IAM list. Starting
 * a flow mints the authorization URL through the controller and hands it to the
 * injected `onAuthorize`, so the screen never touches `window.location`: the host
 * decides whether that is a same-tab navigation, an in-app browser or a native
 * deep link, and a test can assert the URL without leaving the document.
 */

import { useCallback, useState, type ReactElement } from "react";

import {
  SdkworkIamH5Badge,
  SdkworkIamH5Button,
  SdkworkIamH5Card,
  SdkworkIamH5Notice,
  SdkworkIamH5PagedListSection,
  SdkworkIamH5Screen,
  describeSdkworkIamH5Error,
  useSdkworkIamH5PagedList,
  type SdkworkIamH5ListQuery,
} from "@sdkwork/iam-h5-commons";

import { useIamH5OauthMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5OAuthProvider,
  SdkworkIamH5OAuthProviderController,
  SdkworkIamH5OAuthProviderScreenProps,
} from "../types/oauth-h5-types.js";

/** The third-party sign-in screen. */
export function SdkworkIamH5OAuthProviderScreen({
  controller,
  onAuthorize,
  onBack,
  title,
}: SdkworkIamH5OAuthProviderScreenProps): ReactElement {
  const messages = useIamH5OauthMessages();
  const providers = useSdkworkIamH5PagedList<SdkworkIamH5OAuthProvider>(
    useCallback((query: SdkworkIamH5ListQuery) => controller.fetchProvidersPage(query), [controller]),
  );
  const [starting, setStarting] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const start = (provider: SdkworkIamH5OAuthProvider) => {
    setStarting(provider.code);
    setError(undefined);
    controller
      .createAuthorizationUrl(provider.code)
      .then((url) => onAuthorize(url, provider))
      .catch((cause: unknown) => {
        setError(describeSdkworkIamH5Error(cause, messages.providers.openFailed).message);
      })
      .finally(() => setStarting(undefined));
  };

  return (
    <SdkworkIamH5Screen onBack={onBack} title={title ?? messages.providers.title}>
      {error ? <SdkworkIamH5Notice tone="danger">{error}</SdkworkIamH5Notice> : null}
      <SdkworkIamH5Card>
        <p className="sdkwork-iam-h5-card__caption">{messages.providers.hint}</p>
      </SdkworkIamH5Card>
      <div style={{ marginBlockStart: "var(--sdkwork-iam-h5-space-md)" }}>
        <SdkworkIamH5PagedListSection
          buildRow={(provider) => ({
            accessory:
              provider.enabled === false ? (
                <SdkworkIamH5Badge tone="danger">{messages.providers.unavailable}</SdkworkIamH5Badge>
              ) : (
                <SdkworkIamH5Button
                  disabled={starting !== undefined}
                  onClick={() => start(provider)}
                  variant="secondary"
                >
                  {starting === provider.code ? messages.providers.starting : messages.providers.continue}
                </SdkworkIamH5Button>
              ),
            id: provider.code,
            primary: provider.displayName ?? provider.code,
            secondary: provider.code,
          })}
          list={providers}
          messages={{
            emptyDetail: messages.providers.emptyDetail,
            emptySearch: messages.states.emptySearch,
            emptyTitle: messages.providers.emptyTitle,
            errorMessage: messages.errors.providers,
            errorTitle: messages.states.errorTitle,
            loading: messages.states.loading,
            loadMore: messages.states.loadMore,
            loadMoreErrorMessage: messages.errors.more,
            retry: messages.states.retry,
          }}
          searchLabel={messages.providers.searchLabel}
          title={messages.providers.listSection}
        />
      </div>
    </SdkworkIamH5Screen>
  );
}
