/**
 * Builds the IAM mini program runtime and the platform page manifest.
 *
 * Authority: `MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md` sections 5 and 6.
 *
 * Two artifacts come from one source of truth, plus one invariant:
 *
 * 1. `src/runtime/iam-app.js` — an esbuild bundle of `src/bootstrap/runtimeBundle.ts`.
 *    The WeChat runtime loads plain CommonJS while the packages are TypeScript, so
 *    pages require this bundle and never a workspace package. The bundle is
 *    committed so DevTools can open the project without a build step.
 * 2. `src/app.json` — `pages` and `subPackages` are DERIVED from the route
 *    contributions, intersected with the pages this build actually ships. The
 *    manifest can therefore never name a page the package does not contain, which
 *    is exactly the state this root was in before: twenty-six declared pages and
 *    zero page files.
 *
 * The invariant: every page the projection emits must exist on disk as
 * `index.js` + `index.wxml` + `index.json`, and `src/app.json` must not list a page
 * outside the projection. A missing file is a hard failure with the path named,
 * not a manifest that only breaks inside DevTools.
 *
 * Usage:
 *   node scripts/build-runtime.mjs
 *   node scripts/build-runtime.mjs --deployment-profile cloud --environment staging
 */

import * as esbuild from "esbuild";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const scriptsRoot = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptsRoot, "..");

const DEPLOYMENT_PROFILES = ["standalone", "cloud"];
const ENVIRONMENTS = ["development", "test", "staging", "demo", "production"];
const RUNTIME_TARGET = "mini-program";

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    "deployment-profile": { type: "string", default: "standalone" },
    environment: { type: "string", default: "development" },
  },
  strict: true,
});

const deploymentProfile = values["deployment-profile"];
const environment = values.environment;
if (!DEPLOYMENT_PROFILES.includes(deploymentProfile)) {
  throw new Error(`--deployment-profile must be one of ${DEPLOYMENT_PROFILES.join(", ")}`);
}
if (!ENVIRONMENTS.includes(environment)) {
  throw new Error(`--environment must be one of ${ENVIRONMENTS.join(", ")}`);
}

const profileId = `${deploymentProfile}.${environment}`;
const runtimeConfigPath = path.join(appRoot, "config", "mini-program", `runtime-env.${profileId}.json`);
if (!existsSync(runtimeConfigPath)) {
  throw new Error(
    `Mini program runtime profile does not exist: ${runtimeConfigPath}. ` +
      "Run `pnpm workflow:materialize-client-env` from the repository root to materialize it.",
  );
}

/**
 * Reads the materialized profile and proves it is the profile that was asked for.
 * A bundle built from a stale profile points at the wrong gateway while every key
 * still looks well-formed, which is the one failure invisible from the app.
 */
const runtimeConfig = JSON.parse(readFileSync(runtimeConfigPath, "utf8"));
for (const [key, expected] of Object.entries({
  SDKWORK_DEPLOYMENT_PROFILE: deploymentProfile,
  SDKWORK_ENVIRONMENT: environment,
  SDKWORK_PROFILE_ID: profileId,
  SDKWORK_RUNTIME_TARGET: RUNTIME_TARGET,
})) {
  if (runtimeConfig[key] !== expected) {
    throw new Error(
      `${runtimeConfigPath} must declare ${key}=${JSON.stringify(expected)}; ` +
        `received ${JSON.stringify(runtimeConfig[key] ?? null)}`,
    );
  }
}

const runtimeDir = path.join(appRoot, "src", "runtime");
mkdirSync(runtimeDir, { recursive: true });
const bundlePath = path.join(runtimeDir, "iam-app.js");

await esbuild.build({
  bundle: true,
  entryPoints: [path.join(appRoot, "src", "bootstrap", "runtimeBundle.ts")],
  format: "cjs",
  legalComments: "none",
  logLevel: "info",
  outfile: bundlePath,
  platform: "browser",
  // ES2020 rather than ES2019: the bundled decimal helper uses BigInt literals,
  // which es2019 cannot represent. WeChat's current base libraries run ES2020.
  target: "es2020",
});

/**
 * Loads the bundle that was just written.
 *
 * Loading the built artifact (instead of importing the TypeScript a second time)
 * derives the manifest from exactly the code that ships, so a bundling failure
 * cannot leave `app.json` describing a route set the bundle does not contain.
 */
function loadRuntimeBundle(file) {
  const source = readFileSync(file, "utf8");
  if (source.length < 5_000) {
    throw new Error(`Runtime bundle looks truncated (${source.length} bytes): ${file}`);
  }
  const loaded = { exports: {} };
  const factory = new Function("module", "exports", "require", source);
  factory(loaded, loaded.exports, (specifier) => {
    throw new Error(`Runtime bundle must be self-contained but required ${JSON.stringify(specifier)}`);
  });
  return loaded.exports;
}

const runtime = loadRuntimeBundle(bundlePath);
for (const exportName of ["composeIamMpAppJson", "IAM_MP_IMPLEMENTED_ROUTE_IDS", "resolveIamMpMessage"]) {
  if (runtime[exportName] === undefined) {
    throw new Error(`Runtime bundle must export ${exportName}`);
  }
}

const composition = runtime.composeIamMpAppJson();
const appJsonPath = path.join(appRoot, "src", "app.json");
if (!existsSync(appJsonPath)) {
  throw new Error(`src/app.json must exist: it pins the static window settings (${appJsonPath})`);
}
const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));

// Every page the build claims must exist. Naming the missing file here is the
// difference between a five-second build error and a DevTools project that will
// not open. Subpackage pages live under `<root>/<pagePath>`, so the check has to
// reconstruct that physical path rather than assuming a main-package layout.
const REQUIRED_PAGE_FILES = ["index.js", "index.json", "index.wxml"];
const physicalPages = [
  ...composition.pages,
  ...composition.subPackages.flatMap((subpackage) =>
    subpackage.pages.map((page) => `${subpackage.root}/${page}`),
  ),
];
const missing = [];
for (const page of physicalPages) {
  for (const file of REQUIRED_PAGE_FILES) {
    const expected = path.join(appRoot, "src", path.dirname(page), file);
    if (!existsSync(expected)) missing.push(path.relative(appRoot, expected));
  }
}
if (missing.length > 0) {
  throw new Error(
    `The projection emits pages without files:\n  ${missing.join("\n  ")}\n` +
      "Implement the page or remove its route id from IAM_MP_IMPLEMENTED_ROUTE_IDS.",
  );
}

const nextAppJson = {
  ...appJson,
  pages: composition.pages,
  subPackages: composition.subPackages.map((subpackage) => ({
    pages: subpackage.pages,
    root: subpackage.root,
  })),
};
writeFileSync(appJsonPath, `${JSON.stringify(nextAppJson, null, 2)}\n`, "utf8");

writeFileSync(
  path.join(runtimeDir, "runtime-env.js"),
  `module.exports = ${JSON.stringify(runtimeConfig, null, 2)};\n`,
  "utf8",
);

writeFileSync(
  path.join(runtimeDir, "build-manifest.json"),
  `${JSON.stringify(
    {
      appJson: {
        pages: nextAppJson.pages.length,
        subPackages: nextAppJson.subPackages.length,
      },
      appKey: "sdkwork-iam-mini-program",
      bundle: "src/runtime/iam-app.js",
      deploymentProfile,
      environment,
      platform: "MP_WEIXIN",
      profileId,
      runtimeTarget: RUNTIME_TARGET,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(
  `IAM mini program built: ${profileId} (${nextAppJson.pages.length} main page(s), ` +
    `${nextAppJson.subPackages.length} subpackage(s))`,
);
