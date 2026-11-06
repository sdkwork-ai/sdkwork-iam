# @sdkwork/iam-pc-admin-tenant

Reusable tenant foundation for appbase PC React applications.

This package is intentionally transport-free. It consumes `SdkworkIamService` from `@sdkwork/iam-service`, so host applications can switch between SaaS Java, private Java/Rust, local Rust, or app-specific generated SDKs without changing tenant UI/controller code.

## Standard Surface

- `createSdkworkIamTenantController(serviceOrInput)`
- `listTenants(params)`
- `listTenantMembers(tenantId, params)`
- `listTenantApplications(tenantId, params)`
- `retrieveTenantApplicationSummary(tenantId)`
- `provisionTenantApplication(tenantId, draft)`
- `updateTenantApplication(tenantId, tenantApplicationId, draft)`
- `setTenantApplicationEnabled(tenantId, tenantApplicationId, enabled)`
- `selectTenant(tenantId)`
- `getSelectedTenant()`
- `getState()`

Protected calls are delegated to the common IAM service and use the canonical dual-token model:

- `Authorization: Bearer <auth_token>`
- `Access-Token: <access_token>`

This package must not create raw HTTP clients, manually assemble headers, or import a concrete generated SDK.

## Tenant Profile And Logo Upload

The create/edit tenant drawer renders the shared `DriveUploadImage` field from `sdkwork-drive-pc-upload-image` as a single placeholder upload area. There is no image-URL input, no second pick button, and no local data-URL fallback.

- The host injects `driveUploadImageService` (built with `createDriveUploadImageService` from its own declared upload intent). The Cloud Router host declares the `admin-tenant-logo` slot in `apps/sdkwork-cloudrouter-pc/specs/upload.declaration.json`.
- Edit mode uploads immediately against the tenant id.
- Create mode parks the pick inside the field's controller and flushes it through `uploadPending({ appResourceId })` after `createTenant` returns, then attaches the returned media resource with a follow-up update (`DRIVE_SPEC.md` section 18.3). A failed attach keeps the drawer on the created record's edit view so the retry cannot duplicate the tenant.
- Saving is disabled while an upload is in flight, so the stored record cannot race the new logo value.
- Without the injected service the field renders a disabled placeholder and an explanatory hint; it never falls back to a URL input.

## Tenant Drawer Contract

- Basic information: logo, name, code, and (edit only) lifecycle status.
- Tenant profile: industry category and a 200-character description.
- Contact details: phone, email, and address.
- Name and code are both required because the backend create handler rejects a request that omits either; the drawer validates them before calling the controller and keeps validation in sync after the first submit attempt.
- The edit status selector offers the registered `IAM_SPEC.md` lifecycle set: `active`, `suspended`, `disabled`, and `terminated`.
- Nullable profile values travel as an explicit empty string when cleared, and removing the stored logo travels as an explicit `logo: null` patch; the backend clears the corresponding column instead of silently ignoring the removal.

Tenant application administration uses the authenticated operator methods under
`service.iam.tenantApplications.management`. Global application-template registration and
bootstrap credential issuance remain server/CLI bootstrap responsibilities and are never exposed
through this browser package.

## SDKWork Documentation Contract

Domain: iam
Capability: iam-tenant
Package type: react-package
Status: standard

### Public API

Public exports are declared in `specs/component.spec.json` under `contracts.publicExports`.

### Required SDK Surface

- None declared in `specs/component.spec.json`.

### Configuration

Configuration keys and runtime entrypoints are declared in `specs/component.spec.json`.

### SaaS/Private/Local Behavior

This module follows the canonical standards linked from `specs/component.spec.json`, including deployment and runtime configuration rules where applicable.

### Security

Do not add secrets, live tokens, manual auth headers, or app-local credential handling to this module.

### Extension Points

Extension points are limited to declared public exports, runtime entrypoints, SDK clients, events, and config keys.

### Verification

- `pnpm --filter @sdkwork/iam-pc-admin-tenant typecheck`

### Owner And Status

Owner and lifecycle status are tracked in `specs/component.spec.json`.
