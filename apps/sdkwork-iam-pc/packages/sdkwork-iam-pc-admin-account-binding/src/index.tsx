export * from "./types/account-binding-admin-types";
export { createSdkworkIamAccountBindingController } from "./services/account-binding-admin-controller";
export { SdkworkIamAccountBindingSettings } from "./pages/AccountBindingAdminSettings";
export { IAM_PC_ADMIN_ACCOUNT_BINDING_ROUTES } from "./routes/account-binding-admin-routes";
// The settings page resolves its copy through `useSdkworkModuleMessages`, so
// the host must be able to register
// `SDKWORK_IAM_ACCOUNT_BINDING_ADMIN_I18N_CATALOG` with its i18n provider.
export * from "./i18n";
