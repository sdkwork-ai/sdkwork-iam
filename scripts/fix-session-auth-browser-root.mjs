import fs from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Sibling repositories are resolved through the shared checkout root, which is
// two levels above this script, instead of a hardcoded drive path.
const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

const paths = [
  resolve(WORKSPACE_ROOT, "sdkwork-games/apps/sdkwork-games-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-skills/apps/sdkwork-skills-pc/src/main.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-notary/apps/sdkwork-notary-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-documents/apps/sdkwork-documents-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-dezhou/apps/sdkwork-dezhou-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-gameengine/apps/sdkwork-gameengine-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-knowledgebase/apps/sdkwork-knowledgebase-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-mall/apps/sdkwork-mall-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-im/apps/sdkwork-im-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-rtc/apps/sdkwork-rtc-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-mail/apps/sdkwork-mail-pc/src/App.tsx"),
  resolve(WORKSPACE_ROOT, "sdkwork-drive/apps/sdkwork-drive-pc/src/main.tsx"),
];

for (const file of paths) {
  let content = fs.readFileSync(file, "utf8");
  content = content.replace(/`n/g, "\n");
  content = content.replace(
    /(import \{ SdkworkSessionAuthBrowserRoot \} from '@sdkwork\/auth-pc-react';\n)+/g,
    "import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';\n",
  );
  fs.writeFileSync(file, content);
  console.log("fixed", file);
}
