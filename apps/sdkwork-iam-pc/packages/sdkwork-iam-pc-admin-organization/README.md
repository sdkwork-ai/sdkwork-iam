# @sdkwork/iam-pc-admin-organization

Reusable backend-admin organization and department-structure capability for SDKWork PC applications.

The package exposes organization directory and organization-structure workspaces over the common `SdkworkIamService`. It centralizes organization and department trees, organization memberships, department assignments, positions, role bindings, pagination state, and selected organization context while keeping the generated IAM backend SDK injected by the host application.

## Standard Surface

- `createSdkworkIamOrganizationController(serviceOrInput)`
- `SdkworkIamOrganizationAdminWorkspace`
- `SdkworkIamOrganizationStructureWorkspace`
- `listOrganizations(params)`
- `buildOrganizationTree(organizations?)`
- `selectOrganization(organizationId)`
- `listDepartments(organizationId, params)`
- `buildDepartmentTree(departments?)`
- `createDepartment(body)` / `updateDepartment(departmentId, body)` / `deleteDepartment(departmentId)`
- `listMemberships(organizationId, params)`
- `addMembership(organizationId, body)`
- `listDepartmentAssignments(departmentId, params)`
- `createDepartmentAssignment(body)` / `updateDepartmentAssignment(assignmentId, body)`
- `getState()`

This package must not create raw HTTP clients, manually assemble auth headers, or import a concrete generated SDK.

## Organization Logo Upload

The create/edit drawer renders the shared `DriveUploadImage` field from `sdkwork-drive-pc-upload-image` as a single placeholder upload area. There is no image-URL input, no second pick button, and no local data-URL fallback.

- The host injects `driveUploadImageService` (built with `createDriveUploadImageService` from its own declared upload intent). The Cloud Router host declares the `admin-organization-logo` slot in `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json`.
- Edit mode uploads immediately against the organization id.
- Create mode parks the pick inside the field's controller and flushes it through `uploadPending({ appResourceId })` after `createOrganization` returns, then attaches the returned media resource with a follow-up update (`DRIVE_SPEC.md` section 18.3). A failed attach keeps the drawer on the created record's edit view so the retry cannot duplicate the organization.
- Saving is disabled while an upload is in flight, so the stored record cannot race the new logo value.
- Without the injected service the field renders a disabled placeholder and an explanatory hint; it never falls back to a URL input.

## Create Drawer Contract

- Basic information: logo, name, code, organization type, and (edit only) lifecycle status.
- Organization profile: category, industry, parent organization, and a 200-character description.
- Contact details: phone, email, and address.
- Name and code are both required because the backend create handler rejects a request that omits either; the drawer validates them before calling the controller and keeps validation in sync after the first submit attempt.
- The parent picker loads the whole tenant hierarchy (page size 200) and excludes the organization itself and its descendants, which the closure rebuild would reject.

## Organization Structure Route

The host-owned route is declared by `IAM_PC_ADMIN_ORGANIZATION_ROUTES.structurePath`:

```text
/admin/iam/organizations/:organizationId/structure
```

The route requires `iam.organizations.read`, `iam.departments.read`, and `iam.assignments.read` in `all` mode. Department controls use the exact create, update, and delete permissions; assignment controls use the available create and update permissions.

Department assignment removal is intentionally unavailable. The IAM permission catalog contains the reserved `iam.assignments.deactivate` permission, but the current backend OpenAPI and composed SDK expose no matching deactivate or delete operation.

## SDKWork Documentation Contract

Domain: iam
Capability: iam-organization
Package type: react-package
Status: standard

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- `@sdkwork/iam-backend-sdk`, consumed through the injected `SdkworkIamService` backend-admin boundary declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/iam-pc-admin-organization typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
