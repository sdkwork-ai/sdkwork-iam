import { afterEach } from "vitest";

// Package-local mirror of the repo-root vitest.setup.ts (the root copy
// resolves @testing-library/* from the workspace root node_modules, which is
// not installed on this Windows checkout).
if (typeof window !== "undefined" && typeof document !== "undefined") {
  await import("@testing-library/jest-dom/vitest");
  const { cleanup } = await import("@testing-library/react");

  afterEach(() => {
    cleanup();
  });

  if (!globalThis.ResizeObserver) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
  }

  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }

  if (typeof HTMLElement.prototype.hasPointerCapture !== "function") {
    HTMLElement.prototype.hasPointerCapture = () => false;
    HTMLElement.prototype.releasePointerCapture = () => {};
    HTMLElement.prototype.setPointerCapture = () => {};
  }
}
