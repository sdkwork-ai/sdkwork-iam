/**
 * Admin organization tree (`admin.iam.organization.tree`, path `/admin/iam/organizations`).
 *
 * The whole tenant tree on one screen. The tree arrives flattened with a depth, so a
 * row's place is shown by indentation and the reading order is the tree's own order —
 * an operator scanning it can see which unit a sub-unit belongs to without expanding
 * anything.
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

import { useIamH5AdminOrganizationMessages } from "../i18n/index.js";
import type {
  SdkworkIamH5AdminOrganizationController,
  SdkworkIamH5AdminOrganizationNode,
} from "../types/admin-organization-types.js";

/** Props of {@link SdkworkIamH5AdminOrganizationScreen}. */
export interface SdkworkIamH5AdminOrganizationScreenProps {
  controller: SdkworkIamH5AdminOrganizationController;
  /** Back handler; omitted when the host renders this as a root tab. */
  onBack?: () => void;
}

/** Indentation of one level, in characters. */
const INDENT = "— ";

/** The admin organization tree screen. */
export function SdkworkIamH5AdminOrganizationScreen({
  controller,
  onBack,
}: SdkworkIamH5AdminOrganizationScreenProps): ReactElement {
  const messages = useIamH5AdminOrganizationMessages();
  const tree = useSdkworkIamH5Resource(useCallback(() => controller.loadTree(), [controller]));

  const label = (node: SdkworkIamH5AdminOrganizationNode): string =>
    `${INDENT.repeat(node.depth)}${node.name}`;

  return (
    <SdkworkIamH5Screen {...(onBack ? { onBack } : {})} title={messages.tree.title}>
      <SdkworkIamH5Card title={messages.tree.treeSection}>
        {tree.status === "loading" && !tree.data ? (
          <SdkworkIamH5LoadingState label={messages.tree.loading} />
        ) : null}
        {tree.status === "error" ? (
          <SdkworkIamH5Notice tone="danger">{messages.errors.tree}</SdkworkIamH5Notice>
        ) : null}
        {tree.data !== undefined && tree.data.length === 0 ? (
          <SdkworkIamH5Notice>{messages.tree.emptyTree}</SdkworkIamH5Notice>
        ) : null}
        {tree.data !== undefined && tree.data.length > 0 ? (
          <SdkworkIamH5KeyValueList
            items={tree.data.map((node) => ({ label: label(node), value: node.id }))}
          />
        ) : null}
      </SdkworkIamH5Card>
    </SdkworkIamH5Screen>
  );
}
