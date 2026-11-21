
import type {
  SdkworkIamOauthAdminPageProps,
} from "../types/oauth-admin-types";
import { useOauthAdminPageState } from "../hooks/use-oauth-admin-page-state";
import {
  OauthAuthorizerCapabilitySection,
  OauthOperationalResourceSection,
  OauthOperatorPlatformOnboardingSection,
  OauthOperatorPlatformSection,
  OauthPolicySection,
  OauthResourceAccountSection,
  OauthResourceAuthorizationSection,
  OauthTenantBindingSection,
} from "../components/oauth-extended-sections";
import { OauthPageStatus } from "../components/oauth-admin-ui";



export function OauthExtendedAdminPage({ controller }: SdkworkIamOauthAdminPageProps) {
  const { data, disabled, error, listPageInfo, resourceDetail, status, sync } = useOauthAdminPageState(controller, [
    "policies",
    "tenantBindings",
    "operatorPlatforms",
    "resourceAccounts",
    "resourceAuthorizations",
    "operationalResources",
  ]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthPolicySection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        policies={data.policies}
        status={status}
      />
      <OauthTenantBindingSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        status={status}
        tenantBindings={data.tenantBindings}
      />
      <OauthOperatorPlatformSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        operatorPlatforms={data.operatorPlatforms}
        status={status}
      />
      <OauthResourceAccountSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAccounts={data.resourceAccounts}
        status={status}
      />
      <OauthResourceAuthorizationSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAuthorizations={data.resourceAuthorizations}
        status={status}
      />
      <OauthOperationalResourceSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        operationalResources={data.operationalResources}
        status={status}
      />
    </div>
  );
}

export function OauthOperatorPlatformsPage({ controller }: SdkworkIamOauthAdminPageProps) {
  const { data, disabled, error, listPageInfo, resourceDetail, status, sync } =
    useOauthAdminPageState(controller, ["operatorPlatforms"]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthOperatorPlatformOnboardingSection
        controller={controller}
        disabled={disabled}
        onChanged={sync}
        status={status}
      />
      <OauthOperatorPlatformSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        operatorPlatforms={data.operatorPlatforms}
        status={status}
      />
    </div>
  );
}

export function OauthAuthorizedAccountsPage({ controller }: SdkworkIamOauthAdminPageProps) {
  const { data, disabled, error, listPageInfo, resourceDetail, status, sync } =
    useOauthAdminPageState(controller, ["resourceAccounts", "resourceAuthorizations"]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthAuthorizerCapabilitySection
        controller={controller}
        disabled={disabled}
        onChanged={sync}
        status={status}
      />
      <OauthResourceAccountSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAccounts={data.resourceAccounts}
        status={status}
      />
      <OauthResourceAuthorizationSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAuthorizations={data.resourceAuthorizations}
        status={status}
      />
    </div>
  );
}

export function OauthGovernanceAdminPage({ controller }: SdkworkIamOauthAdminPageProps) {
  const { data, disabled, error, listPageInfo, resourceDetail, status, sync } = useOauthAdminPageState(controller, [
    "policies",
    "tenantBindings",
  ]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthPolicySection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        policies={data.policies}
        status={status}
      />
      <OauthTenantBindingSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        status={status}
        tenantBindings={data.tenantBindings}
      />
    </div>
  );
}

export function OauthResourcesAdminPage({ controller }: SdkworkIamOauthAdminPageProps) {
  const { data, disabled, error, listPageInfo, resourceDetail, status, sync } = useOauthAdminPageState(controller, [
    "operatorPlatforms",
    "resourceAccounts",
    "resourceAuthorizations",
    "operationalResources",
  ]);
  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto">
      <OauthPageStatus error={error} resourceDetail={resourceDetail} />
      <OauthOperatorPlatformSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        operatorPlatforms={data.operatorPlatforms}
        status={status}
      />
      <OauthResourceAccountSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAccounts={data.resourceAccounts}
        status={status}
      />
      <OauthResourceAuthorizationSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        resourceAuthorizations={data.resourceAuthorizations}
        status={status}
      />
      <OauthOperationalResourceSection
        controller={controller}
        disabled={disabled}
        listPageInfo={listPageInfo}
        onChanged={sync}
        operationalResources={data.operationalResources}
        status={status}
      />
    </div>
  );
}
