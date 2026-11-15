// SDKWORK-CLIENT-APP-SURFACES-GENERATED: do not edit by hand; regenerate with `node scripts/materialize-client-app-surfaces.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createSdkworkPublicApplicationAccessTokenVitePlugin } from '@sdkwork/iam-credential-entry/vite';
import { defineConfig, loadEnv } from 'vite';

const appRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Read the committed dotenv document of one deployment profile.
 *
 * The canonical dev/build runners pass the profile id ('standalone.development',
 * 'cloud.production', ...) as Vite mode, so '.env.<profile-id>' is the profile
 * this renderer serves (APP_ACCESS_TOKEN_SPEC.md section 2). Its shape is the
 * plain 'KEY=value' matrix the canonical materializer writes.
 * @param mode - Vite mode, which is the profile id on every canonical path.
 * @returns the profile's dotenv entries, or an empty record when it is absent.
 */
function readProfileDotenv(mode: string): Record<string, string> {
  const profilePath = path.join(appRoot, '.env.' + mode);
  if (!fs.existsSync(profilePath)) return {};
  const entries: Record<string, string> = {};
  for (const line of fs.readFileSync(profilePath, 'utf8').split('\n')) {
    const separator = line.indexOf('=');
    if (separator <= 0 || line.startsWith('#')) continue;
    entries[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return entries;
}

export default defineConfig(({ mode }) => {
  // The committed profile document is the authority for the public application
  // access token. loadEnv cannot be the only reader: it lets a launching
  // process.env value win over the file, and the build runner exports a private
  // development bootstrap token under the same SDKWORK_ACCESS_TOKEN key. A valid
  // public token from the launching environment stays an accepted override; the
  // plugin rejects every other value.
  const profileEnv = readProfileDotenv(mode);
  const env = loadEnv(mode, appRoot, '');
  const environment = (profileEnv.VITE_SDKWORK_ENVIRONMENT ?? env.VITE_SDKWORK_ENVIRONMENT ?? '').trim();
  const profileId = (profileEnv.VITE_SDKWORK_PROFILE_ID ?? env.VITE_SDKWORK_PROFILE_ID ?? mode).trim();

  return {
    plugins: [
      // The committed public application access token is the only credential a
      // renderer carries before login. The plugin validates it and throws during
      // config resolution when the selected profile's token is missing or is not
      // public material, so no dev server or build starts credential-free
      // (IAM_CREDENTIAL_ENTRY_SPEC.md section 4).
      createSdkworkPublicApplicationAccessTokenVitePlugin({
        accessToken: profileEnv.SDKWORK_ACCESS_TOKEN ?? env.SDKWORK_ACCESS_TOKEN,
        applicationId: 'sdkwork-iam',
        environment,
        profileId,
      }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
