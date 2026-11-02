/**
 * WeChat mini program entry.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` section 6. This file is plain
 * CommonJS because the WeChat runtime loads it directly; everything it depends on
 * is bundled into `src/runtime/iam-app.js` by `scripts/build-runtime.mjs`, and the
 * materialized profile is `src/runtime/runtime-env.js`.
 *
 * Launch flow: bootstrap (runtime -> SDK client -> session bridge), then choose the
 * first page. The first entry in `app.json#pages` is the login page because before
 * the session is known it is the only page that displays no protected data; an
 * authenticated launch is moved to the tenant overview within the same launch.
 */

const {
  IAM_MP_PAGE_PATHS,
  bootstrapIamMpApp,
} = require("./runtime/iam-app");
const runtimeEnv = require("./runtime/runtime-env");

App({
  globalData: {
    profileId: runtimeEnv.SDKWORK_PROFILE_ID,
    runtimeError: null,
    runtimeReady: false,
  },

  onLaunch() {
    bootstrapIamMpApp({ runtimeEnv })
      .then((runtime) => {
        this.globalData.runtimeReady = true;
        this.globalData.profileId = runtime.environment.SDKWORK_PROFILE_ID;
        const target = runtime.auth.isAuthenticated()
          ? IAM_MP_PAGE_PATHS.tenantOverview
          : IAM_MP_PAGE_PATHS.login;
        wx.reLaunch({ url: `/${target}` });
      })
      .catch((error) => {
        // A bootstrap failure must still land the user on the login page: a white
        // screen is undiagnosable, and the login page surfaces the reason through
        // `runtimeError`.
        this.globalData.runtimeError = error && error.message ? error.message : String(error);
        wx.reLaunch({ url: `/${IAM_MP_PAGE_PATHS.login}` });
      });
  },
});
