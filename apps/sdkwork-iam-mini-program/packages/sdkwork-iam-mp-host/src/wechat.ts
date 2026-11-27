import type { IamMpHostOutcome } from "@sdkwork/iam-mp-core";
import type { IamMpSessionStorage } from "@sdkwork/iam-mp-core/session-persistent";

export interface IamMpWechatHost {
  login(): Promise<IamMpHostOutcome<string>>;
  storage: IamMpSessionStorage;
}

function normalizeError(error: unknown): IamMpHostOutcome<string> {
  const message = error instanceof Error ? error.message : String(error);
  if (/cancel/iu.test(message)) {
    return { ok: false, error: { code: "cancelled", message } };
  }
  return { ok: false, error: { code: "unavailable", message } };
}

export function createIamMpWechatHost(): IamMpWechatHost {
  const memoryStorage = new Map<string, string>();
  return {
    async login() {
      if (typeof wx === "undefined") {
        return { ok: false, error: { code: "unsupported", message: "WeChat login is unavailable" } };
      }
      try {
        const result = await wx.login({ timeout: 10000 });
        const code = typeof result.code === "string" ? result.code.trim() : "";
        if (!code) {
          return { ok: false, error: { code: "invalid-state", message: "WeChat login returned no code" } };
        }
        return { ok: true, value: code };
      } catch (error) {
        return normalizeError(error);
      }
    },
    storage: {
      get(key) {
        if (typeof wx !== "undefined") {
          try {
            const value = wx.getStorageSync(key);
            if (typeof value === "string") return value;
          } catch {
            // Fall through to the in-memory copy when platform storage fails.
          }
        }
        return memoryStorage.get(key) ?? null;
      },
      remove(key) {
        memoryStorage.delete(key);
        if (typeof wx === "undefined") return;
        try {
          wx.removeStorageSync(key);
        } catch {
          // The in-memory session is still cleared when platform storage fails.
        }
      },
      set(key, value) {
        memoryStorage.set(key, value);
        if (typeof wx === "undefined") return;
        try {
          wx.setStorageSync(key, value);
        } catch {
          // Keep the authenticated session usable when persistent storage is full.
        }
      },
    },
  };
}
