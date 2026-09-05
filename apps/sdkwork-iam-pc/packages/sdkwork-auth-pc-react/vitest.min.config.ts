import path from "node:path";
import { defineConfig } from "vitest/config";

const uiPcReactSrc = "E:/sdkwork-space/sdkwork-ui/sdkwork-ui-pc-react/src";

// Minimal local config so the parity regression test can run on a Windows
// checkout where the repo-root vitest.config.ts cannot resolve
// @vitejs/plugin-react (partial node_modules). No React plugin needed:
// esbuild transforms TSX via the package tsconfig.
export default defineConfig({
  resolve: {
    alias: {
      "@sdkwork/ui-pc-react": uiPcReactSrc,
    },
  },
  test: {
    environment: "jsdom",
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    setupFiles: ["./vitest.min.setup.ts"],
  },
});
