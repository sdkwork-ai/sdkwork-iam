import {
  DEFAULT_MINI_PROGRAM_PAGE_SIZE,
  type MiniProgramAccount,
  type MiniProgramDraft,
  type MiniProgramLoginCheckResult,
  type MiniProgramPage,
  type MiniProgramPatch,
  type MiniProgramQuery,
} from "./types";

/**
 * Mini-program account controller: the one state machine every host shares.
 *
 * It is the mini-program member of the IAM resource-account component family.
 * The official-account package carries its own controller for the same reason —
 * the two features share the aggregate row and the architecture, never a page
 * or a state machine.
 */

/** The narrow face a host adapts (operator backend or self-service app API). */
export interface MiniProgramTransport {
  list(query?: MiniProgramQuery): Promise<MiniProgramPage>;
  create(draft: MiniProgramDraft): Promise<MiniProgramAccount>;
  update(miniProgramId: string, patch: MiniProgramPatch): Promise<MiniProgramAccount>;
  delete(miniProgramId: string): Promise<void>;
  setEnabled(miniProgramId: string, enabled: boolean): Promise<void>;
  /** Login/credential diagnostic; absent when the host cannot run one. */
  runLoginCheck?(miniProgramId: string): Promise<MiniProgramLoginCheckResult>;
}

/** What this mount may do. Capabilities gate both UI and controller calls. */
export interface MiniProgramCapabilities {
  mode: "operator" | "self-service";
  /** AppID/AppSecret entry. */
  editCredentials: boolean;
  /** Run the login/credential diagnostic. */
  runLoginCheck: boolean;
  /** Enable/disable the account. */
  setEnabled: boolean;
  /** Remove the account. */
  deleteAccount: boolean;
}

/** Operator posture: the backend admin surface maintains tenant rows. */
export const DEFAULT_OPERATOR_CAPABILITIES: MiniProgramCapabilities = {
  mode: "operator",
  editCredentials: true,
  runLoginCheck: true,
  setEnabled: true,
  deleteAccount: true,
};

/** Self-service posture: the caller maintains only its own rows. */
export const DEFAULT_SELF_SERVICE_CAPABILITIES: MiniProgramCapabilities = {
  mode: "self-service",
  editCredentials: true,
  runLoginCheck: false,
  setEnabled: true,
  deleteAccount: true,
};

/** Raised when a controller call is outside the mounted capability set. */
export class MiniProgramCapabilityError extends Error {
  constructor(readonly capability: keyof MiniProgramCapabilities) {
    super(`mini-program capability disabled on this surface: ${capability}`);
    this.name = "MiniProgramCapabilityError";
  }
}

/** Raised when the transport cannot serve a call the capability allowed. */
export class MiniProgramUnsupportedError extends Error {
  constructor(readonly operation: string) {
    super(`mini-program transport does not implement: ${operation}`);
    this.name = "MiniProgramUnsupportedError";
  }
}

/** Observable list state. */
export interface MiniProgramState {
  status: "idle" | "loading" | "ready" | "error";
  items: readonly MiniProgramAccount[];
  totalItems: number;
  page: number;
  pageSize: number;
  query: string;
  error?: string;
}

/** The controller every mini-program surface drives. */
export class MiniProgramController {
  private state: MiniProgramState = {
    status: "idle",
    items: [],
    totalItems: 0,
    page: 1,
    pageSize: DEFAULT_MINI_PROGRAM_PAGE_SIZE,
    query: "",
  };

  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly transport: MiniProgramTransport,
    private readonly capabilities: MiniProgramCapabilities = DEFAULT_OPERATOR_CAPABILITIES,
  ) {}

  getState = (): MiniProgramState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  async load(query: MiniProgramQuery = {}): Promise<void> {
    const next: MiniProgramQuery = {
      page: query.page ?? this.state.page,
      pageSize: query.pageSize ?? this.state.pageSize,
      q: query.q ?? this.state.query,
    };
    this.patch({ status: "loading", error: undefined, query: next.q ?? "" });
    try {
      const page = await this.transport.list(next);
      this.patch({
        status: "ready",
        items: page.items,
        totalItems: page.totalItems,
        page: page.page,
        pageSize: page.pageSize,
      });
    } catch (error) {
      this.patch({ status: "error", error: messageOf(error) });
    }
  }

  async create(draft: MiniProgramDraft): Promise<MiniProgramAccount> {
    this.assertCapability("editCredentials");
    const created = await this.transport.create(draft);
    await this.load();
    return created;
  }

  async update(miniProgramId: string, patch: MiniProgramPatch): Promise<MiniProgramAccount> {
    if (patch.appSecret !== undefined) this.assertCapability("editCredentials");
    const updated = await this.transport.update(miniProgramId, patch);
    await this.load();
    return updated;
  }

  async remove(miniProgramId: string): Promise<void> {
    this.assertCapability("deleteAccount");
    await this.transport.delete(miniProgramId);
    await this.load();
  }

  async setEnabled(miniProgramId: string, enabled: boolean): Promise<void> {
    this.assertCapability("setEnabled");
    await this.transport.setEnabled(miniProgramId, enabled);
    await this.load();
  }

  async runLoginCheck(miniProgramId: string): Promise<MiniProgramLoginCheckResult> {
    this.assertCapability("runLoginCheck");
    const run = this.transport.runLoginCheck;
    if (run === undefined) throw new MiniProgramUnsupportedError("runLoginCheck");
    const result = await run.call(this.transport, miniProgramId);
    await this.load();
    return result;
  }

  private assertCapability(capability: keyof MiniProgramCapabilities): void {
    if (this.capabilities[capability] !== true) {
      throw new MiniProgramCapabilityError(capability);
    }
  }

  private patch(patch: Partial<MiniProgramState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of [...this.listeners]) listener();
  }
}

/** Build the controller for one transport + capability set. */
export function createMiniProgramController(
  transport: MiniProgramTransport,
  capabilities?: MiniProgramCapabilities,
): MiniProgramController {
  return new MiniProgramController(transport, capabilities);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
