import { useState } from "react";
import {
  Button,
  Label,
  SettingsSection,
} from "@sdkwork/ui-pc-react";

import type {
  SdkworkIamOauthOperationalResourceDraft,
  SdkworkIamOauthOperatorPlatformComponentDraft,
  SdkworkIamOauthOperatorPlatformDraft,
  SdkworkIamOauthPolicyDraft,
  SdkworkIamOauthResourceAccountDraft,
  SdkworkIamOauthResourceAuthorizationDraft,
  SdkworkIamOauthTenantBindingDraft,
} from "../types/oauth-admin-types";
import { EMPTY_OPERATOR_PLATFORM_COMPONENT_DRAFT } from "../types/oauth-admin-types";
import {
  canSubmitOperationalResource,
  canSubmitOperatorPlatform,
  canSubmitPolicy,
  canSubmitResourceAccount,
  canSubmitResourceAuthorization,
  canSubmitTenantBinding,
  templateMessage,
} from "../utils/oauth-admin-utils";
import { useSdkworkIamOauthAdminMessages } from "../i18n";
import {
  OperationalResourceList,
  OperatorPlatformResourceList,
  PolicyResourceList,
  ResourceAccountResourceList,
  ResourceAuthorizationResourceList,
  TenantBindingResourceList,
} from "./OauthAdminResourceList";
import {
  OauthAdminField,
  OauthAdminMultilineField,
  OauthAdminSelectField,
  OauthResourceDrawer,
} from "./oauth-admin-ui";
import type { SdkworkIamOauthAdminSectionProps } from "../types/oauth-admin-types";

const EMPTY_POLICY_DRAFT = (): SdkworkIamOauthPolicyDraft => ({
  displayName: "",
  integrationId: "",
  policyCode: "",
});

const EMPTY_TENANT_BINDING_DRAFT = (): SdkworkIamOauthTenantBindingDraft => ({
  bindingKind: "tenant_map",
  integrationId: "",
  providerCode: "",
});

const EMPTY_OPERATOR_PLATFORM_DRAFT = (): SdkworkIamOauthOperatorPlatformDraft => ({
  displayName: "",
  integrationId: "",
  operatorMode: "third_party",
  platformCode: "",
  providerCode: "",
  providerPlatformId: "",
});

const EMPTY_RESOURCE_ACCOUNT_DRAFT = (): SdkworkIamOauthResourceAccountDraft => ({
  accessMode: "operator_managed",
  displayName: "",
  integrationId: "",
  providerAccountId: "",
  providerCode: "",
  resourceAccountCode: "",
  resourceAccountKind: "official_account",
});

const EMPTY_RESOURCE_AUTHORIZATION_DRAFT = (): SdkworkIamOauthResourceAuthorizationDraft => ({
  authorizationMode: "third_party_platform",
  integrationId: "",
  providerCode: "",
  resourceAccountId: "",
});

const EMPTY_OPERATIONAL_RESOURCE_DRAFT = (): SdkworkIamOauthOperationalResourceDraft => ({
  displayName: "",
  integrationId: "",
  providerCode: "",
  resourceAccountId: "",
  resourceCode: "",
  resourceKind: "mini_program_page",
});

export function OauthPolicySection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  policies,
  status,
}: SdkworkIamOauthAdminSectionProps & { policies: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthPolicyDraft>(EMPTY_POLICY_DRAFT);
  return (
    <SettingsSection description={messages.policies.description} title={messages.policies.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.policies.listLabelTemplate, { count: String(policies.length) })}
        </Label>
        <PolicyResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.policies.emptyLabel}
          onChanged={onChanged}
          policies={policies}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitPolicy(draft)}
        confirmLabel={messages.policies.addButton}
        confirmLoading={status === "saving"}
        description={messages.policies.addDescription}
        onConfirm={() => {
          void controller.createPolicy(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_POLICY_DRAFT());
        }}
        triggerLabel={messages.policies.addTrigger}
      >
        <OauthAdminField
          label={messages.policies.fields.policyCode}
          onChange={(policyCode) => setDraft((current) => ({ ...current, policyCode }))}
          placeholder={messages.policies.fields.policyCodePlaceholder}
          value={draft.policyCode}
        />
        <OauthAdminField
          label={messages.policies.fields.displayName}
          onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          placeholder={messages.policies.fields.displayNamePlaceholder}
          value={draft.displayName}
        />
        <OauthAdminField
          label={messages.policies.fields.integrationId}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          placeholder={messages.policies.fields.integrationIdPlaceholder}
          value={draft.integrationId}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}

export function OauthTenantBindingSection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  status,
  tenantBindings,
}: SdkworkIamOauthAdminSectionProps & { tenantBindings: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthTenantBindingDraft>(EMPTY_TENANT_BINDING_DRAFT);
  return (
    <SettingsSection description={messages.tenantBindings.description} title={messages.tenantBindings.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.tenantBindings.listLabelTemplate, { count: String(tenantBindings.length) })}
        </Label>
        <TenantBindingResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.tenantBindings.emptyLabel}
          onChanged={onChanged}
          tenantBindings={tenantBindings}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitTenantBinding(draft)}
        confirmLabel={messages.tenantBindings.addButton}
        confirmLoading={status === "saving"}
        description={messages.tenantBindings.addDescription}
        onConfirm={() => {
          void controller.createTenantBinding(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_TENANT_BINDING_DRAFT());
        }}
        triggerLabel={messages.tenantBindings.addTrigger}
      >
        <OauthAdminField
          label={messages.tenantBindings.providerCodeLabel}
          onChange={(providerCode) => setDraft((current) => ({ ...current, providerCode }))}
          value={draft.providerCode}
        />
        <OauthAdminField
          label={messages.tenantBindings.integrationIdLabel}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          value={draft.integrationId}
        />
        <OauthAdminField
          label={messages.tenantBindings.bindingKindLabel}
          onChange={(bindingKind) => setDraft((current) => ({ ...current, bindingKind }))}
          value={draft.bindingKind}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}

export function OauthOperatorPlatformSection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  operatorPlatforms,
  status,
}: SdkworkIamOauthAdminSectionProps & { operatorPlatforms: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthOperatorPlatformDraft>(EMPTY_OPERATOR_PLATFORM_DRAFT);
  return (
    <SettingsSection description={messages.operatorPlatforms.description} title={messages.operatorPlatforms.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.operatorPlatforms.listLabelTemplate, { count: String(operatorPlatforms.length) })}
        </Label>
        <OperatorPlatformResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.operatorPlatforms.emptyLabel}
          onChanged={onChanged}
          operatorPlatforms={operatorPlatforms}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitOperatorPlatform(draft)}
        confirmLabel={messages.operatorPlatforms.addButton}
        confirmLoading={status === "saving"}
        description={messages.operatorPlatforms.addDescription}
        onConfirm={() => {
          void controller.createOperatorPlatform(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_OPERATOR_PLATFORM_DRAFT());
        }}
        triggerLabel={messages.operatorPlatforms.addTrigger}
      >
        <OauthAdminField
          label={messages.operatorPlatforms.fields.integrationId}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          value={draft.integrationId}
        />
        <OauthAdminField
          label={messages.operatorPlatforms.fields.providerCode}
          onChange={(providerCode) => setDraft((current) => ({ ...current, providerCode }))}
          value={draft.providerCode}
        />
        <OauthAdminField
          label={messages.operatorPlatforms.fields.platformCode}
          onChange={(platformCode) => setDraft((current) => ({ ...current, platformCode }))}
          value={draft.platformCode}
        />
        <OauthAdminField
          label={messages.operatorPlatforms.fields.providerPlatformId}
          onChange={(providerPlatformId) => setDraft((current) => ({ ...current, providerPlatformId }))}
          value={draft.providerPlatformId}
        />
        <OauthAdminField
          label={messages.operatorPlatforms.fields.operatorMode}
          onChange={(operatorMode) => setDraft((current) => ({ ...current, operatorMode }))}
          value={draft.operatorMode}
        />
        <OauthAdminField
          label={messages.operatorPlatforms.fields.displayName}
          onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          value={draft.displayName}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}

export function OauthOperatorPlatformOnboardingSection({
  controller,
  disabled,
}: SdkworkIamOauthAdminSectionProps) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [operatorPlatformId, setOperatorPlatformId] = useState("");
  const [draft, setDraft] = useState<SdkworkIamOauthOperatorPlatformComponentDraft>(
    EMPTY_OPERATOR_PLATFORM_COMPONENT_DRAFT,
  );
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>();
  const [copied, setCopied] = useState(false);

  const authorizationUrl = (() => {
    if (!result) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(result);
      if (parsed === null || typeof parsed !== "object") {
        return undefined;
      }
      const envelope = parsed as Record<string, unknown>;
      const item =
        (envelope.data as Record<string, unknown> | undefined)?.item ?? envelope.item;
      if (item === null || typeof item !== "object") {
        return undefined;
      }
      const candidate = item as Record<string, unknown>;
      const url = candidate.authorizationUrl ?? candidate.url ?? candidate.authorizeUrl;
      return typeof url === "string" && url.startsWith("https://") ? url : undefined;
    } catch {
      return undefined;
    }
  })();

  const platformReady = operatorPlatformId.trim().length > 0;
  const canSave =
    platformReady &&
    draft.componentAppId.trim().length > 0 &&
    draft.componentAppSecret.trim().length > 0 &&
    draft.encodingAesKey.trim().length > 0 &&
    draft.authorizationCallbackUrl.trim().length > 0;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setResult(undefined);
    try {
      const value = await action();
      setResult(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection
      description={messages.operatorPlatforms.onboarding.description}
      title={messages.operatorPlatforms.onboarding.title}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.platformId}
          onChange={setOperatorPlatformId}
          value={operatorPlatformId}
        />
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.componentAppId}
          onChange={(componentAppId) =>
            setDraft((current) => ({ ...current, componentAppId }))
          }
          value={draft.componentAppId}
        />
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.componentAppSecret}
          onChange={(componentAppSecret) =>
            setDraft((current) => ({ ...current, componentAppSecret }))
          }
          type="password"
          value={draft.componentAppSecret}
        />
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.encodingAesKey}
          onChange={(encodingAesKey) =>
            setDraft((current) => ({ ...current, encodingAesKey }))
          }
          type="password"
          value={draft.encodingAesKey}
        />
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.callbackToken}
          onChange={(callbackToken) =>
            setDraft((current) => ({ ...current, callbackToken }))
          }
          type="password"
          value={draft.callbackToken}
        />
        <OauthAdminField
          disabled={disabled}
          label={messages.operatorPlatforms.onboarding.authorizationCallbackUrl}
          onChange={(authorizationCallbackUrl) =>
            setDraft((current) => ({ ...current, authorizationCallbackUrl }))
          }
          type="url"
          value={draft.authorizationCallbackUrl}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled || busy || !canSave}
          onClick={() =>
            void run(() =>
              controller.saveOperatorPlatformComponentCredentials(operatorPlatformId, draft),
            )
          }
        >
          {messages.operatorPlatforms.onboarding.save}
        </Button>
        <Button
          disabled={disabled || busy || !platformReady}
          onClick={() => void run(() => controller.runOperatorPlatformConnectivityCheck(operatorPlatformId))}
          variant="outline"
        >
          {messages.operatorPlatforms.onboarding.check}
        </Button>
        <Button
          disabled={disabled || busy || !platformReady}
          onClick={() => void run(() => controller.runOperatorPlatformPreAuthorization(operatorPlatformId))}
          variant="outline"
        >
          {messages.operatorPlatforms.onboarding.generateAuthorization}
        </Button>
      </div>
      {busy ? (
        <p className="text-xs text-slate-500">{messages.operatorPlatforms.onboarding.checking}</p>
      ) : null}
      {result ? (
        <div className="space-y-1">
          <Label>{messages.operatorPlatforms.onboarding.resultLabel}</Label>
          {authorizationUrl ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                className="text-sm underline"
                href={authorizationUrl}
                rel="noreferrer"
                target="_blank"
              >
                {messages.operatorPlatforms.onboarding.openAuthorization}
              </a>
              <Button
                onClick={() => {
                  void navigator.clipboard
                    .writeText(authorizationUrl)
                    .then(() => setCopied(true))
                    .catch(() => setCopied(false));
                }}
                variant="outline"
              >
                {copied
                  ? messages.operatorPlatforms.onboarding.copied
                  : messages.operatorPlatforms.onboarding.copyAuthorization}
              </Button>
            </div>
          ) : null}
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/5 p-3 text-xs">
            {result}
          </pre>
        </div>
      ) : null}
    </SettingsSection>
  );
}

export function OauthAuthorizerCapabilitySection({
  controller,
  disabled,
}: SdkworkIamOauthAdminSectionProps) {
  const messages = useSdkworkIamOauthAdminMessages();
  const capabilityMessages = messages.authorizerCapabilities;
  const [authorizationId, setAuthorizationId] = useState("");
  const [capability, setCapability] = useState("official_account.menu.publish");
  const [payload, setPayload] = useState("{}");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>();

  const options = [
    { label: capabilityMessages.capabilities.oaMenuPublish, value: "official_account.menu.publish" },
    { label: capabilityMessages.capabilities.oaMenuRetrieve, value: "official_account.menu.retrieve" },
    { label: capabilityMessages.capabilities.mpCodeCommit, value: "mini_program.code.commit" },
    { label: capabilityMessages.capabilities.mpAuditSubmit, value: "mini_program.audit.submit" },
    { label: capabilityMessages.capabilities.mpAuditStatus, value: "mini_program.audit.status" },
    { label: capabilityMessages.capabilities.mpRelease, value: "mini_program.release" },
    { label: capabilityMessages.capabilities.mpRollback, value: "mini_program.rollback" },
    { label: capabilityMessages.capabilities.mpGrayRelease, value: "mini_program.gray_release" },
    { label: capabilityMessages.capabilities.mpDomainsModify, value: "mini_program.domains.modify" },
    { label: capabilityMessages.capabilities.mpPrivacySet, value: "mini_program.privacy.set" },
  ];

  const invoke = async () => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload.trim() || "{}");
    } catch {
      setResult(capabilityMessages.payloadInvalid);
      return;
    }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      setResult(capabilityMessages.payloadInvalid);
      return;
    }
    if (!authorizationId.trim()) {
      return;
    }
    setBusy(true);
    setResult(undefined);
    try {
      const value = await controller.invokeResourceAuthorizationCapability(
        authorizationId,
        capability,
        parsed as Record<string, unknown>,
      );
      setResult(typeof value === "string" ? value : JSON.stringify(value, null, 2));
    } catch (error) {
      setResult(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsSection description={capabilityMessages.description} title={capabilityMessages.title}>
      <div className="grid gap-3 md:grid-cols-2">
        <OauthAdminField
          disabled={disabled}
          label={capabilityMessages.authorizationId}
          onChange={setAuthorizationId}
          value={authorizationId}
        />
        <OauthAdminSelectField
          disabled={disabled}
          label={capabilityMessages.capability}
          onChange={setCapability}
          options={options}
          value={capability}
        />
      </div>
      <OauthAdminMultilineField
        label={capabilityMessages.payload}
        onChange={setPayload}
        placeholder="{}"
        value={payload}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={disabled || busy || !authorizationId.trim()}
          onClick={() => void invoke()}
        >
          {capabilityMessages.invoke}
        </Button>
        {busy ? (
          <span className="text-xs text-slate-500">{capabilityMessages.invoking}</span>
        ) : null}
      </div>
      {result ? (
        <div className="space-y-1">
          <Label>{capabilityMessages.result}</Label>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-slate-950/5 p-3 text-xs">
            {result}
          </pre>
        </div>
      ) : null}
    </SettingsSection>
  );
}

export function OauthResourceAccountSection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  resourceAccounts,
  status,
}: SdkworkIamOauthAdminSectionProps & { resourceAccounts: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthResourceAccountDraft>(EMPTY_RESOURCE_ACCOUNT_DRAFT);
  return (
    <SettingsSection description={messages.resourceAccounts.description} title={messages.resourceAccounts.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.resourceAccounts.listLabelTemplate, { count: String(resourceAccounts.length) })}
        </Label>
        <ResourceAccountResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.resourceAccounts.emptyLabel}
          onChanged={onChanged}
          resourceAccounts={resourceAccounts}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitResourceAccount(draft)}
        confirmLabel={messages.resourceAccounts.addButton}
        confirmLoading={status === "saving"}
        description={messages.resourceAccounts.addDescription}
        onConfirm={() => {
          void controller.createResourceAccount(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_RESOURCE_ACCOUNT_DRAFT());
        }}
        triggerLabel={messages.resourceAccounts.addTrigger}
      >
        <OauthAdminField
          label={messages.resourceAccounts.fields.integrationId}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          value={draft.integrationId}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.providerCode}
          onChange={(providerCode) => setDraft((current) => ({ ...current, providerCode }))}
          value={draft.providerCode}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.resourceAccountCode}
          onChange={(resourceAccountCode) => setDraft((current) => ({ ...current, resourceAccountCode }))}
          value={draft.resourceAccountCode}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.resourceAccountKind}
          onChange={(resourceAccountKind) => setDraft((current) => ({ ...current, resourceAccountKind }))}
          value={draft.resourceAccountKind}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.displayName}
          onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          value={draft.displayName}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.providerAccountId}
          onChange={(providerAccountId) => setDraft((current) => ({ ...current, providerAccountId }))}
          value={draft.providerAccountId}
        />
        <OauthAdminField
          label={messages.resourceAccounts.fields.accessMode}
          onChange={(accessMode) => setDraft((current) => ({ ...current, accessMode }))}
          value={draft.accessMode}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}

export function OauthResourceAuthorizationSection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  resourceAuthorizations,
  status,
}: SdkworkIamOauthAdminSectionProps & { resourceAuthorizations: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthResourceAuthorizationDraft>(EMPTY_RESOURCE_AUTHORIZATION_DRAFT);
  return (
    <SettingsSection description={messages.resourceAuthorizations.description} title={messages.resourceAuthorizations.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.resourceAuthorizations.listLabelTemplate, { count: String(resourceAuthorizations.length) })}
        </Label>
        <ResourceAuthorizationResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.resourceAuthorizations.emptyLabel}
          onChanged={onChanged}
          resourceAuthorizations={resourceAuthorizations}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitResourceAuthorization(draft)}
        confirmLabel={messages.resourceAuthorizations.addButton}
        confirmLoading={status === "saving"}
        description={messages.resourceAuthorizations.addDescription}
        onConfirm={() => {
          void controller.createResourceAuthorization(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_RESOURCE_AUTHORIZATION_DRAFT());
        }}
        triggerLabel={messages.resourceAuthorizations.addTrigger}
      >
        <OauthAdminField
          label={messages.resourceAuthorizations.fields.integrationId}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          value={draft.integrationId}
        />
        <OauthAdminField
          label={messages.resourceAuthorizations.fields.resourceAccountId}
          onChange={(resourceAccountId) => setDraft((current) => ({ ...current, resourceAccountId }))}
          value={draft.resourceAccountId}
        />
        <OauthAdminField
          label={messages.resourceAuthorizations.fields.providerCode}
          onChange={(providerCode) => setDraft((current) => ({ ...current, providerCode }))}
          value={draft.providerCode}
        />
        <OauthAdminField
          label={messages.resourceAuthorizations.fields.authorizationMode}
          onChange={(authorizationMode) => setDraft((current) => ({ ...current, authorizationMode }))}
          value={draft.authorizationMode}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}

export function OauthOperationalResourceSection({
  controller,
  disabled,
  listPageInfo,
  onChanged,
  operationalResources,
  status,
}: SdkworkIamOauthAdminSectionProps & { operationalResources: unknown[] }) {
  const messages = useSdkworkIamOauthAdminMessages();
  const [draft, setDraft] = useState<SdkworkIamOauthOperationalResourceDraft>(EMPTY_OPERATIONAL_RESOURCE_DRAFT);
  return (
    <SettingsSection description={messages.operationalResources.description} title={messages.operationalResources.title}>
      <div className="space-y-3">
        <Label>
          {templateMessage(messages.operationalResources.listLabelTemplate, { count: String(operationalResources.length) })}
        </Label>
        <OperationalResourceList
          controller={controller}
          listPageInfo={listPageInfo}
          disabled={disabled}
          emptyLabel={messages.operationalResources.emptyLabel}
          onChanged={onChanged}
          operationalResources={operationalResources}
        />
      </div>
      <OauthResourceDrawer
        confirmDisabled={disabled || !canSubmitOperationalResource(draft)}
        confirmLabel={messages.operationalResources.addButton}
        confirmLoading={status === "saving"}
        description={messages.operationalResources.addDescription}
        onConfirm={() => {
          void controller.createOperationalResource(draft).then(onChanged).catch(onChanged);
          setDraft(EMPTY_OPERATIONAL_RESOURCE_DRAFT());
        }}
        triggerLabel={messages.operationalResources.addTrigger}
      >
        <OauthAdminField
          label={messages.operationalResources.fields.integrationId}
          onChange={(integrationId) => setDraft((current) => ({ ...current, integrationId }))}
          value={draft.integrationId}
        />
        <OauthAdminField
          label={messages.operationalResources.fields.resourceAccountId}
          onChange={(resourceAccountId) => setDraft((current) => ({ ...current, resourceAccountId }))}
          value={draft.resourceAccountId}
        />
        <OauthAdminField
          label={messages.operationalResources.fields.providerCode}
          onChange={(providerCode) => setDraft((current) => ({ ...current, providerCode }))}
          value={draft.providerCode}
        />
        <OauthAdminField
          label={messages.operationalResources.fields.resourceKind}
          onChange={(resourceKind) => setDraft((current) => ({ ...current, resourceKind }))}
          value={draft.resourceKind}
        />
        <OauthAdminField
          label={messages.operationalResources.fields.resourceCode}
          onChange={(resourceCode) => setDraft((current) => ({ ...current, resourceCode }))}
          value={draft.resourceCode}
        />
        <OauthAdminField
          label={messages.operationalResources.fields.displayName}
          onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          value={draft.displayName}
        />
      </OauthResourceDrawer>
    </SettingsSection>
  );
}
