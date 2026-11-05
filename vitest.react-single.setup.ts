/**
 * Force every CJS `react` / `react-dom` resolution in the test worker to the
 * workspace copy.
 *
 * Linked workspace packages (sdkwork-ui, sdkwork-appbase, sdkwork-core) keep
 * their own `node_modules` links, which can point at another checkout's pnpm
 * store. Two React instances then break hooks/context even though the source
 * imports the same bare specifier. Resolving the runtime packages to this
 * workspace's copy keeps the component and the test renderer on one instance.
 */
import Module from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = path.dirname(fileURLToPath(import.meta.url));
const modules = path.join(workspaceRoot, "node_modules");
const moduleWithResolver = Module as unknown as {
  _resolveFilename: (
    request: string,
    parent: unknown,
    isMain: boolean,
    options?: unknown,
  ) => string;
};
const originalResolveFilename = moduleWithResolver._resolveFilename;

moduleWithResolver._resolveFilename = function resolveSingleReact(
  request,
  parent,
  isMain,
  options,
) {
  if (
    request === "react"
    || request === "react-dom"
    || request.startsWith("react/")
    || request.startsWith("react-dom/")
  ) {
    try {
      return originalResolveFilename.call(
        this,
        path.join(modules, request),
        parent,
        isMain,
        options,
      );
    } catch {
      // Fall through to the normal resolver for optional subpaths.
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
