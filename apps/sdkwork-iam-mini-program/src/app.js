// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
const { resolveBootstrapRoutes } = require('./bootstrap/routes');

App({
  onLaunch() {
    this.globalData = { routes: resolveBootstrapRoutes() };
  },
});
