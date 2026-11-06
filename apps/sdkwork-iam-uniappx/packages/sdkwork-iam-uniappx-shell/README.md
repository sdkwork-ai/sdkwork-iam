# @sdkwork/iam-uniappx-shell

Account shell surface for the SDKWork IAM uni-app x root.

Authority: `UNIAPP_X_APP_ARCHITECTURE_SPEC.md` §3, §5, §11.

## Owns

- `AccountHeader.uvue`: signed-in identity header.
- `AccountMenu.uvue`: account actions (account center, tenant, sign out). It
  emits events; it never constructs SDK clients or calls services.
- `createIamShellRoutes()`: route composition input for the root
  `pages.json` projection.

## Must not own

Login/session state, SDK construction, host platform calls, or business services.
