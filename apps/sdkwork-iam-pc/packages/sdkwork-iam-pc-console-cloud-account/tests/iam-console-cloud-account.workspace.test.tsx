import { SdkworkI18nProvider } from "@sdkwork/i18n-pc-react";
import { SdkworkThemeProvider } from "@sdkwork/ui-pc-react/theme";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  IAM_CLOUD_ACCOUNT_SCOPE_TENANT,
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  type IamCloudAccountScopeLevel,
} from "@sdkwork/iam-contracts";

import {
  SDKWORK_IAM_CLOUD_ACCOUNT_CONSOLE_I18N_CATALOG,
  SdkworkIamCloudAccountCredentialWriteError,
  SdkworkIamConsoleCloudAccountWorkspace,
} from "../src/index";
import {
  RegionCombobox,
  regionCompletionIndex,
  regionNameFor,
  type RegionComboboxProps,
} from "../src/components/RegionCombobox";
import type {
  SdkworkIamConsoleCloudAccountController,
  SdkworkIamConsoleCloudAccountCredentialRecord,
  SdkworkIamConsoleCloudAccountRecord,
} from "../src/index";
import { sdkworkIamCloudAccountConsoleMessages as zhMessages } from "../src/i18n/zh-CN/iam/cloud-account/workspace";

/**
 * The page is the product surface the whole capability exists for, so these cases
 * assert what a reviewer would look at rather than what the controller does:
 *
 * - the copy comes from the catalog (the page used to hard-code English);
 * - accounts are a **table**, with the ownership column appearing only where the
 *   host projected more than one level;
 * - a single projected level draws **no level control at all** — that is the
 *   console's whole shape, not a tab strip with one tab in it;
 * - an account's detail is a **dialog**, not a second section under the table:
 *   it holds a second table, so as a section it pushed the page past the
 *   console's content pane, which does not scroll;
 * - the credential write form has a **dialog of its own** rather than being the
 *   detail's last block, where its fields fell outside the body's visible window;
 *   its kind picker offers **every** kind the contract defines, and its one-secret
 *   field is named after the kind it is asking for;
 * - registering happens in a **modal**, and deleting asks for confirmation,
 *   instead of the page carrying a permanent form and an immediate delete;
 * - capability is **not the operator's to choose**: the register form does not put
 *   the field on the wire at all, and editing carries a narrowed account's list
 *   through untouched rather than clearing it;
 * - the server's **closed vocabularies are translated**, so no `aliyun` /
 *   `production` / `long_term_key` reaches the interface, while the identifiers
 *   the operator authored stay verbatim;
 * - region is a **provider-scoped combobox**: its candidates follow the selected
 *   provider, an unlisted value survives being typed, and a region the new
 *   provider does not publish is dropped rather than carried across. A chosen
 *   region can also be **removed in one gesture**, because the alternative is
 *   emptying it a character at a time. It shows the
 *   provider's **name** for its value while it is at rest and the code itself
 *   while it is being edited, so what is on screen is what is being submitted.
 *
 * A render test cannot see hook *order*, so it is not evidence against the
 * "rendered fewer hooks" class of defect; it is evidence about output.
 */
function accountItem(
  overrides: Partial<SdkworkIamConsoleCloudAccountRecord> = {},
): SdkworkIamConsoleCloudAccountRecord {
  return {
    accountCode: "prod-storage",
    capabilityCodes: ["object_storage"],
    credentialConfigured: true,
    credentialCount: 2,
    displayName: "生产对象存储",
    environment: "production",
    id: "acct-1",
    isDefault: true,
    regionCode: "cn-hangzhou",
    scopeType: "user",
    status: "active",
    vendorCode: "aliyun",
    ...overrides,
  };
}

function credentialItem(
  overrides: Partial<SdkworkIamConsoleCloudAccountCredentialRecord> = {},
): SdkworkIamConsoleCloudAccountCredentialRecord {
  return {
    credentialKind: "access_key_pair",
    credentialName: "default",
    id: "cred-1",
    maskedLabel: "LTAI****1234",
    providerAccountId: "acct-1",
    status: "active",
    ...overrides,
  };
}

function controllerStub(accounts: readonly SdkworkIamConsoleCloudAccountRecord[] = [accountItem()], credentials: readonly SdkworkIamConsoleCloudAccountCredentialRecord[] = []) {
  /**
   * The live rows, held apart from `state` on purpose.
   *
   * Every read hands back a **fresh array**, the way the real controller does
   * (`getState` copies). A test that drops a row mid-flight has to produce a new
   * value, otherwise React sees the same array identity, skips the re-render, and
   * the page looks unchanged for a reason that has nothing to do with the page.
   */
  const rows: SdkworkIamConsoleCloudAccountRecord[] = [...accounts];
  const credentialRows: SdkworkIamConsoleCloudAccountCredentialRecord[] = [...credentials];
  const state = {
    accounts: rows,
    credentials: credentialRows,
    listPageInfo: undefined,
    status: "ready" as const,
  };
  const calls = {
    createAccount: vi.fn(async () => rows[0] as SdkworkIamConsoleCloudAccountRecord),
    /**
     * The write the credential form performs.
     *
     * It was missing from this stub while the form lived inside the detail, so the
     * submit path was never executed by any test — the form could not be reached in
     * a browser either, and neither gap was visible from the other.
     */
    createCredential: vi.fn(async () => undefined),
    deleteAccount: vi.fn(async () => undefined),
    listCredentials: vi.fn(async () => [...credentialRows]),
    listScopeAccounts: vi.fn(async () => [...rows]),
    revokeCredential: vi.fn(async () => undefined),
    setDefaultAccount: vi.fn(async () => rows[0]),
    updateAccount: vi.fn(async () => rows[0]),
  };
  const controller = {
    getState: () => ({ ...state, accounts: [...rows], credentials: [...state.credentials] }),
    ...calls,
  } as unknown as SdkworkIamConsoleCloudAccountController;
  return { calls, controller, rows };
}

function renderWorkspace(options: {
  accounts?: readonly SdkworkIamConsoleCloudAccountRecord[];
  credentials?: readonly SdkworkIamConsoleCloudAccountCredentialRecord[];
  levels?: readonly IamCloudAccountScopeLevel[];
  surface?: "admin" | "console";
} = {}) {
  const { calls, controller, rows } = controllerStub(options.accounts, options.credentials);
  const result = render(
    <SdkworkThemeProvider defaultTheme="light">
      <SdkworkI18nProvider
        catalogs={[SDKWORK_IAM_CLOUD_ACCOUNT_CONSOLE_I18N_CATALOG]}
        locale="zh-CN"
      >
        <SdkworkIamConsoleCloudAccountWorkspace
          controller={controller}
          manageableScopeLevels={options.levels}
          surface={options.surface}
        />
      </SdkworkI18nProvider>
    </SdkworkThemeProvider>,
  );
  return { ...result, calls, rows };
}

/**
 * The `Select` that is currently showing `value`.
 *
 * Located by the value it renders rather than by its accessible name, because a
 * Radix trigger takes no name from its contents — every trigger in a form would
 * match a role query, and the first one is not a stable identity as the form
 * grows.
 */
/**
 * Open a Radix `Select` and read its options *without* choosing one.
 *
 * `pickSelectOption` below picks and closes; this is for the question "what is
 * offered", which is a different assertion from "what happened when I chose".
 */
async function openSelectOptions(trigger: HTMLElement): Promise<string[]> {
  trigger.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
  }));
  await screen.findByRole("listbox");
  return screen.getAllByRole("option").map((option) => option.textContent?.trim() ?? "");
}

/** Open the account dialog's credential form, which is where the key is written. */
async function openCredentialForm(table: HTMLElement): Promise<HTMLElement> {
  fireEvent.click(within(table).getByRole("button", { name: "详情" }));
  fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "添加凭据" }));
  await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
  return screen.getByRole("dialog");
}

function selectShowing(container: HTMLElement, value: string): HTMLElement {
  const trigger = Array.from(
    container.querySelectorAll<HTMLElement>('[data-slot="select-trigger"]'),
  ).find((node) => node.textContent?.trim() === value);
  if (!trigger) {
    throw new Error(`no select trigger is showing "${value}"`);
  }
  return trigger;
}

/**
 * Open a Radix `Select` and pick one of its options, then let the gesture finish.
 *
 * A **native** `PointerEvent` is required: `fireEvent.pointerDown` builds an
 * event with no `pointerType` in jsdom, which never takes Radix's
 * mouse-pointerdown opening path, so the panel would stay shut and the option
 * would never be found.
 *
 * The trailing flush is not tidiness. Radix's dismissable layer arms a
 * **deferred** dismissal when a left-button pointer-down lands outside an open
 * layer (`deferPointerDownOutside`, which `Popover` sets): it does not dismiss on
 * the spot, it registers a one-shot `click` listener *and* schedules the
 * dispatch from a `setTimeout(…, 0)` on the capture path. So a pointer-down on a
 * provider `Select` while the region list is open leaves a dismissal in flight
 * that lands a **macrotask later** — after the caller has moved on to typing,
 * which then silently loses the list it just opened. Yielding a macrotask here
 * makes the helper mean what it says: when a selection returns, the gesture is
 * over.
 */
async function pickSelectOption(trigger: HTMLElement, optionName: string) {
  trigger.dispatchEvent(new PointerEvent("pointerdown", {
    bubbles: true,
    button: 0,
    cancelable: true,
    pointerId: 1,
    pointerType: "mouse",
  }));
  fireEvent.click(await screen.findByRole("option", { name: optionName }));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * The region's name as the field paints it while the field is at rest, or `null`.
 *
 * Read through the field's own marker rather than by text: the open list offers
 * the same names as its options, and those are portalled outside the field, so a
 * text query could match the wrong node.
 */
function regionNameShown(region: HTMLElement): string | null {
  const layer = region
    .closest('[data-slot="cloud-account-region"]')
    ?.querySelector('[data-slot="cloud-account-region-name"]');
  return layer?.textContent ?? null;
}

/** The clear control of the field, or null when the field offers none. */
function regionClearShown(region: HTMLElement): HTMLElement | null {
  return region
    .closest('[data-slot="cloud-account-region"]')
    ?.querySelector('[data-slot="cloud-account-region-clear"]') ?? null;
}

/** A bare region field, for the invariants that are about the control itself. */
function renderRegionField(overrides: Partial<RegionComboboxProps> = {}) {
  const onChange = vi.fn();
  const props: RegionComboboxProps = {
    clearLabel: "清除地域",
    emptyText: "该服务商没有匹配的地域",
    hint: "候选来自当前服务商",
    label: "地域",
    onChange,
    options: ["cn-hangzhou", "cn-shanghai"],
    placeholder: "选择或输入地域标识",
    resolveLabel: (code) => (code === "cn-hangzhou" ? "华东1（杭州）" : code),
    value: "",
    ...overrides,
  };
  const view = render(<RegionCombobox {...props} />);
  const field = screen.getByRole("combobox", { name: props.label }) as HTMLInputElement;
  return { ...view, field, onChange, props };
}

describe("@sdkwork/iam-pc-console-cloud-account workspace", () => {
  it("draws its copy from the catalog instead of hard-coding one language", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    // Both are zh-CN-only strings: their presence proves the catalog is what the
    // page renders, which is the defect an English-only page could not pass.
    expect(await screen.findByText("云账号")).toBeTruthy();
    expect(screen.getByRole("button", { name: "新建账号" })).toBeTruthy();
  });

  it("renders the accounts as a table with the agreed columns", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    expect(await screen.findByRole("table")).toBeTruthy();
    for (const header of ["显示名称", "服务商", "账号标识", "环境", "状态", "默认", "凭据"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    const table = screen.getByRole("table");
    // Scoped to the table: the page's own listing is the only table mounted until
    // an account's detail is opened, but scoping keeps this case about the listing.
    expect(within(table).getByText("生产对象存储")).toBeTruthy();
    // The credential column reports the two facts a listing exposes, never a secret.
    expect(within(table).getByText("已配置 2 条")).toBeTruthy();
  });

  it("keeps the ownership column for the level-filtered admin view only", async () => {
    const consoleView = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");
    // Every row of the console listing is the caller's own, so the column would be a
    // fact about the page rather than about the row.
    expect(screen.queryByRole("columnheader", { name: "归属级别" })).toBeNull();
    consoleView.unmount();

    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER, IAM_CLOUD_ACCOUNT_SCOPE_TENANT] });
    await screen.findByRole("table");
    expect(screen.getByRole("columnheader", { name: "归属级别" })).toBeTruthy();
  });

  it("draws no level control when the host projected a single level", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    await screen.findByRole("table");
    // The console is personal-only by construction, so a tab strip with one tab on
    // it would be a control that cannot change anything.
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("offers exactly the projected levels on the admin surface and re-pins the list", async () => {
    const { calls } = renderWorkspace({
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER, IAM_CLOUD_ACCOUNT_SCOPE_TENANT],
    });

    await waitFor(() => expect(screen.getAllByRole("tab")).toHaveLength(2));
    // Nothing beyond what the host projected: no fixed self-service three.
    expect(screen.queryByRole("tab", { name: "平台" })).toBeNull();
    expect(screen.getByRole("tab", { name: "个人" }).getAttribute("aria-selected")).toBe("true");

    await waitFor(() => expect(calls.listScopeAccounts).toHaveBeenCalledWith(IAM_CLOUD_ACCOUNT_SCOPE_USER));

    // Radix activates a tab on `mousedown`, not on `click`; every other Radix-tab
    // test in this workspace drives it the same way.
    fireEvent.mouseDown(screen.getByRole("tab", { name: "租户" }));

    await waitFor(() => expect(calls.listScopeAccounts).toHaveBeenCalledWith(IAM_CLOUD_ACCOUNT_SCOPE_TENANT));
  });

  it("reports the phrase the empty listing needs, in the table rather than in a bullet list", async () => {
    renderWorkspace({ accounts: [], levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    expect(await screen.findByText("还没有云账号")).toBeTruthy();
    // The old page rendered accounts as a `<ul>` of buttons; a list role anywhere
    // would mean the bullet-list shape came back.
    expect(screen.queryAllByRole("list")).toHaveLength(0);
  });

  it("draws the listing alone while there is nothing selected", async () => {
    renderWorkspace({ accounts: [], levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    expect(await screen.findByText("还没有云账号")).toBeTruthy();
    // The empty listing already says what to do, so the page stops there: one
    // section, no credential write form, and no "pick a row" guidance under the
    // table — the page used to explain the same absence a second time.
    expect(document.body.querySelectorAll('[data-slot="settings-section"]')).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "存储凭据" })).toBeNull();
    expect(screen.queryByText(/选择.*云账号/)).toBeNull();
  });

  it("keeps the selected account's detail free of a frame inside a frame", async () => {
    // Two levels on purpose: a single projected level draws no tab strip at all, so
    // the frame the panel used to add only exists on the level-filtered surface.
    renderWorkspace({
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER, IAM_CLOUD_ACCOUNT_SCOPE_TENANT],
    });
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByText("生产对象存储").closest("tr") as HTMLElement);

    // The detail is a dialog, so the page behind it is unchanged: **one** section —
    // the listing. It used to be a second section under the table, which put the
    // credential table and its write form below the fold inside a pane that does
    // not scroll, and drew the listing's framing a second time.
    const sections = [
      ...document.body.querySelectorAll<HTMLElement>('[data-slot="settings-section"]'),
    ];
    expect(sections).toHaveLength(1);
    expect(
      sections.filter((section) => section.querySelector('[data-slot="settings-section"]')),
    ).toHaveLength(0);

    // jsdom resolves no layout, so the tab panel's frame cannot be measured; what is
    // observable is that it opts out of the border, fill and shadow the primitive
    // draws by default, because the table inside already draws all three.
    const panel = document.body.querySelector<HTMLElement>('[data-slot="tabs-content"]');
    expect(panel?.className).toContain("border-0");
    expect(panel?.className).toContain("shadow-none");
  });

  it("opens the account's detail in a dialog instead of a section under the listing", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");

    // Nothing is open until the operator asks: the listing alone is the page.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "存储凭据" })).toBeNull();

    fireEvent.click(within(table).getByRole("button", { name: "详情" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("账号信息")).toBeTruthy();
    expect(within(dialog).getByText("生产对象存储")).toBeTruthy();
    // The listing's columns cannot carry these, so the detail is where they live.
    // `prod-storage` is the operator's own identifier and stays verbatim; the
    // provider is a code from a closed vocabulary and is shown as its label.
    expect(within(dialog).getByText("prod-storage")).toBeTruthy();
    expect(within(dialog).getByText("阿里云")).toBeTruthy();
    // The credentials moved in with the account rather than staying on the page:
    // the detail carries the credential list, and the write form sits one click
    // behind the group's own action.
    expect(within(dialog).getByRole("button", { name: "添加凭据" })).toBeTruthy();
    // The form itself is deliberately *not* in this dialog. As its last block the
    // key fields fell outside the body's visible window — measured, not guessed —
    // and a field that cannot be reached reads as a field that cannot be filled in.
    expect(within(dialog).queryByRole("button", { name: "存储凭据" })).toBeNull();
    expect(within(dialog).queryByLabelText("凭据槽位")).toBeNull();

    // The row click is the same affordance, not a second one.
    fireEvent.click(within(dialog).getByRole("button", { name: "关闭" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    fireEvent.click(within(table).getByText("生产对象存储").closest("tr") as HTMLElement);
    expect(await screen.findByRole("dialog")).toBeTruthy();
  });

  it("opens the credential form in a dialog of its own, with every key field in it", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");

    const form = await openCredentialForm(table);

    // One dialog at a time — the detail let go before the form opened, so the
    // account is dismissed once rather than twice.
    expect(within(form).getByText("添加凭据")).toBeTruthy();
    expect(screen.queryByText("账号信息")).toBeNull();

    // Every field the access-key-pair kind needs is present. The move exists
    // because these were the last block of an 850px body inside a 710px window,
    // which put the session token under the dialog's footer and the submit button
    // below the panel entirely.
    //
    // The two key fields are labelled in the **provider's** own words — the
    // fixture account is Alibaba Cloud's, so they read `AccessKey ID` /
    // `AccessKey Secret` rather than a neutral phrase. An operator copies both
    // values straight off the provider's console, and a generic label is how a
    // value ends up in the other box.
    for (const label of ["凭据槽位", "AccessKey ID", "AccessKey Secret", "会话令牌"]) {
      expect(within(form).getByLabelText(label)).toBeTruthy();
    }
    expect(selectShowing(form, "访问密钥对")).toBeTruthy();
    expect(within(form).getByRole("button", { name: "存储凭据" })).toBeTruthy();

    // And the listing never grows a secret field of its own.
    expect(within(table).queryByLabelText("AccessKey Secret")).toBeNull();
  });

  it("asks for a key pair in the words the stored account's provider uses", async () => {
    // Tencent Cloud calls the two halves `SecretId` / `SecretKey`; Alibaba Cloud
    // calls them `AccessKey ID` / `AccessKey Secret`. Both are `access_key_pair`
    // under the contract, so only the account's provider can tell them apart —
    // and this is the case a single shared label gets wrong.
    renderWorkspace({
      accounts: [accountItem({ vendorCode: "tencent" })],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    const table = await screen.findByRole("table");
    const form = await openCredentialForm(table);

    expect(within(form).getByLabelText("SecretId")).toBeTruthy();
    expect(within(form).getByLabelText("SecretKey")).toBeTruthy();
    expect(within(form).queryByLabelText("AccessKey ID")).toBeNull();
  });

  it("offers every credential kind the contract defines, not a hand-picked subset", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");
    const form = await openCredentialForm(table);

    // The list that used to be here put three of the four kinds on screen, so
    // `service_account_json` could not be created from the console at all — and
    // because the catalog carries a label for it, nothing looked missing. Driving
    // the options off the vocabulary is what makes a fifth kind impossible to drop
    // silently.
    //
    // The words are the *account's provider's* for the three blob kinds, not the
    // platform's kind vocabulary: the name is shown in the listing, in this picker
    // and above the field the value is typed into, and a provider with a word of its
    // own must not read two ways across the three. Alibaba Cloud has no word for a
    // key document, so the neutral one shows — and it is the same neutral word the
    // field will carry, which is asserted below rather than assumed.
    expect(await openSelectOptions(selectShowing(form, "访问密钥对"))).toEqual([
      "访问密钥对",
      "Bearer 令牌",
      "服务账号 JSON 密钥",
      "密钥文本",
    ]);
  });

  it("names the single secret field with the provider's own word, never the pair's", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");
    const form = await openCredentialForm(table);

    await pickSelectOption(selectShowing(form, "访问密钥对"), "服务账号 JSON 密钥");

    // One secret, and it is named the way the account's provider names *that* kind:
    // Alibaba Cloud has no word for a key document, so the catalogue gives it the
    // neutral one — but it is the name of a key document, not the name of an opaque
    // secret. What must never happen is the field carrying the *pair's* secret half,
    // or another kind's word: that is what sends an operator looking for a value the
    // provider never issued.
    expect(within(form).getByLabelText("服务账号 JSON 密钥")).toBeTruthy();
    // And the picker now reads back the same word the box does. The two used to
    // disagree — the picker said "服务账号 JSON", the box said "服务账号 JSON 密钥" —
    // so the operator chose one name and filled in another.
    expect(selectShowing(form, "服务账号 JSON 密钥")).toBeTruthy();
    expect(within(form).queryByLabelText("密钥文本")).toBeNull();
    expect(within(form).queryByLabelText("AccessKey ID")).toBeNull();
    expect(within(form).queryByLabelText("AccessKey Secret")).toBeNull();
    // And the session token goes with the pair it belongs to. It is the proof that
    // the pair was issued, so beside a single secret it was a box the operator had to
    // leave empty — and it made two different identity shapes render as one form.
    expect(within(form).queryByLabelText("会话令牌")).toBeNull();
  });

  it("lists a stored credential under the provider's word, the same one the form collected it with", async () => {
    // The listing is the third surface that names a kind, and it was the one still
    // reading the platform's kind vocabulary while the form that wrote the row read
    // the provider's. A Google API key — typed under Google's own word for that blob —
    // came back as "密钥文本": a term the operator never chose, never saw on the way in,
    // and cannot act on. The key document came back one word shorter than the box it
    // was pasted into. Both are one defect: one row, two names.
    renderWorkspace({
      accounts: [accountItem({ accountType: "api_key", vendorCode: "google" })],
      credentials: [
        credentialItem({ credentialKind: "secret_text", id: "cred-api", maskedLabel: "AIza****7f3Q" }),
        credentialItem({ credentialKind: "access_key_pair", id: "cred-pair", maskedLabel: "GOOG****24AB" }),
      ],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    const table = await screen.findByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "详情" }));
    const detail = await screen.findByRole("dialog");
    const listing = await within(detail).findByRole("table");

    // Google's word for the blob, not the platform's — and not the pair's, either.
    expect(within(listing).getByText("API 密钥")).toBeTruthy();
    expect(within(listing).queryByText("密钥文本")).toBeNull();
    // A pair keeps the platform's name for the envelope: a pair is *two* field names,
    // so the provider has no single name to lend, and borrowing one half of it would
    // name the envelope after half of what it holds.
    expect(within(listing).getByText("访问密钥对")).toBeTruthy();
  });

  it("writes the typed key to the controller and then empties the form", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");
    const form = await openCredentialForm(table);

    fireEvent.change(within(form).getByLabelText("凭据槽位"), { target: { value: "rotation-2027" } });
    fireEvent.change(within(form).getByLabelText("AccessKey ID"), { target: { value: "LTAI-typed" } });
    fireEvent.change(within(form).getByLabelText("AccessKey Secret"), { target: { value: "secret-typed" } });
    fireEvent.change(within(form).getByLabelText("会话令牌"), { target: { value: "token-typed" } });

    // The submit button lives in `ModalFooter` and the form in `ModalBody`, so
    // pressing it is also evidence that the id association survived the move.
    fireEvent.click(within(form).getByRole("button", { name: "存储凭据" }));

    await waitFor(() => expect(calls.createCredential).toHaveBeenCalled());
    const [accountId, input] = calls.createCredential.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    // The account the *detail* was showing, carried across its own closing.
    expect(accountId).toBe("acct-1");
    expect(input).toMatchObject({
      accessKeyId: "LTAI-typed",
      credentialKind: "access_key_pair",
      credentialName: "rotation-2027",
      secretAccessKey: "secret-typed",
      sessionToken: "token-typed",
    });

    // A submitted form is a closed form. The draft is seeded on *open* as well as
    // cleared on success, so either alone keeps this true — the invariant is the
    // pair's, and it is what stops a reopened dialog from being one click away from
    // storing the same secret into a second slot.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const reopened = await openCredentialForm(table);
    expect((within(reopened).getByLabelText("凭据槽位") as HTMLInputElement).value).toBe("");
    expect((within(reopened).getByLabelText("AccessKey Secret") as HTMLInputElement).value).toBe("");
  });

  it("keeps the secret on screen when the write is refused", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");
    const form = await openCredentialForm(table);

    calls.createCredential.mockRejectedValueOnce(new Error("凭据槽位已被占用"));
    fireEvent.change(within(form).getByLabelText("凭据槽位"), { target: { value: "rotation-2027" } });
    fireEvent.change(within(form).getByLabelText("AccessKey Secret"), { target: { value: "secret-typed" } });
    fireEvent.click(within(form).getByRole("button", { name: "存储凭据" }));

    // The dialog stays up with everything still in it, so the operator can correct
    // the slot name and retry. Closing it would discard a secret they have to go
    // and fetch again from the provider.
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByText("凭据槽位已被占用")).toBeTruthy());
    const kept = screen.getByRole("dialog");
    expect((within(kept).getByLabelText("凭据槽位") as HTMLInputElement).value).toBe("rotation-2027");
    expect((within(kept).getByLabelText("AccessKey Secret") as HTMLInputElement).value).toBe("secret-typed");
  });

  it("keeps the register form standing when the write is refused", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });

    fireEvent.click(await screen.findByRole("button", { name: "新建账号" }));
    const editor = await screen.findByRole("dialog");
    calls.createAccount.mockRejectedValueOnce(new Error("账号标识已存在"));
    fireEvent.change(within(editor).getByLabelText("账号标识"), { target: { value: "prod-storage" } });
    fireEvent.change(within(editor).getByLabelText("显示名称"), { target: { value: "生产对象存储" } });
    fireEvent.click(within(editor).getByRole("button", { name: "登记账号" }));

    // The same rule as the credential dialog's: `run` settles on a refusal too, so
    // a `.then` that closed the modal threw away the form the operator had just
    // filled in — and the reason it was refused is only readable while it stands.
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByText("账号标识已存在")).toBeTruthy());
    expect(
      (within(screen.getByRole("dialog")).getByLabelText("显示名称") as HTMLInputElement).value,
    ).toBe("生产对象存储");
  });

  it("closes the detail dialog when its account disappears", async () => {
    const { calls, rows } = renderWorkspace({
      accounts: [
        accountItem(),
        accountItem({ accountCode: "prod-cdn", displayName: "生产 CDN", id: "acct-2", isDefault: false }),
      ],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    const table = await screen.findByRole("table");

    // Two rows, so index 0 is the first account's own action.
    fireEvent.click(within(table).getAllByRole("button", { name: "详情" })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("账号信息")).toBeTruthy();

    // The detail's row leaves the listing while the dialog is open — deleted
    // elsewhere, or dropped by a narrowed scope — and a row action on the other
    // account re-reads the page from the controller, which is the moment the page
    // notices. The DOM has not re-rendered yet, so index 1 is still the *other*
    // account's button. `hidden: true`: an open dialog marks the page behind it
    // `aria-hidden`, so the row buttons are in the DOM but out of the a11y tree.
    rows.splice(0, 1);
    fireEvent.click(screen.getAllByRole("button", { name: "停用", hidden: true })[1]);
    await waitFor(() => expect(calls.updateAccount).toHaveBeenCalledWith("acct-2", expect.anything()));

    // A dialog that had nothing to show would render its own empty shell; the
    // invariant is that it closes instead.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.textContent).not.toContain("账号信息");
    expect(within(screen.getByRole("table")).getByText("生产 CDN")).toBeTruthy();
  });

  it("hands the detail's account to the editor without stacking two dialogs", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByRole("button", { name: "详情" }));
    const detail = await screen.findByRole("dialog");
    fireEvent.click(within(detail).getByRole("button", { name: "编辑" }));

    // One dialog at a time, and it is the editor — holding the account the detail
    // was showing, because that is the subject the operator already chose.
    await waitFor(() => expect(screen.getAllByRole("dialog")).toHaveLength(1));
    const editor = screen.getByRole("dialog");
    expect(within(editor).getByText("编辑账号")).toBeTruthy();
    expect(within(editor).getByLabelText("显示名称")).toBeTruthy();

    fireEvent.change(within(editor).getByLabelText("显示名称"), { target: { value: "生产对象存储 v2" } });
    fireEvent.submit(editor.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(calls.updateAccount).toHaveBeenCalledWith(
      "acct-1",
      expect.objectContaining({ displayName: "生产对象存储 v2" }),
    ));
  });

  it("registers through a modal instead of a permanent form on the page", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    // The page carries no register form of its own: the only way to reach the
    // fields is the modal.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByLabelText("账号标识")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("登记云账号")).toBeTruthy();
    expect(within(dialog).getByLabelText("账号标识")).toBeTruthy();
    expect(within(dialog).getByLabelText("显示名称")).toBeTruthy();
    // The page is still mounted behind the modal. It is queried by its slot rather
    // than by role, because an open modal marks the rest of the document
    // `aria-hidden`, which takes it out of the accessibility tree on purpose.
    expect(document.querySelector('[data-slot="data-table"]')).toBeTruthy();
  });

  it("submits the modal's form through the footer button that is associated with it", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");

    fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-dns" } });
    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产 DNS" } });

    const submit = within(dialog).getByRole("button", { name: "登记账号" });
    const form = dialog.querySelector("form") as HTMLFormElement;
    // The form and its submit button are siblings inside the modal, so the
    // association is what makes the footer button able to submit at all.
    expect((submit as HTMLButtonElement).form).toBe(form);
    fireEvent.submit(form);

    await waitFor(() => expect(calls.createAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        accountCode: "prod-dns",
        displayName: "生产 DNS",
        // The console offers one level, so its form cannot widen the request: the
        // server defaults the owner from the caller on a personal account.
        scopeType: IAM_CLOUD_ACCOUNT_SCOPE_USER,
        vendorCode: "aliyun",
      }),
      // No credential was typed, so nothing is sent for one — as opposed to an
      // empty credential, which the server would have to reject. The second
      // argument is asserted explicitly: a register that silently stopped asking
      // for the credential would still pass the object match above.
      undefined,
    ));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("asks the operator for no capability when registering an account", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");

    // The capability field is a **read-only fact**, not a control: the picker this
    // replaced offered eight checkboxes, and checking one narrowed the account out
    // of every other demand — including the DNS one certificate issuance resolves
    // through — with nothing in the form saying so.
    const capabilities = dialog.querySelector<HTMLElement>(
      '[data-slot="cloud-account-capabilities"]',
    );
    expect(capabilities).toBeTruthy();
    expect(capabilities?.querySelectorAll('input, [role="checkbox"], select, button')).toHaveLength(0);
    // An account with no capability is not "none": the server reads the empty list
    // as *unspecified*, so the field says what it actually means.
    expect(within(capabilities as HTMLElement).getByText("任意能力")).toBeTruthy();

    // Only one checkbox is left in the whole register form, and it is the
    // default-account one. A regression that puts the eight capability boxes back
    // fails here with nine.
    expect(within(dialog).queryAllByRole("checkbox")).toHaveLength(1);

    fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-dns" } });
    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产 DNS" } });
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

    await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
    // The strongest form of "the console does not choose capabilities": the key is
    // not on the wire at all, so the server stores its own default rather than a
    // list the console guessed.
    const [input] = calls.createAccount.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(input).not.toHaveProperty("capabilityCodes");
  });

  /**
   * The register form asks for the account's concrete configuration.
   *
   * An account stored without a credential is not a half-finished account — it is
   * an unusable one: the row is listed, it is selectable, and resolution walks to a
   * credential that is not there. The form therefore asks for it in the same pass,
   * and the two axes that decide the fields are kept apart: the **identity shape**
   * decides which fields exist, the **provider** decides what they are called.
   *
   * Both axes are asserted separately, because a single shared label passes every
   * "the field is on screen" test while putting a Tencent Cloud `SecretId` into a
   * box marked `AccessKey ID`.
   */
  describe("registering with the account's concrete configuration", () => {
    async function openRegisterForm(): Promise<HTMLElement> {
      fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
      return screen.findByRole("dialog");
    }

    function credentialGroup(dialog: HTMLElement): HTMLElement {
      const group = dialog.querySelector<HTMLElement>(
        '[data-slot="cloud-account-create-credentials"]',
      );
      if (!group) {
        throw new Error("the register form has no credential group");
      }
      return group;
    }

    /**
     * The sentence the register form shows where a secret-less shape's fields would
     * be. Read by anchor rather than by text so the assertion can compare *which*
     * sentence is shown, not merely that some sentence matches.
     */
    function credentialReason(dialog: HTMLElement): string {
      return (
        dialog
          .querySelector<HTMLElement>('[data-slot="cloud-account-create-credential-reason"]')
          ?.textContent?.trim() ?? ""
      );
    }

    /**
     * The sentence the register form shows about the *selected* shape's boxes.
     *
     * Read by anchor for the same reason the reason is: what is being asserted is
     * which shape's wording reached the screen, and a text query could be satisfied
     * by the same sentence standing over a different shape.
     */
    function credentialShapeSentence(dialog: HTMLElement): string {
      return (
        dialog
          .querySelector<HTMLElement>('[data-slot="cloud-account-create-credential-shape"]')
          ?.textContent?.trim() ?? ""
      );
    }

    it("asks for the key pair, named the way the chosen provider names it", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      // Alibaba Cloud is the form's first provider, and a long-term key is its
      // first identity shape.
      expect(within(dialog).getByLabelText("AccessKey ID")).toBeTruthy();
      expect(within(dialog).getByLabelText("AccessKey Secret")).toBeTruthy();
      // The credential shape is *derived* from the identity shape, never chosen
      // separately: two independent pickers could record a shape the credential
      // does not have. So no kind picker is offered, and the sentence over the boxes
      // is the one *this* shape owns rather than a paragraph describing every shape.
      expect(within(dialog).queryByLabelText("凭据类型")).toBeNull();
      expect(credentialShapeSentence(dialog)).toBe(
        zhMessages.create.credentialShapeHint.long_term_key,
      );
      // Where to create it, in that provider's own terms.
      expect(within(credentialGroup(dialog)).getByText(/AccessKey 管理/)).toBeTruthy();
    });

    it("describes the shape the operator selected, not the whole family at once", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      const longTerm = credentialShapeSentence(dialog);
      expect(longTerm).toBe(zhMessages.create.credentialShapeHint.long_term_key);

      await pickSelectOption(selectShowing(dialog, "长期密钥"), "服务账号");
      const serviceAccount = credentialShapeSentence(dialog);
      // A service-account key document and an API key draw the *same* box, so the
      // only thing that can tell them apart is the sentence above it — the same rule
      // the field label already follows.
      expect(serviceAccount).toBe(zhMessages.create.credentialShapeHint.service_account);
      expect(serviceAccount).not.toBe(longTerm);

      await pickSelectOption(selectShowing(dialog, "服务账号"), "API 密钥");
      const apiKey = credentialShapeSentence(dialog);
      expect(apiKey).toBe(zhMessages.create.credentialShapeHint.api_key);
      expect(apiKey).not.toBe(serviceAccount);
      expect(apiKey).not.toBe(longTerm);
      // And the box below it is still named by the shape that chose it.
      expect(within(dialog).getByLabelText("密钥文本")).toBeTruthy();

      await pickSelectOption(selectShowing(dialog, "API 密钥"), "服务关联角色");
      // A shape that draws nothing draws no sentence about boxes either: the reason
      // stands where the sentence was.
      expect(credentialShapeSentence(dialog)).toBe("");
      expect(credentialReason(dialog)).toBe(
        zhMessages.create.credentialNotNeeded.service_linked_role,
      );
    });

    it("names the ownership level the default applies to, since that picker is not always drawn", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      // One projectable level draws no level control at all, so a sentence pointing
      // at "this level" would point at nothing on the console — the surface this page
      // is mostly mounted on. The level is named instead.
      expect(within(dialog).queryByText("归属级别")).toBeNull();
      expect(
        within(dialog).getByText(/设为该服务商在归属级别「个人」与环境下的默认账号/),
      ).toBeTruthy();
    });

    it("follows the level picker when there is one", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER, IAM_CLOUD_ACCOUNT_SCOPE_TENANT] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      expect(within(dialog).getByText("归属级别")).toBeTruthy();
      await pickSelectOption(selectShowing(dialog, "个人"), "租户");

      // The name follows the *chosen* level, not the level the form opened on: the
      // default is scoped to the account's own level, so the sentence has to move
      // with the control that decides it.
      expect(
        within(dialog).getByText(/设为该服务商在归属级别「租户」与环境下的默认账号/),
      ).toBeTruthy();
      expect(
        within(dialog).queryByText(/设为该服务商在归属级别「个人」与环境下的默认账号/),
      ).toBeNull();
    });

    it("describes the region field the way that provider's field actually behaves", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      // Alibaba Cloud publishes regions, so the field is a combobox and the hint may
      // promise a candidate list.
      expect(within(dialog).getByText(/候选地域来自所选服务商/)).toBeTruthy();

      await pickSelectOption(selectShowing(dialog, "阿里云"), "Cloudflare");

      // Cloudflare is one anycast network: no candidates exist, the same field is
      // free text, and the candidate sentence would be promising a list that does not
      // exist. The half that *is* still true — switching to this provider clears the
      // region, because `iamCloudAccountVendorAcceptsRegion` refuses every code for a
      // provider that publishes none — stays.
      expect(within(dialog).getByText(/该服务商不提供候选地域/)).toBeTruthy();
      expect(within(dialog).queryByText(/候选地域来自所选服务商/)).toBeNull();
    });

    it("re-labels both the key fields and the account id when the provider changes", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      // The account's own provider-side identifier is provider-scoped vocabulary,
      // exactly as the region candidates are: Alibaba Cloud has an account id,
      // Tencent Cloud has a root APPID.
      expect(within(dialog).getByLabelText("阿里云账号 ID")).toBeTruthy();

      await pickSelectOption(selectShowing(dialog, "阿里云"), "腾讯云");

      expect(within(dialog).getByLabelText("SecretId")).toBeTruthy();
      expect(within(dialog).getByLabelText("SecretKey")).toBeTruthy();
      expect(within(dialog).getByLabelText("腾讯云主账号 APPID")).toBeTruthy();
      // The previous provider's words are gone rather than joined by the new ones.
      expect(within(dialog).queryByLabelText("AccessKey ID")).toBeNull();
    });

    it("adds the session token only for the identity shape that has one", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      expect(within(dialog).queryByLabelText("会话令牌")).toBeNull();

      await pickSelectOption(selectShowing(dialog, "长期密钥"), "临时凭据");

      // An STS-style grant is the key pair *plus* the token that proves it was
      // issued; on a long-term key the field would be a place to paste something
      // the provider never handed out.
      expect(within(dialog).getByLabelText("会话令牌")).toBeTruthy();
      expect(within(dialog).getByLabelText("AccessKey ID")).toBeTruthy();
    });

    it("asks for one secret under a service account, and names it after the shape", async () => {
      renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      await pickSelectOption(selectShowing(dialog, "长期密钥"), "服务账号");
      // A service account is entered as a whole key document, and the field says so.
      // It is not the pair's secret half — and it is not "secret text" either: the
      // three single-secret shapes share this one box while holding different things,
      // so the word over it has to follow the shape that chose it.
      expect(within(dialog).getByLabelText("服务账号 JSON 密钥")).toBeTruthy();
      expect(within(dialog).queryByLabelText("AccessKey ID")).toBeNull();
      expect(within(dialog).queryByLabelText("会话令牌")).toBeNull();

      await pickSelectOption(selectShowing(dialog, "服务账号"), "API 密钥");

      // Same box, different thing in it, therefore a different word above it. These
      // two shapes are the pair that used to share one name.
      expect(within(dialog).getByLabelText("密钥文本")).toBeTruthy();
      expect(within(dialog).queryByLabelText("服务账号 JSON 密钥")).toBeNull();

      await pickSelectOption(selectShowing(dialog, "API 密钥"), "托管身份");

      // The three shapes that hold no secret here are empty *for three different
      // reasons*, and the reason is the only thing on screen — so it has to be the
      // reason of the shape that is selected, not one sentence for the whole family.
      // A shared sentence is wrong twice over: it tells the operator holding a SAML
      // assertion that there is nothing to configure, and it never tells the operator
      // registering a role that the role is granted on the provider's side.
      const group = credentialGroup(dialog);
      // Every label here is the picker's own word for the shape, because the
      // sentence the form shows has to use the same word the operator just chose —
      // "联邦身份" over a picker that says "联合身份" is the name/field mismatch this
      // test exists to catch, and it caught exactly that on the first run.
      const reasons: readonly (readonly [string, RegExp, RegExp])[] = [
        ["服务关联角色", /服务关联角色/, /授予/],
        ["联合身份", /联合身份/, /签发方/],
        ["托管身份", /托管身份/, /云资源/],
      ];
      const seen = new Set<string>();
      // The picker currently shows the last shape the test selected, so each move
      // starts from the one before it.
      let currentShape = "托管身份";
      for (const [label, shapeWord, actionWord] of reasons) {
        if (label !== currentShape) {
          await pickSelectOption(selectShowing(dialog, currentShape), label);
          currentShape = label;
        }
        expect(group.querySelectorAll("input")).toHaveLength(0);
        const shown = credentialReason(dialog);
        expect(shown, `no reason is shown for ${label}`).not.toBe("");
        expect(shown, `${label} does not name its own shape`).toMatch(shapeWord);
        expect(shown, `${label} does not say where to act`).toMatch(actionWord);
        // Distinct from the other two, which is what makes this per-shape.
        expect(seen.has(shown), `${label} reuses another shape's reason`).toBe(false);
        seen.add(shown);
      }
      expect(seen.size).toBe(reasons.length);
    });

    it("sends the typed pair as the credential of the account it registers", async () => {
      const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-storage" } });
      fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产对象存储" } });
      fireEvent.change(within(dialog).getByLabelText("阿里云账号 ID"), { target: { value: "1234567890" } });
      fireEvent.change(within(dialog).getByLabelText("AccessKey ID"), { target: { value: "LTAI-typed" } });
      fireEvent.change(within(dialog).getByLabelText("AccessKey Secret"), { target: { value: "secret-typed" } });
      fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

      await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
      const [input, credential] = calls.createAccount.mock.calls[0] as unknown as [
        Record<string, unknown>,
        Record<string, unknown> | undefined,
      ];
      // The account's own identifier on the provider's side is reachable from the
      // console now; the column and the `PATCH` already accepted it, and no form
      // ever asked.
      expect(input).toMatchObject({ externalAccountId: "1234567890" });
      expect(credential).toEqual({
        accessKeyId: "LTAI-typed",
        credentialKind: "access_key_pair",
        secretAccessKey: "secret-typed",
      });
    });

    it("sends only the fields the chosen shape declares, never a leftover secret", async () => {
      const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-storage" } });
      fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产对象存储" } });
      fireEvent.change(within(dialog).getByLabelText("AccessKey ID"), { target: { value: "LTAI-typed" } });
      fireEvent.change(within(dialog).getByLabelText("AccessKey Secret"), { target: { value: "secret-typed" } });

      // The operator changes their mind: the account is a managed identity, which
      // has no place for a secret at all.
      await pickSelectOption(selectShowing(dialog, "长期密钥"), "托管身份");
      fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

      await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
      const [, credential] = calls.createAccount.mock.calls[0] as unknown as [
        Record<string, unknown>,
        unknown,
      ];
      // Nothing is sent. A draft that kept the pair alive and sent it anyway would
      // record a credential the account claims not to have — and the field the
      // operator filled in is no longer on screen, so the mistake would be
      // invisible in both directions.
      expect(credential).toBeUndefined();
    });

    it("warns that an unfilled secret leaves the account unresolvable, without blocking it", async () => {
      const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      // Registering now and pasting the key later is a workflow the platform
      // supports — that is why `credentialConfigured` is a column. So the
      // consequence is stated rather than enforced.
      expect(within(credentialGroup(dialog)).getByText(/尚未填写密钥/)).toBeTruthy();

      fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-storage" } });
      fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产对象存储" } });
      fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

      await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
    });

    it("names the half-registration when the credential write is the half that failed", async () => {
      const account = accountItem({ displayName: "生产对象存储" });
      const { calls } = renderWorkspace({ accounts: [account], levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
      await screen.findByRole("table");
      const dialog = await openRegisterForm();

      calls.createAccount.mockRejectedValueOnce(
        new SdkworkIamCloudAccountCredentialWriteError(account, new Error("凭据槽位已被占用")),
      );
      fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-storage" } });
      fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产对象存储" } });
      fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

      // Saying "registration failed" would be false — the account is in the
      // listing — and saying nothing would leave an unusable account with no
      // explanation. The notice names the account that *was* created and the reason
      // its credential was not, and the register form is gone: resubmitting would
      // only collide with the account that now exists.
      expect(await screen.findByText(/账号「生产对象存储」已登记，但凭据没有写入/)).toBeTruthy();
      expect(screen.getByText(/凭据槽位已被占用/)).toBeTruthy();
      await waitFor(() => expect(screen.queryByText("登记云账号")).toBeNull());
      // The account is in the listing, so the operator can finish the job from its
      // detail — which is what the notice tells them to do.
      expect(await screen.findByText("生产对象存储")).toBeTruthy();
    });
  });

  it("keeps a narrowed account's capabilities intact while the operator edits it", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByRole("button", { name: "编辑" }));
    const dialog = await screen.findByRole("dialog");

    // Editing shows the same read-only line — an account narrowed through the API
    // must still be visible here, or the operator would be editing a field they
    // cannot see — and no checkbox to change it with.
    const capabilities = dialog.querySelector<HTMLElement>(
      '[data-slot="cloud-account-capabilities"]',
    );
    expect(within(capabilities as HTMLElement).getByText("对象存储")).toBeTruthy();
    expect(within(dialog).queryAllByRole("checkbox")).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产对象存储 v2" } });
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);

    // `PATCH` carries the field, so an editor that dropped it would **clear** the
    // account's narrowing — a silent, destructive side effect of removing a
    // control. The value has to survive the round trip untouched.
    await waitFor(() => expect(calls.updateAccount).toHaveBeenCalledWith(
      "acct-1",
      expect.objectContaining({ capabilityCodes: ["object_storage"], displayName: "生产对象存储 v2" }),
    ));
  });

  it("renders the server's vocabulary in the interface language, not as machine codes", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    const table = await screen.findByRole("table");

    // Every closed vocabulary the server fills in is translated: provider and
    // environment in the listing…
    expect(within(table).getByText("阿里云")).toBeTruthy();
    expect(within(table).getByText("生产")).toBeTruthy();
    expect(within(table).queryByText("aliyun")).toBeNull();
    expect(within(table).queryByText("production")).toBeNull();

    // …and the rest of it inside the detail, which is where the values the columns
    // cannot carry are read.
    fireEvent.click(within(table).getByRole("button", { name: "详情" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("长期密钥")).toBeTruthy();
    expect(within(dialog).getByText("对象存储")).toBeTruthy();
    // Region is provider-scoped vocabulary and is translated *against the
    // account's own provider*: `cn-hangzhou` is a place name, not an identifier
    // the operator authored, so the raw code must not be what the operator reads.
    expect(within(dialog).getByText("华东1（杭州）")).toBeTruthy();
    for (const code of [
      "aliyun",
      "production",
      "long_term_key",
      "object_storage",
      "certificate",
      "cn-hangzhou",
    ]) {
      expect(within(dialog).queryByText(code)).toBeNull();
    }

    // Identifiers the operator authored are *not* vocabulary and stay verbatim:
    // translating them would make the page disagree with the API.
    expect(within(dialog).getByText("prod-storage")).toBeTruthy();
  });

  it("offers the selected provider's regions instead of one flat list", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");
    // Re-queried after every interaction that can re-render the field, so the
    // assertions never run against a node the page has moved on from.
    const currentRegion = () => within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    // The register form opens on Alibaba Cloud, so the field offers that
    // provider's regions, each under its own name rather than as a bare code.
    fireEvent.change(currentRegion(), { target: { value: "cn-han" } });
    expect(await screen.findByText("华东1（杭州）")).toBeTruthy();
    // `us-east-2` belongs to AWS alone. The codes *collide* across providers, so
    // a single flat candidate list would offer — and mislabel — the wrong ones.
    expect(screen.queryByText("美国东部（俄亥俄）")).toBeNull();

    // Following the provider is not only about which names appear: the values the
    // operator can pick change with it.
    await pickSelectOption(selectShowing(dialog, "阿里云"), "AWS");
    fireEvent.change(currentRegion(), { target: { value: "us-east" } });
    expect(await screen.findByText("美国东部（俄亥俄）")).toBeTruthy();
    expect(screen.queryByText("华东1（杭州）")).toBeNull();

    // Picking a candidate writes the *code* on the wire, not the label.
    fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-aws" } });
    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产 AWS" } });
    // The operator is in the field, so the field is showing the code it is
    // editing rather than painting a name over it.
    fireEvent.focusIn(currentRegion());
    expect(regionNameShown(currentRegion())).toBeNull();

    fireEvent.mouseDown(screen.getByText("美国东部（俄亥俄）"));

    // …and a pick ends that. The value stays the code — it is what the API stores
    // — while the field goes back to reading as the region's name, so what the
    // operator is left looking at is the thing they picked rather than `us-east-2`.
    expect(currentRegion().value).toBe("us-east-2");
    expect(regionNameShown(currentRegion())).toBe("美国东部（俄亥俄）");

    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
    const [input] = calls.createAccount.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(input.regionCode).toBe("us-east-2");
  });

  it("treats the field's own focus as inside the list, not as leaving it", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");
    const currentRegion = () => within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    fireEvent.change(currentRegion(), { target: { value: "cn-han" } });
    expect(await screen.findByText("华东1（杭州）")).toBeTruthy();

    // Radix's focus-outside has **no** notion of a popover's anchor: every
    // `focusin` whose target is outside the *content* node counts as leaving, and
    // this field is outside it by construction — it is what the popup is anchored
    // to, not a child of it. Unless the field announces itself as inside, focusing
    // it would shut the list on the one element the operator is typing into. So
    // the assertion is that this focus arrives, and the list is still there.
    fireEvent.focusIn(currentRegion());
    expect(screen.getByText("华东1（杭州）")).toBeTruthy();
  });

  it("keeps a region the provider does not publish, rather than snapping it to a candidate", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");
    const region = within(dialog).getByRole("combobox", { name: "地域" });

    fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-custom" } });
    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "生产自定义地域" } });

    // `cn-hangzhou-2` *starts with* a candidate but is not one. It must survive:
    // `region_code` is free `TEXT` with no server-side validation, and a field
    // that silently rewrote it would register an account in a region the operator
    // did not choose.
    fireEvent.focus(region);
    fireEvent.change(region, { target: { value: "cn-hangzhou-2" } });
    fireEvent.keyDown(region, { key: "Enter" });
    expect((region as HTMLInputElement).value).toBe("cn-hangzhou-2");
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
    const [input] = calls.createAccount.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(input.regionCode).toBe("cn-hangzhou-2");
  });

  it("drops a region the newly selected provider does not publish, and keeps one it does", async () => {
    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");
    const region = within(dialog).getByRole("combobox", { name: "地域" });
    // Read the live element each time: the provider change re-renders the field
    // from the new draft, so a captured node can go stale.
    const currentRegion = () => within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    // `cn-hangzhou` means nothing to AWS, so switching providers leaves the field
    // empty instead of carrying a region that belongs to the previous one.
    fireEvent.change(region, { target: { value: "cn-hangzhou" } });
    await pickSelectOption(selectShowing(dialog, "阿里云"), "AWS");
    expect(currentRegion().value).toBe("");

    // `ap-southeast-1` is published by both, so it is exactly the case the rule
    // must *not* touch — dropping it would lose a value the operator still means.
    fireEvent.change(currentRegion(), { target: { value: "ap-southeast-1" } });
    await pickSelectOption(selectShowing(dialog, "AWS"), "阿里云");
    expect(currentRegion().value).toBe("ap-southeast-1");
  });

  it("reads the edited account's own provider for region candidates", async () => {
    renderWorkspace({
      accounts: [accountItem({ regionCode: "ap-singapore", vendorCode: "tencent" })],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByRole("button", { name: "编辑" }));
    const dialog = await screen.findByRole("dialog");
    const region = within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    // An account's provider is part of its identity and `PATCH` does not accept
    // it, so the editor has no provider picker — the candidates still have to come
    // from the provider the account actually belongs to, not from the register
    // form's default.
    expect(region.value).toBe("ap-singapore");
    // At rest the field reads as the region's name: `ap-singapore` is a code, and
    // a code is not a thing to show a person. The value underneath is untouched.
    expect(regionNameShown(region)).toBe("新加坡");

    // Focusing is editing, so the code comes back — and the caret goes to its end.
    // A click landed on the *name*, whose glyphs sit at different offsets than the
    // code underneath, so the offset it produced can fall mid-code and typing
    // would then splice into it. jsdom places the caret at the end whenever a value
    // is set programmatically, so standing in for that click is what makes this
    // assertion mean something: without the field's own correction, `ap-sin|gapore`
    // is exactly where it would stay.
    region.setSelectionRange(6, 6);
    fireEvent.focusIn(region);
    expect(regionNameShown(region)).toBeNull();
    expect(region.selectionStart).toBe("ap-singapore".length);

    fireEvent.change(region, { target: { value: "ap-sing" } });
    expect(await screen.findByText("新加坡")).toBeTruthy();
    expect(screen.queryByText("华东1（杭州）")).toBeNull();
  });

  it("shows a value it cannot name as itself, rather than as a blank field", async () => {
    renderWorkspace({
      accounts: [accountItem({ regionCode: "cn-hangzhou-2", vendorCode: "aliyun" })],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    const table = await screen.findByRole("table");

    fireEvent.click(within(table).getByRole("button", { name: "编辑" }));
    const dialog = await screen.findByRole("dialog");
    const region = within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    // A custom region is one this provider does not publish and no catalog can
    // name. There is nothing honest to paint over the value, so the field shows
    // the value: the alternative is a deliberately blank field that is not empty.
    expect(region.value).toBe("cn-hangzhou-2");
    expect(regionNameShown(region)).toBeNull();
  });

  it("names a region the provider carries and stays silent about one it does not", () => {
    const options = ["cn-hangzhou", "cn-shanghai"];
    const label = (code: string) => (code === "cn-hangzhou" ? "华东1（杭州）" : code);

    expect(regionNameFor("cn-hangzhou", options, label)).toBe("华东1（杭州）");
    // Case-insensitive, matching how the provider switch asks the same question.
    expect(regionNameFor(" CN-Hangzhou ", options, label)).toBe("华东1（杭州）");

    // Nothing to say.
    expect(regionNameFor("", options, label)).toBeUndefined();
    expect(regionNameFor("   ", options, label)).toBeUndefined();

    // Starts with a carried code without being one. Naming it would relabel a
    // value the operator typed themselves — the one thing this field must not do.
    expect(regionNameFor("cn-hangzhou-2", options, label)).toBeUndefined();

    // Carried, but this catalog has no name for it: painting it would draw the
    // code on top of itself.
    expect(regionNameFor("cn-shanghai", options, label)).toBeUndefined();
  });

  it("only offers a completion for a prefix, so a longer custom region survives Enter", () => {
    const options = ["cn-hangzhou", "cn-shanghai"];

    expect(regionCompletionIndex("cn-han", options)).toBe(0);
    expect(regionCompletionIndex("CN-HANGZHOU", options)).toBe(0);
    // Nothing typed: Enter must reach the form, not pick the first candidate.
    expect(regionCompletionIndex("", options)).toBe(-1);
    expect(regionCompletionIndex("   ", options)).toBe(-1);
    // Contains a candidate without being one — the case that would truncate a
    // legitimate custom region if substring matches counted as completions.
    expect(regionCompletionIndex("cn-hangzhou-2", options)).toBe(-1);
    expect(regionCompletionIndex("hangzhou", options)).toBe(-1);
  });

  it("offers to clear only a field that holds something the operator can change", () => {
    const { field, props, rerender } = renderRegionField();

    // Nothing to clear: a control that empties an already empty field is noise,
    // and it would sit in every register form from the moment it opens.
    expect(regionClearShown(field)).toBeNull();

    rerender(<RegionCombobox {...props} value="cn-hangzhou" />);
    expect(regionClearShown(field)).not.toBeNull();

    // A field the operator cannot change must not look changeable.
    rerender(<RegionCombobox {...props} disabled value="cn-hangzhou" />);
    expect(regionClearShown(field)).toBeNull();
  });

  it("empties the field in one gesture rather than a character at a time", async () => {
    const { field, onChange } = renderRegionField({ value: "cn-hangzhou" });
    const clear = regionClearShown(field) as HTMLElement;
    expect(clear).not.toBeNull();

    // The adornment container must not take pointer events, or the input would be
    // unreachable between the icons; the button opts back in so it stays
    // clickable. jsdom has no hit testing at all, so this class contract is the
    // check available here — the real browser is where it is actually proven.
    expect(clear.parentElement?.className).toContain("pointer-events-none");
    expect(clear.className).toContain("pointer-events-auto");

    // Start where the operator actually is: in the field, with the list shut the
    // way Escape leaves it. This matters. The field already holds focus, so
    // `focus()` cannot be what reopens the list — clearing has to say so itself,
    // and a version that only relied on focus would pass every other check here
    // and still leave the operator with a dead field after one click.
    field.focus();
    expect(await screen.findByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(field, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
    expect(document.activeElement).toBe(field);

    // `mousedown` with the default prevented, like the list's own options, so the
    // caret stays in the field instead of moving onto this button.
    fireEvent.mouseDown(clear);
    expect(onChange).toHaveBeenCalledWith("");

    // Clearing is a step towards the *next* value, not the end of the
    // interaction: the list is open again, ready for a different pick.
    expect(await screen.findByRole("listbox")).toBeTruthy();
  });

  it("empties the chosen region without the operator retyping it", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "新建账号" }));
    const dialog = await screen.findByRole("dialog");
    // Re-queried after every interaction that can re-render the field, like the
    // other region cases: the assertions never run against a node the page has
    // moved on from.
    const currentRegion = () => within(dialog).getByRole("combobox", { name: "地域" }) as HTMLInputElement;

    // Pick one, the way the list offers it.
    fireEvent.focusIn(currentRegion());
    fireEvent.mouseDown(await screen.findByText("华东1（杭州）"));
    expect(currentRegion().value).toBe("cn-hangzhou");
    expect(regionNameShown(currentRegion())).toBe("华东1（杭州）");

    // One gesture returns the field to empty — not to a name for the empty
    // string, and not to the code that was there.
    fireEvent.mouseDown(regionClearShown(currentRegion()) as HTMLElement);
    expect(currentRegion().value).toBe("");
    expect(regionNameShown(currentRegion())).toBeNull();

    // And the submitted account carries no region at all, rather than an empty
    // string the server would have to interpret.
    fireEvent.change(within(dialog).getByLabelText("账号标识"), { target: { value: "prod-no-region" } });
    fireEvent.change(within(dialog).getByLabelText("显示名称"), { target: { value: "无地域" } });
    fireEvent.submit(dialog.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(calls.createAccount).toHaveBeenCalled());
    const [input] = calls.createAccount.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(input.regionCode).toBeUndefined();
  });

  it("closes the editor instead of degrading to the register form when the row disappears", async () => {
    const { calls, rows } = renderWorkspace({
      accounts: [
        accountItem(),
        accountItem({ accountCode: "prod-cdn", displayName: "生产 CDN", id: "acct-2", isDefault: false }),
      ],
      levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER],
    });
    await screen.findByRole("table");

    fireEvent.click(screen.getAllByRole("button", { name: "编辑" })[0]);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "保存" })).toBeTruthy();

    // The edited row leaves the listing while the modal is open — revoked elsewhere, or
    // dropped by a narrowed scope — and a row action on the other account re-reads the
    // page from the controller, which is the moment the page notices.
    rows.splice(0, 1);
    // `hidden: true`: an open modal marks the page behind it `aria-hidden`, so the row
    // buttons are still in the DOM but out of the accessibility tree.
    fireEvent.click(screen.getAllByRole("button", { name: "停用", hidden: true })[1]);
    await waitFor(() => expect(calls.updateAccount).toHaveBeenCalledWith("acct-2", expect.anything()));

    // With nothing left to edit the editor closes. What must not happen is the modal
    // staying open on the register form while its footer still submits — and is still
    // labelled — as an edit, which is one click away from creating an account instead
    // of updating one.
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.body.textContent).not.toContain("登记账号");
    // The page behind is intact rather than blanked by the closing editor.
    expect(within(screen.getByRole("table")).getByText("生产 CDN")).toBeTruthy();
  });

  it("confirms a delete before it reaches the controller", async () => {
    const { calls } = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: "删除账号" }));

    // The shared confirmation renders through the same modal shell, so it carries
    // `role="dialog"` with the destructive tone rather than an `alertdialog` role.
    const confirmation = await screen.findByRole("dialog");
    // The dialog names the row it is about, because the page never deletes on a
    // click alone.
    expect(within(confirmation).getByText(/生产对象存储/)).toBeTruthy();
    expect(calls.deleteAccount).not.toHaveBeenCalled();

    fireEvent.click(within(confirmation).getByRole("button", { name: "删除账号" }));

    await waitFor(() => expect(calls.deleteAccount).toHaveBeenCalledWith("acct-1"));
  });

  it("describes the admin surface differently from the tenant console", async () => {
    const tenantConsole = renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER] });
    expect(await screen.findByText(/登记并管理你自己的服务商账号/)).toBeTruthy();
    tenantConsole.unmount();

    renderWorkspace({ levels: [IAM_CLOUD_ACCOUNT_SCOPE_USER], surface: "admin" });
    expect(await screen.findByText(/包括对全体租户生效的平台级默认账号/)).toBeTruthy();
  });
});
