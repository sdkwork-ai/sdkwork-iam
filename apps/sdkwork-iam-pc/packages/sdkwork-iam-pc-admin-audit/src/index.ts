export * from "./types/audit-admin-types";
export { createSdkworkIamAuditController } from "./services/audit-admin-controller";
export { SdkworkIamAuditAdminWorkspace } from "./pages/AuditAdminWorkspace";
export { IAM_PC_ADMIN_AUDIT_ROUTES } from "./routes/audit-admin-routes";
// The page resolves its copy through `useSdkworkModuleMessages`, so the host
// must be able to register the catalog (`SDKWORK_IAM_AUDIT_ADMIN_I18N_CATALOG`)
// with its i18n provider; without it the page falls back to the catalog's
// default locale.
export * from "./i18n";
