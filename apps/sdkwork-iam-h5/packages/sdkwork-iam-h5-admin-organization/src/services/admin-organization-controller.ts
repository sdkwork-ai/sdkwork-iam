// SDKWORK-IAM-H5-ADMIN-ORGANIZATION: authored controller.
/**
 * Admin organization tree controller over the injected IAM service.
 *
 * The endpoint answers the whole tree at once (there is no paged variant), so this is a
 * single read plus a flatten. The flatten is depth-first and keeps the server's order
 * within a level, which is what makes the indentation on screen match the tree.
 */

import type {
  CreateSdkworkIamH5AdminOrganizationControllerInput,
  SdkworkIamH5AdminOrganizationController,
  SdkworkIamH5AdminOrganizationNode,
  SdkworkIamH5AdminOrganizationServicePort,
} from "../types/admin-organization-types.js";

/**
 * Build the admin organization tree controller.
 * @param input - the injected service port, or the bare port for convenience.
 * @returns the controller the screen binds to.
 */
export function createSdkworkIamH5AdminOrganizationController(
  input:
    | SdkworkIamH5AdminOrganizationServicePort
    | CreateSdkworkIamH5AdminOrganizationControllerInput,
): SdkworkIamH5AdminOrganizationController {
  const service = "service" in input ? input.service : input;

  return {
    async loadTree() {
      const answer = await service.iam.organizations.tree.retrieve();
      const record = toRecord(answer);
      // The endpoint may answer under `item`, under `items`, or with the roots directly;
      // accepting all three keeps a contract wobble from emptying the whole screen.
      const roots = toNodeArray(record.item) ?? toNodeArray(record.items) ?? toNodeArray(answer) ?? [];
      return flatten(roots);
    },
  };
}

interface RawNode {
  readonly children: readonly RawNode[];
  readonly id: string;
  readonly name: string;
}

function toRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function toNodeArray(value: unknown): readonly RawNode[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((entry) => {
    const node = toNode(entry);
    return node === undefined ? [] : [node];
  });
}

function toNode(value: unknown): RawNode | undefined {
  const record = toRecord(value);
  const id =
    readString(record.organizationId) ?? readString(record.organization_id) ?? readString(record.id);
  // A node without an identity cannot be placed or opened, so it is dropped together with
  // its subtree rather than shifted to the wrong depth.
  if (!id) return undefined;
  const children = toNodeArray(record.children) ?? toNodeArray(record.nodes) ?? [];
  return {
    children,
    id,
    name: readString(record.name) ?? readString(record.displayName) ?? id,
  };
}

function flatten(roots: readonly RawNode[]): readonly SdkworkIamH5AdminOrganizationNode[] {
  const out: SdkworkIamH5AdminOrganizationNode[] = [];
  const walk = (nodes: readonly RawNode[], depth: number): void => {
    for (const node of nodes) {
      out.push({ depth, id: node.id, name: node.name });
      walk(node.children, depth + 1);
    }
  };
  walk(roots, 0);
  return out;
}
