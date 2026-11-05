import type { SdkworkIamOauthAdminPageProps } from "../types/oauth-admin-types";
import { useOauthAdminPageState } from "../hooks/use-oauth-admin-page-state";
import { OauthRelyingPartySection } from "../components/oauth-provider-sections";
import { OauthPageStatus } from "../components/oauth-admin-ui";

/**
 * Focused admin page for the SDKWork OAuth relying party: the hosted login
 * client (clientId, redirect URIs, scopes, confidential secret) and the
 * enabled switch that lets a tenant application start the SDKWork OAuth flow.
 *
 * The provider connections page owns which third-party platforms are enabled;
 * this page owns whether the SDKWork authorization server accepts this
 * application at all, so the two halves of "OAuth login" are configured from
 * one OAuth menu.
 */
export function SdkworkIamOauthRelyingPartyPage({
  controller,
}: SdkworkIamOauthAdminPageProps) {
  const { disabled, error, resourceDetail, status } = useOauthAdminPageState(controller, []);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthRelyingPartySection controller={controller} disabled={disabled} status={status} />
    </div>
  );
}
