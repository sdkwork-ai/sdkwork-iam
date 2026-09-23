import {
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
  IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_SECRET_TEXT,
  IAM_CLOUD_ACCOUNT_ENVIRONMENTS,
  IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES,
  IAM_CLOUD_ACCOUNT_SCOPE_LEVELS,
  IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION,
  IAM_CLOUD_ACCOUNT_SCOPE_USER,
  IAM_CLOUD_ACCOUNT_STATUS_ACTIVE,
  IAM_CLOUD_ACCOUNT_STATUS_DELETED,
  IAM_CLOUD_ACCOUNT_STATUS_DISABLED,
  IAM_CLOUD_ACCOUNT_TYPES,
  iamCloudAccountCredentialFields,
  iamCloudAccountTypeCredentialKind,
  iamCloudAccountTypeRequiresRotation,
  iamCloudAccountVendorAcceptsRegion,
  listIamCloudAccountVendorRegions,
  type IamCloudAccountCredentialField,
  type IamCloudAccountScopeLevel,
  type IamCloudAccountVendor,
} from "@sdkwork/iam-contracts";
import { SdkworkIamListPaginationControls } from "@sdkwork/iam-pc-admin-core";
import {
  Button,
  Checkbox,
  ConfirmDialog,
  DataTable,
  type DataTableColumn,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsSection,
  StatusBadge,
  StatusNotice,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@sdkwork/ui-pc-react";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  credentialFieldLabel,
  credentialKindName,
  credentialNotNeededFor,
  credentialShapeHintFor,
  kindHintForKind,
  regionHintFor,
  secretLabelForKind,
  useSdkworkIamCloudAccountConsoleMessages,
  vendorConfigFor,
} from "../i18n";
import type {
  SdkworkIamCloudAccountVendorConfigCopy,
  SdkworkIamCloudAccountVocabularyLabels,
} from "../i18n";
import { RegionCombobox } from "../components/RegionCombobox";
import { SdkworkIamCloudAccountCredentialWriteError } from "../services/cloud-account-console-controller";
import type {
  SdkworkIamConsoleCloudAccountCredentialInput,
  SdkworkIamConsoleCloudAccountCredentialRecord,
  SdkworkIamConsoleCloudAccountRecord,
  SdkworkIamConsoleCloudAccountResolution,
  SdkworkIamConsoleCloudAccountWorkspaceProps,
} from "../types/cloud-account-console-types";

/**
 * The register form's own draft. Never shared with the edit or credential forms.
 *
 * It carries no capabilities on purpose: the console does not ask for them, so
 * the field is not merely hidden — it does not exist, and the create request
 * never puts the key on the wire. The server then stores an empty list, which it
 * reads as *unspecified* (`ProviderAccount::serves_capability`), so a freshly
 * registered account serves every capability of its provider.
 *
 * It *does* carry credentials, which is the opposite decision and for a
 * different reason. A registration that stores only the account produces
 * something no consumer can use: the row is listed, selectable and resolvable by
 * nothing, because resolution walks to a credential and finds none. So the form
 * asks for the concrete configuration with the account, and the identity shape
 * decides which of these fields is shown (`iamCloudAccountCredentialFields`) —
 * the draft holds all four so that switching the shape does not throw away what
 * was typed, while `credentialDraftOf` sends only the fields the current shape
 * declares. Sending a leftover key alongside a shape that has none would let the
 * console record a secret the account claims not to have.
 */
interface CreateDraft {
  /** Which credential fields a draft carries is decided by `accountType`; see `credentialDraftOf`. */
  accessKeyId: string;
  accountCode: string;
  accountType: string;
  displayName: string;
  environment: string;
  externalAccountId: string;
  isDefault: boolean;
  organizationId: string;
  regionCode: string;
  scopeType: IamCloudAccountScopeLevel;
  secretAccessKey: string;
  secretText: string;
  sessionToken: string;
  vendorCode: string;
}

/** The subset `PATCH` accepts for an already registered account. */
interface EditDraft {
  accountType: string;
  capabilityCodes: readonly string[];
  displayName: string;
  environment: string;
  regionCode: string;
  /**
   * The account's provider, carried for context rather than for editing.
   *
   * A provider is part of an account's identity — `PATCH` does not accept it —
   * but the region candidates and their names are provider-scoped, so the form
   * needs it to resolve both. Like `capabilityCodes`, it is in the draft and not
   * in the payload.
   */
  vendorCode: string;
}

/** The credential form's own draft. */
interface CredentialDraft {
  accessKeyId: string;
  credentialKind: string;
  credentialName: string;
  secretAccessKey: string;
  secretText: string;
  sessionToken: string;
}

/** Which form the editor modal is holding. `undefined` means it is closed. */
type EditorMode = "create" | "edit" | undefined;

const DEFAULT_ENVIRONMENT = "production";

/**
 * The id the editor modal's footer submits.
 *
 * The form lives in `ModalBody` while its submit button lives in `ModalFooter`,
 * which are siblings rather than ancestors, so the button is associated with the
 * form by id instead of by nesting. That keeps the scrolling region and the
 * pinned footer the modal's own layout rather than the form's.
 */
const EDITOR_FORM_ID = "sdkwork-iam-cloud-account-editor";

/**
 * The same association for the credential dialog.
 *
 * The write form used to live at the bottom of the *detail* dialog, under the
 * account's facts and the credential table. Measured at 1440x1000 that body holds
 * 850px of content in a 710px window, which put the session-token field under the
 * dialog's own footer — its centre hit-tested to the footer, not to the input —
 * and the store button below the panel entirely, where the click landed on the
 * modal backdrop. At 1280x720 the whole form (y 728..968) started below the
 * viewport. A form that cannot be reached reads as a form that cannot be filled
 * in, so it gets a dialog of its own where it fits at any window the console
 * supports.
 */
const CREDENTIAL_FORM_ID = "sdkwork-iam-cloud-account-credential";

/**
 * The cloud account center.
 *
 * One route set serves every ownership level, so the page is a *view* over
 * whichever level the host projected: the tenant console is personal-only (one
 * level, no level control, a listing pinned to `mine`), while the platform admin
 * additionally offers the levels its caller genuinely holds. The server decides
 * what each caller actually reaches, and the page renders whatever comes back —
 * it never narrows a request to "protect" the caller, because a client-side
 * narrowing would make a permitted request look impossible.
 *
 * The two lists and the two write paths are the whole interaction: accounts are a
 * table with row actions, creating and editing happen in one modal, deleting is
 * confirmed, and the selected account's credentials are a second table below.
 */
export function SdkworkIamConsoleCloudAccountWorkspace({
  controller,
  description,
  manageableScopeLevels = [IAM_CLOUD_ACCOUNT_SCOPE_USER],
  surface = "console",
  title,
}: SdkworkIamConsoleCloudAccountWorkspaceProps) {
  const messages = useSdkworkIamCloudAccountConsoleMessages();

  /**
   * The levels the caller may act on, in resolution precedence order.
   *
   * Filtered from the full four-level vocabulary rather than from
   * `IAM_CLOUD_ACCOUNT_SELF_SERVICE_SCOPE_LEVELS`, because that constant exists to
   * keep `platform` off the tenant console and would therefore also hide it from
   * the platform admin surface that legitimately manages it. The fallback keeps
   * the page usable when a host passes no level at all.
   */
  const levels = useMemo<readonly IamCloudAccountScopeLevel[]>(() => {
    const offered = IAM_CLOUD_ACCOUNT_SCOPE_LEVELS.filter((level) =>
      manageableScopeLevels.includes(level),
    );
    return offered.length > 0 ? offered : [IAM_CLOUD_ACCOUNT_SCOPE_USER];
  }, [manageableScopeLevels]);

  /**
   * Whether the level is a choice at all.
   *
   * A single offered level is not a filter, so the tab strip and the ownership
   * picker are both withheld rather than shown with one option — a control that
   * cannot change anything is noise, and on the console there is exactly one
   * level by construction.
   */
  const levelIsSelectable = levels.length > 1;

  const [activeLevel, setActiveLevel] = useState<IamCloudAccountScopeLevel>(levels[0]);
  const [accounts, setAccounts] = useState(controller.getState().accounts);
  const [credentials, setCredentials] = useState(controller.getState().credentials);
  const [listPageInfo, setListPageInfo] = useState(controller.getState().listPageInfo);
  /**
   * Which row each dialog is about, held as an id rather than as a record.
   *
   * Two dialogs need a subject and they are not the same subject at the same
   * time — the detail is open while the operator reads, then "edit" hands the
   * same account to the editor — so each carries its own id. Storing the record
   * instead would keep a stale copy alive after a reload, and deriving the row
   * from the live listing is what lets a dialog close itself when its row
   * disappears (`accounts` is replaced by every sync).
   */
  const [detailAccountId, setDetailAccountId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  /**
   * The credential dialog's own subject.
   *
   * It is a third id rather than a reuse of `detailAccountId` because the two
   * dialogs are never about the same account at the same time: opening the
   * credential form closes the detail first (one subject, one dialog), so by the
   * time the form is up the detail's id is empty.
   */
  const [credentialAccountId, setCredentialAccountId] = useState("");
  const [editor, setEditor] = useState<EditorMode>();
  const [deleteTarget, setDeleteTarget] = useState<SdkworkIamConsoleCloudAccountRecord | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [listing, setListing] = useState(false);
  const [resolution, setResolution] = useState<SdkworkIamConsoleCloudAccountResolution | undefined>();

  const [createDraft, setCreateDraft] = useState<CreateDraft>(() => emptyCreateDraft(levels[0]));
  const [editDraft, setEditDraft] = useState<EditDraft>(emptyEditDraft);
  const [credentialDraft, setCredentialDraft] = useState<CredentialDraft>(emptyCredentialDraft);
  /**
   * Whether the credential write form's own dialog is open.
   *
   * Held as a flag rather than as "is a draft present" so that a closed dialog and
   * an empty draft stay independent: the draft is also cleared on submit.
   */
  const [credentialEditorOpen, setCredentialEditorOpen] = useState(false);

  const detailAccount = useMemo(
    () => accounts.find((account) => account.id === detailAccountId),
    [accounts, detailAccountId],
  );
  const editAccount = useMemo(
    () => accounts.find((account) => account.id === editAccountId),
    [accounts, editAccountId],
  );

  /**
   * The account the credential dialog writes to.
   *
   * Derived rather than stored, for the same reason as the editor's target: a
   * sync replaces the rows, so an id that is no longer in the listing has to
   * close the dialog instead of submitting against a stale account. The credential
   * form is opened from the detail, so its subject is whichever account the detail
   * is currently showing — the two can never disagree.
   */
  const credentialAccount = useMemo(
    () => accounts.find((account) => account.id === credentialAccountId),
    [accounts, credentialAccountId],
  );

  /**
   * The account the credential dialog writes to.
   *
   * Derived rather than stored, for the same reason as the editor's target: a
   * sync replaces the rows, so an id that is no longer in the listing has to
   * close the dialog instead of submitting a secret against a stale account.
   */
  const credentialEditorTarget = credentialEditorOpen ? credentialAccount : undefined;

  /**
   * The words each surface describing a credential asks in.
   *
   * One resolution per surface rather than one shared: the register form follows the
   * provider being chosen, the credential dialog follows the account already stored,
   * and the detail's listing follows the row that is open — and these are different
   * accounts at the same moment (the detail can be open on one row while the register
   * form is being filled for a provider that is not even registered yet).
   */
  const createVendorConfig = useMemo(
    () => vendorConfigFor(createDraft.vendorCode, messages),
    [createDraft.vendorCode, messages],
  );
  const credentialVendorConfig = useMemo(
    () => vendorConfigFor(credentialEditorTarget?.vendorCode, messages),
    [credentialEditorTarget?.vendorCode, messages],
  );

  /**
   * The same words for the account the detail is open on.
   *
   * A third resolution rather than a fourth for the same reason the first two are
   * kept apart: the detail is showing a *third* account — the row the operator
   * selected — which is neither the one the register form is describing nor the one
   * the credential dialog was opened from. It exists because the listing names each
   * stored credential in the account's provider's words, exactly as the form that
   * wrote it did, and the provider that has to be read for that is this one.
   */
  const detailVendorConfig = useMemo(
    () => vendorConfigFor(detailAccount?.vendorCode, messages),
    [detailAccount?.vendorCode, messages],
  );

  /**
   * The credential fields the register form is asking for right now.
   *
   * Read off the identity shape, and empty for the shapes that hold no secret on
   * this platform — an empty list is a *finding* here, not a gap, which is why the
   * form renders the reason instead of an empty area.
   */
  const createCredentialFields = useMemo(
    () => iamCloudAccountCredentialFields(createDraft.accountType),
    [createDraft.accountType],
  );

  /**
   * The credential shape the chosen identity form stores its secret in.
   *
   * Read alongside the field list rather than derived from it, because the two
   * answer different questions about the same shape: the fields say *how many*
   * boxes to draw, the kind says *what the one blob in them means* — and hence
   * which of the provider's words belongs on it. `service_account_json` and
   * `secret_text` draw the identical single field, so a label chosen from the
   * field alone cannot tell a Google service-account key document from an API
   * key, and would be wrong for whichever one it did not name.
   */
  const createCredentialKind = useMemo(
    () => iamCloudAccountTypeCredentialKind(createDraft.accountType),
    [createDraft.accountType],
  );

  /**
   * What the editor modal is actually holding.
   *
   * An `edit` needs a live target, so a target that disappeared under the modal
   * degrades to "nothing to edit" rather than to the register form — the
   * footer's submit reads its enabled-ness and its label off this same value, and
   * a modal that drew the register form while submitting an edit would be one
   * wrong click away from creating an account instead of updating one.
   */
  const editorMode: EditorMode = editor === "edit" && !editAccount ? undefined : editor;

  const sync = useCallback(() => {
    const state = controller.getState();
    setAccounts(state.accounts);
    setCredentials(state.credentials);
    setListPageInfo(state.listPageInfo);
  }, [controller]);

  const fail = useCallback((loadError: unknown, fallback: string) => {
    setError(loadError instanceof Error ? loadError.message : fallback);
  }, []);

  /**
   * One promise wrapper: clear the error, drop the busy flag, re-sync on settle.
   *
   * It resolves with whether the action **succeeded**, and callers have to read
   * that before doing anything that only makes sense after a write. The chain
   * settles on both outcomes — `catch` takes the refusal, `finally` clears the busy
   * flag — so a bare `.then(cb)` after `run` runs on failure too. All three write
   * dialogs closed themselves that way, which threw away whatever was typed: a
   * refused registration was indistinguishable from a successful one except that
   * no row appeared, and a refused credential write discarded a secret the operator
   * would have to go and fetch again.
   */
  const run = useCallback(
    (action: Promise<unknown>, fallback: string) =>
      action
        .then(() => {
          sync();
          setError(undefined);
          return true;
        })
        .catch((actionError: unknown) => {
          fail(actionError, fallback);
          return false;
        })
        .finally(() => setPending(false)),
    [fail, sync],
  );

  /**
   * Reload the pinned level.
   *
   * `listing` is tracked separately from `pending` so the table shows its loading
   * state only for the request that replaces the rows: a row action that resolves
   * in place must not blank the table it is acting on.
   *
   * Both dialogs are dismissed by the reload: the rows they were holding are
   * gone, so an open dialog would have to render *something* for an account that
   * no longer exists — and the honest answer is to close rather than to keep
   * showing a snapshot of a level the operator just navigated away from.
   *
   * The dependency list is value-comparable on purpose: `messages.errors.loadAccounts`
   * is a string, so switching the interface language does not re-issue the list
   * request.
   */
  const loadLevel = useCallback(
    (level: IamCloudAccountScopeLevel) => {
      setListing(true);
      setDetailAccountId("");
      setCredentialEditorOpen(false);
      setResolution(undefined);
      return run(controller.listScopeAccounts(level), messages.errors.loadAccounts)
        .finally(() => setListing(false));
    },
    [controller, messages.errors.loadAccounts, run],
  );

  useEffect(() => {
    setPending(true);
    void loadLevel(activeLevel);
  }, [activeLevel, loadLevel]);

  useEffect(() => {
    if (!detailAccountId) {
      setCredentials([]);
      return;
    }
    void run(controller.listCredentials(detailAccountId), messages.errors.loadCredentials);
  }, [controller, messages.errors.loadCredentials, run, detailAccountId]);

  const switchLevel = (level: IamCloudAccountScopeLevel) => {
    setResolution(undefined);
    setEditor(undefined);
    // The register form's ownership follows the tab, so a caller reading the
    // organization level registers an organization account unless it says
    // otherwise. Only the level is re-seeded; anything already typed is kept.
    setCreateDraft((current) => ({ ...current, scopeType: level }));
    setActiveLevel(level);
  };

  const openCreate = () => {
    setError(undefined);
    setCreateDraft(emptyCreateDraft(activeLevel));
    setEditor("create");
  };

  const openEdit = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setError(undefined);
    setEditDraft({
      accountType: account.accountType ?? IAM_CLOUD_ACCOUNT_TYPES[0],
      capabilityCodes: account.capabilityCodes,
      displayName: account.displayName,
      environment: account.environment ?? DEFAULT_ENVIRONMENT,
      regionCode: account.regionCode ?? "",
      vendorCode: account.vendorCode,
    });
    setEditAccountId(account.id);
    setEditor("edit");
  };

  /**
   * Open the account's detail.
   *
   * The detail is a dialog rather than a pane under the table: it holds a second
   * table (the credentials) and a write form, so as a section it grew the page
   * past the viewport and duplicated the listing's own framing. A row click opens
   * it as well as the row's own action, because a listing whose rows are
   * clickable and do nothing is worse than one that opens.
   */
  const openDetail = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setError(undefined);
    setResolution(undefined);
    setDetailAccountId(account.id);
  };

  const closeDetail = () => {
    setDetailAccountId("");
    setResolution(undefined);
  };

  /**
   * Open the credential form for the account the detail was showing.
   *
   * The detail closes first for the same reason the editor closes it: one subject,
   * one dialog, so the operator dismisses the account once. The form opens on an
   * empty draft, because carrying the previous secret over would mean writing it a
   * second time by accident.
   */
  const openCredentialEditor = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setError(undefined);
    setCredentialDraft(emptyCredentialDraft());
    setCredentialAccountId(account.id);
    closeDetail();
    setCredentialEditorOpen(true);
  };

  /**
   * Write one credential field of the register draft.
   *
   * The draft keeps all four fields whatever the current identity shape is, so a
   * shape change reads a different subset of the same draft rather than clearing
   * it — losing what the operator pasted is the worse error, exactly as it is for
   * the region field. What gets *sent* is the subset, not the draft; see
   * `credentialDraftOf`.
   */
  const setCreateCredentialField = (field: IamCloudAccountCredentialField, value: string) => {
    setCreateDraft((current) => {
      switch (field) {
        case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID:
          return { ...current, accessKeyId: value };
        case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET:
          return { ...current, secretAccessKey: value };
        case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT:
          return { ...current, secretText: value };
        case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN:
          return { ...current, sessionToken: value };
        default:
          return current;
      }
    });
  };

  /**
   * Register the account and write its credential.
   *
   * Not routed through `run` because the two halves can land separately and the
   * outcome has to be *named* rather than reduced to a boolean: when the account
   * is stored and the credential is refused, saying "registration failed" is
   * false (the row is in the listing) and saying nothing leaves an account nobody
   * can use with no explanation. So the partial case closes the form — the account
   * exists, and resubmitting would only collide with it — and leaves a page-level
   * notice naming the account and the reason.
   *
   * The notice does *not* hand the account to its detail, which was the first
   * shape of this: opening the detail issues a credential list, `run` clears the
   * error on every load that succeeds, and the explanation was wiped a tick after
   * it was written — leaving a dialog with a credential group and no hint that it
   * is there to be filled in. A notice the operator reads and then acts on is
   * worth more than a dialog opened for them, and the row is in the listing
   * either way.
   */
  const submitCreate = () => {
    setPending(true);
    void controller
      .createAccount(
        {
          accountCode: createDraft.accountCode,
          accountType: createDraft.accountType || undefined,
          displayName: createDraft.displayName,
          environment: createDraft.environment,
          externalAccountId: createDraft.externalAccountId || undefined,
          isDefault: createDraft.isDefault,
          organizationId: createDraft.organizationId || undefined,
          regionCode: createDraft.regionCode || undefined,
          scopeType: createDraft.scopeType,
          vendorCode: createDraft.vendorCode,
        },
        credentialDraftOf(createDraft),
      )
      .then(() => {
        sync();
        setError(undefined);
        setEditor(undefined);
      })
      .catch((createError: unknown) => {
        if (createError instanceof SdkworkIamCloudAccountCredentialWriteError) {
          sync();
          setEditor(undefined);
          setError(
            formatMessage(messages.errors.credentialAfterCreate, {
              name: createError.account.displayName,
              reason: createError.credentialCause instanceof Error
                ? createError.credentialCause.message
                : messages.errors.storeCredential,
            }),
          );
          return;
        }
        fail(createError, messages.errors.createAccount);
      })
      .finally(() => setPending(false));
  };

  const submitEdit = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setPending(true);
    void run(
      controller.updateAccount(account.id, {
        accountType: editDraft.accountType,
        capabilityCodes: [...editDraft.capabilityCodes],
        displayName: editDraft.displayName,
        environment: editDraft.environment,
        regionCode: editDraft.regionCode,
      }),
      messages.errors.updateAccount,
    ).then((stored) => {
      if (stored) {
        setEditor(undefined);
      }
    });
  };

  const toggleStatus = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setPending(true);
    void run(
      controller.updateAccount(account.id, {
        status: account.status === IAM_CLOUD_ACCOUNT_STATUS_DISABLED
          ? IAM_CLOUD_ACCOUNT_STATUS_ACTIVE
          : IAM_CLOUD_ACCOUNT_STATUS_DISABLED,
      }),
      messages.errors.updateAccount,
    );
  };

  const promoteToDefault = (account: SdkworkIamConsoleCloudAccountRecord) => {
    setPending(true);
    void run(controller.setDefaultAccount(account.id), messages.errors.setDefault);
  };

  /**
   * Delete the confirmed account and dismiss whatever was showing it.
   *
   * Both dialogs let go of their id before the request so the credentials effect
   * stops reading the account on its way out. Nothing is re-seeded afterwards:
   * the account is gone, so opening the next row's detail unbidden would answer a
   * question the operator did not ask — the listing is the fallback state.
   */
  const confirmDelete = () => {
    const target = deleteTarget;
    if (!target) {
      return;
    }
    setPending(true);
    closeDetail();
    void run(controller.deleteAccount(target.id), messages.errors.deleteAccount)
      .then(() => {
        setDeleteTarget(undefined);
        setDetailAccountId("");
        setEditAccountId("");
      });
  };

  /**
   * Column definitions map 1:1 to the table contract.
   *
   * The ownership column is admin-only: on the console every row is the caller's
   * own, so a column that always reads "Personal" would be a fact about the page
   * rather than about the row. The status column renders a badge and the credential
   * column reads the two facts a listing exposes instead of the secret bytes.
   */
  const columns = useMemo<DataTableColumn<SdkworkIamConsoleCloudAccountRecord>[]>(() => {
    const base: DataTableColumn<SdkworkIamConsoleCloudAccountRecord>[] = [
      {
        id: "displayName",
        header: messages.columns.displayName,
        cell: (account) => (
          <span className="font-medium text-[var(--sdk-color-text-primary)]">{account.displayName}</span>
        ),
      },
      { id: "vendor", header: messages.columns.vendor, cell: (account) => vendorLabel(account.vendorCode, messages) },
      { id: "accountCode", header: messages.columns.accountCode, cell: (account) => account.accountCode },
    ];
    if (levelIsSelectable) {
      base.push({
        id: "scope",
        header: messages.columns.scope,
        cell: (account) => scopeLabel(account.scopeType, messages),
      });
    }
    base.push(
      {
        id: "environment",
        header: messages.columns.environment,
        cell: (account) => environmentLabel(account.environment, messages),
      },
      {
        id: "status",
        header: messages.columns.status,
        cell: (account) => (
          <StatusBadge
            label={statusLabel(account.status, messages)}
            status={account.status ?? IAM_CLOUD_ACCOUNT_STATUS_ACTIVE}
          />
        ),
      },
      {
        id: "isDefault",
        header: messages.columns.isDefault,
        cell: (account) => (account.isDefault ? messages.list.default : "—"),
      },
      {
        id: "credential",
        header: messages.columns.credential,
        cell: (account) => (account.credentialConfigured ? (
          formatMessage(messages.list.credentialConfigured, {
            count: String(account.credentialCount),
          })
        ) : (
          <span className="text-[var(--sdk-color-state-warning)]">{messages.list.credentialMissing}</span>
        )),
      },
    );
    return base;
  }, [levelIsSelectable, messages]);

  const credentialColumns = useMemo<DataTableColumn<SdkworkIamConsoleCloudAccountCredentialRecord>[]>(
    () => [
      {
        id: "credentialName",
        header: messages.credentials.name,
        cell: (credential) => (
          <span className="font-medium text-[var(--sdk-color-text-primary)]">
            {credential.credentialName ?? messages.credentials.namePlaceholder}
          </span>
        ),
      },
      {
        id: "credentialKind",
        header: messages.credentials.kind,
        cell: (credential) =>
          credentialKindName(credential.credentialKind, detailVendorConfig, messages),
      },
      {
        id: "maskedLabel",
        header: messages.columns.maskedLabel,
        cell: (credential) => credential.maskedLabel ?? "—",
      },
      {
        id: "status",
        header: messages.columns.status,
        cell: (credential) => (
          <StatusBadge
            label={statusLabel(credential.status, messages)}
            status={credential.status ?? IAM_CLOUD_ACCOUNT_STATUS_ACTIVE}
          />
        ),
      },
    ],
    [detailVendorConfig, messages],
  );

  /**
   * The listing, built once and mounted in two shapes.
   *
   * With a level strip above it when the host projected more than one level, and
   * on its own when it did not — the console projects exactly one level, so a tab
   * panel there would be a border, an inset, a background and a shadow wrapped
   * around a table that already draws all four, with nothing on the strip to
   * switch between.
   *
   * The empty copy is stated plainly rather than in the shared dashed card: the
   * table's own surface is already the frame around this area, so the default
   * empty state nested a second border inside it.
   */
  const accountsTable = (
    <DataTable<SdkworkIamConsoleCloudAccountRecord>
      columns={columns}
      density="compact"
      emptyState={(
        <div className="space-y-1 text-center" data-slot="cloud-account-empty">
          <p className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
            {messages.list.emptyTitle}
          </p>
          <p className="mx-auto max-w-md text-xs text-[var(--sdk-color-text-secondary)]">
            {messages.list.emptyDescription}
          </p>
        </div>
      )}
      footer={accounts.length > 0
        ? (
          <SdkworkIamListPaginationControls
            busy={pending}
            copy={{ loadMore: messages.actions.loadMore, summary: messages.list.showingOf }}
            onLoadMore={() => {
              setPending(true);
              void run(controller.loadMoreAccounts(), messages.errors.loadAccounts);
            }}
            pageInfo={listPageInfo?.accounts}
          />
        )
        : undefined}
      getRowId={(account) => account.id}
      loading={listing}
      onRowClick={(account) => openDetail(account)}
      rowActions={(account) => (
        /*
         * No `flex-wrap`: the actions are short labels, and letting them wrap in a
         * narrow column stretched each row from 44px to 125px (measured). The
         * sibling IAM tables keep their row actions on one line for the same
         * reason — the column takes the width it needs instead of the row taking
         * the height.
         *
         * "Details" is spelled out rather than left to the row click: the row is
         * clickable too, but an affordance nothing labels is one an operator has
         * to discover by accident.
         */
        <div className="flex items-center justify-end gap-1">
          <Button onClick={() => openDetail(account)} size="sm" type="button" variant="ghost">
            {messages.actions.detail}
          </Button>
          <Button onClick={() => openEdit(account)} size="sm" type="button" variant="ghost">
            {messages.actions.edit}
          </Button>
          {account.isDefault ? null : (
            <Button
              disabled={pending}
              onClick={() => promoteToDefault(account)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {messages.actions.setDefault}
            </Button>
          )}
          <Button
            disabled={pending}
            onClick={() => toggleStatus(account)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {account.status === IAM_CLOUD_ACCOUNT_STATUS_DISABLED
              ? messages.actions.enable
              : messages.actions.disable}
          </Button>
          <Button
            disabled={pending}
            onClick={() => setDeleteTarget(account)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {messages.actions.delete}
          </Button>
        </div>
      )}
      rowActionsLabel={messages.columns.actions}
      rows={[...accounts]}
      stickyHeader
    />
  );

  return (
    <div className="space-y-6">
      <SettingsSection
        actions={(
          <Button onClick={openCreate} size="sm" type="button">
            {messages.actions.create}
          </Button>
        )}
        description={description ?? (surface === "admin" ? messages.adminSubtitle : messages.subtitle)}
        title={title ?? messages.title}
      >
        {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}

        {levelIsSelectable ? (
          <Tabs onValueChange={(value) => switchLevel(value as IamCloudAccountScopeLevel)} value={activeLevel}>
            <TabsList>
              {levels.map((level) => (
                <TabsTrigger key={level} value={level}>
                  {messages.scope[level]}
                </TabsTrigger>
              ))}
            </TabsList>

            {/*
              The panel keeps the strip's grouping but gives up its own frame: the
              table inside draws border, radius and shadow already, and a second
              frame around one table is exactly the nesting this page is shedding.
            */}
            <TabsContent className="border-0 bg-transparent p-0 shadow-none" value={activeLevel}>
              {accountsTable}
            </TabsContent>
          </Tabs>
        ) : (
          accountsTable
        )}
      </SettingsSection>

      {/*
        The account's detail is a dialog, not a section under the listing.

        It holds a second table (the credentials) and a write form, so as a
        section it made the page tall enough to overflow the console's content
        pane — which does not scroll, so the credentials form at the bottom was
        unreachable — and it drew a second copy of the listing's own framing.
        Reading one account is a focused act, and `ModalBody` scrolls on its own,
        so the detail is where that belongs.

        `open` is bound to the *live* row rather than to a flag: a detail whose
        account disappeared (deleted elsewhere, or dropped by a reloaded level)
        closes instead of rendering a dialog with nothing in it.
      */}
      <Modal
        onOpenChange={(open) => {
          if (!open) {
            closeDetail();
          }
        }}
        open={detailAccount !== undefined}
      >
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>{detailAccount?.displayName}</ModalTitle>
            <ModalDescription>
              {detailAccount
                ? `${vendorLabel(detailAccount.vendorCode, messages)} · ${environmentLabel(detailAccount.environment, messages)} · ${statusLabel(detailAccount.status, messages)}`
                : undefined}
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-6">
            {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}

            {detailAccount ? (
              <>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <GroupCaption>{messages.detail.resolutionTitle}</GroupCaption>
                    <Button
                      disabled={pending}
                      onClick={() => {
                        setError(undefined);
                        void controller
                          .resolveAccount({
                            capabilityCode: detailAccount.capabilityCodes[0],
                            environment: detailAccount.environment,
                            vendorCode: detailAccount.vendorCode,
                          })
                          .then(setResolution)
                          .catch((resolveError: unknown) => fail(resolveError, messages.errors.resolve));
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {messages.actions.resolve}
                    </Button>
                  </div>

                  {/* The caption above already names this block, so the notice
                      carries the answer alone instead of repeating its own title. */}
                  {resolution ? (
                    <StatusNotice tone="default">
                      {resolution.account
                        ? `${resolution.account.displayName} (${
                          scopeLabel(resolution.matchedScope ?? resolution.account.scopeType, messages)
                        }${resolution.matchedByDefault ? ` · ${messages.list.default}` : ""})`
                        : messages.detail.resolutionEmpty}
                      {resolution.candidatesByScope.length > 0
                        ? ` ${resolution.candidatesByScope
                          .map((entry) => `${scopeLabel(entry.scopeType, messages)} ${entry.count}`)
                          .join(" · ")}`
                        : ""}
                    </StatusNotice>
                  ) : null}
                </div>

                {/*
                  The facts the listing's columns cannot carry.

                  Ownership is omitted where it is not a choice: on the console
                  every row is the caller's own, so a fact that always reads
                  "Personal" describes the page rather than the account — the same
                  reason the column is admin-only.
                */}
                <div className="space-y-3">
                  <GroupCaption>{messages.detail.factsTitle}</GroupCaption>
                  <dl className="grid gap-x-10 gap-y-3 md:grid-cols-2">
                    <Fact label={messages.columns.accountCode}>{detailAccount.accountCode}</Fact>
                    <Fact label={messages.columns.vendor}>
                      {vendorLabel(detailAccount.vendorCode, messages)}
                    </Fact>
                    {levelIsSelectable ? (
                      <Fact label={messages.columns.scope}>
                        {scopeLabel(detailAccount.scopeType, messages)}
                      </Fact>
                    ) : null}
                    <Fact label={messages.columns.environment}>
                      {environmentLabel(detailAccount.environment, messages)}
                    </Fact>
                    <Fact label={messages.create.accountType}>
                      {accountTypeLabel(detailAccount.accountType, messages)}
                    </Fact>
                    <Fact label={messages.create.region}>
                      {regionLabel(detailAccount.vendorCode, detailAccount.regionCode, messages) || "—"}
                    </Fact>
                    <Fact label={messages.columns.status}>
                      <StatusBadge
                        label={statusLabel(detailAccount.status, messages)}
                        status={detailAccount.status ?? IAM_CLOUD_ACCOUNT_STATUS_ACTIVE}
                      />
                    </Fact>
                    <Fact label={messages.columns.isDefault}>
                      {detailAccount.isDefault ? messages.list.default : "—"}
                    </Fact>
                    <Fact label={messages.create.capabilities}>
                      {capabilitySummary(detailAccount.capabilityCodes, messages)}
                    </Fact>
                  </dl>
                </div>

                {/*
                  The credentials are a group inside the account, not a second
                  frame: a caption carries the same treatment as a section title —
                  same size, tracking and colour — and a top rule separates the two
                  groups without drawing a box around them.
                */}
                <div className="space-y-3 border-t border-[var(--sdk-color-border-subtle)] pt-5">
                  {/*
                    The caption and the write action share a row so the action is
                    at the top of the group, inside the dialog's first screen. The
                    form it opens lives in its own dialog: as the last block of
                    this body it sat below the fold, which made the key fields
                    look unfillable rather than merely off-screen.
                  */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <GroupCaption>{messages.credentials.title}</GroupCaption>
                      <p className="mt-2 max-w-3xl text-sm text-[var(--sdk-color-text-secondary)]">
                        {messages.credentials.subtitle}
                      </p>
                    </div>
                    <Button
                      onClick={() => openCredentialEditor(detailAccount)}
                      type="button"
                      variant="outline"
                    >
                      {messages.credentials.add}
                    </Button>
                  </div>

                  {credentials.length === 0 ? (
                    <p className="text-sm text-[var(--sdk-color-text-secondary)]">{messages.credentials.empty}</p>
                  ) : (
                    <DataTable<SdkworkIamConsoleCloudAccountCredentialRecord>
                      columns={credentialColumns}
                      density="compact"
                      getRowId={(credential) => credential.id}
                      rowActions={(credential) => (
                        <Button
                          disabled={pending}
                          onClick={() => {
                            setPending(true);
                            void run(
                              controller.revokeCredential(detailAccount.id, credential.id),
                              messages.errors.revokeCredential,
                            );
                          }}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          {messages.credentials.revoke}
                        </Button>
                      )}
                      rowActionsLabel={messages.columns.actions}
                      rows={[...credentials]}
                    />
                  )}

                  {iamCloudAccountTypeRequiresRotation(detailAccount.accountType) ? (
                    <p className="text-xs text-[var(--sdk-color-text-secondary)]">
                      {messages.credentials.rotationApplies}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}
          </ModalBody>
          <ModalFooter>
            {/*
              Editing from inside the detail closes it first and hands the same
              account to the editor: two modals stacked on one subject would make
              the operator dismiss the same account twice.
            */}
            <Button
              onClick={() => {
                const target = detailAccount;
                closeDetail();
                if (target) {
                  openEdit(target);
                }
              }}
              type="button"
              variant="secondary"
            >
              {messages.actions.edit}
            </Button>
            <Button onClick={closeDetail} type="button">
              {messages.actions.close}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/*
        The credential write form's own dialog.

        It is not a block inside the detail because the detail is the read view —
        facts plus the credentials already configured — whereas this is a form for
        a secret. As the detail's last block it fell outside the body's visible
        window, and a field that cannot be reached is indistinguishable from a
        field that cannot be filled in.
      */}
      <Modal onOpenChange={setCredentialEditorOpen} open={credentialEditorTarget !== undefined}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>{messages.credentials.addTitle}</ModalTitle>
            <ModalDescription>
              {credentialEditorTarget?.displayName ?? messages.credentials.subtitle}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {/*
              The refusal has to be legible *here*: the page-level notice is behind
              this dialog, so a write that fails would otherwise look like nothing
              happening — while the secret the operator pasted sits in the form,
              unsent and unremarked.
            */}
            {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
            {credentialEditorTarget ? (
              <form
                className="space-y-3"
                id={CREDENTIAL_FORM_ID}
                onSubmit={(event) => {
                  event.preventDefault();
                  setPending(true);
                  void run(
                    controller.createCredential(credentialEditorTarget.id, {
                      accessKeyId: credentialDraft.accessKeyId || undefined,
                      credentialKind: credentialDraft.credentialKind,
                      credentialName: credentialDraft.credentialName || undefined,
                      secretAccessKey: credentialDraft.secretAccessKey || undefined,
                      secretText: credentialDraft.secretText || undefined,
                      sessionToken: credentialDraft.sessionToken || undefined,
                    }),
                    messages.errors.storeCredential,
                  ).then((stored) => {
                    // Only on success: a refused write keeps the dialog and
                    // everything typed into it, so the operator can correct the
                    // slot name and retry instead of fetching the secret again.
                    if (stored) {
                      setCredentialDraft(emptyCredentialDraft());
                      setCredentialEditorOpen(false);
                    }
                  });
                }}
              >
                {/*
                  Where to get *this* credential, in the provider's words — the same
                  sentence the register form shows, because rotating a key needs the
                  same directions as registering the account. A lead-in *above* the
                  fields rather than a sibling of them: inside the grid it landed in
                  the cell beside the session token's own note, which read as though it
                  were about that one field.
                */}
                <p className="text-xs text-[var(--sdk-color-text-muted)]">
                  {kindHintForKind(credentialDraft.credentialKind, credentialVendorConfig)}
                </p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.credentials.name}</span>
                    <Input
                      onChange={(event) =>
                        setCredentialDraft((current) => ({ ...current, credentialName: event.target.value }))
                      }
                      placeholder={messages.credentials.namePlaceholder}
                      value={credentialDraft.credentialName}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.credentials.kind}</span>
                    <Select
                      onValueChange={(value) =>
                        setCredentialDraft((current) => ({ ...current, credentialKind: value }))
                      }
                      value={credentialDraft.credentialKind}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/*
                          Driven by the contract's vocabulary rather than a hand
                          written list: the list that was here named three of the
                          four kinds, so `service_account_json` could not be
                          created from the console at all and its catalogs entry
                          never had anywhere to render.
                        */}
                        {IAM_CLOUD_ACCOUNT_CREDENTIAL_KINDS.map((kind) => (
                          <SelectItem key={kind} value={kind}>
                            {credentialKindName(kind, credentialVendorConfig, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {credentialDraft.credentialKind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR ? (
                    <>
                      <label className="space-y-1 text-sm">
                        <span className="text-[var(--sdk-color-text-secondary)]">
                          {credentialFieldLabel(
                            IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID,
                            credentialDraft.credentialKind,
                            credentialVendorConfig,
                            messages,
                          )}
                        </span>
                        <Input
                          onChange={(event) =>
                            setCredentialDraft((current) => ({ ...current, accessKeyId: event.target.value }))
                          }
                          value={credentialDraft.accessKeyId}
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="text-[var(--sdk-color-text-secondary)]">
                          {credentialFieldLabel(
                            IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET,
                            credentialDraft.credentialKind,
                            credentialVendorConfig,
                            messages,
                          )}
                        </span>
                        <Input
                          onChange={(event) =>
                            setCredentialDraft((current) => ({ ...current, secretAccessKey: event.target.value }))
                          }
                          type="password"
                          value={credentialDraft.secretAccessKey}
                        />
                      </label>
                    </>
                  ) : (
                    /*
                      One secret, named the way the provider names it — an API token,
                      a service-account key document, plain text — rather than calling
                      all of them the same thing. The kind is still visible above, so
                      the provider's word adds the operator's own console wording
                      without replacing what is being stored.

                      Name and wording both come from the *kind*, never from the
                      field: `service_account_json` and `secret_text` draw this same
                      single box, so a label hung on the field could only ever be
                      right for one of them.
                    */
                    <label className="space-y-1 text-sm">
                      <span className="text-[var(--sdk-color-text-secondary)]">
                        {secretLabelForKind(credentialDraft.credentialKind, credentialVendorConfig)}
                      </span>
                      <Input
                        onChange={(event) =>
                          setCredentialDraft((current) => ({ ...current, secretText: event.target.value }))
                        }
                        type="password"
                        value={credentialDraft.secretText}
                      />
                    </label>
                  )}
                  {/*
                    The session token belongs to the key pair and to nothing else.

                    It is the third part of an STS-style grant — the proof that the
                    pair was issued by the provider — so it means nothing beside a
                    single secret. Offering it for every kind put a box in front of
                    the operator that had to be left empty, and made two different
                    identity shapes render as the same form. The register form
                    derives this from the contract (the token appears there only for
                    `temporary_credential`); the dialog asks the same question of the
                    kind the operator picked, so neither surface can offer a token
                    where the contract says there is none.
                  */}
                  {credentialDraft.credentialKind === IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR ? (
                    <div className="space-y-1 text-sm">
                      <span className="block text-[var(--sdk-color-text-secondary)]">
                        {messages.credentials.sessionToken}
                      </span>
                      <Input
                        aria-label={messages.credentials.sessionToken}
                        onChange={(event) =>
                          setCredentialDraft((current) => ({ ...current, sessionToken: event.target.value }))
                        }
                        type="password"
                        value={credentialDraft.sessionToken}
                      />
                      {/* Outside the label: see the register form's account-id field. */}
                      <p className="text-xs text-[var(--sdk-color-text-muted)]">
                        {messages.credentials.sessionTokenHint}
                      </p>
                    </div>
                  ) : null}
                </div>
              </form>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setCredentialEditorOpen(false)} type="button" variant="secondary">
              {messages.actions.cancel}
            </Button>
            <Button disabled={pending} form={CREDENTIAL_FORM_ID} type="submit">
              {messages.credentials.store}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal onOpenChange={(open) => setEditor(open ? editorMode : undefined)} open={editorMode !== undefined}>
        <ModalContent size="lg">
          <ModalHeader>
            <ModalTitle>
              {editorMode === "edit" ? messages.detail.editTitle : messages.create.title}
            </ModalTitle>
            <ModalDescription>
              {editorMode === "edit" ? editAccount?.displayName : messages.create.description}
            </ModalDescription>
          </ModalHeader>
          <ModalBody>
            {/*
              Same reason as the credential dialog's: this body is the only place a
              refusal can be read while the modal is up, and a register or edit that
              failed in silence is indistinguishable from one that did nothing.
            */}
            {error ? <StatusNotice tone="danger">{error}</StatusNotice> : null}
            {editorMode === "edit" && editAccount ? (
              <form
                className="space-y-3"
                id={EDITOR_FORM_ID}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitEdit(editAccount);
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.displayName}</span>
                    <Input
                      onChange={(event) =>
                        setEditDraft((current) => ({ ...current, displayName: event.target.value }))
                      }
                      value={editDraft.displayName}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.environment}</span>
                    <Select
                      onValueChange={(value) =>
                        setEditDraft((current) => ({ ...current, environment: value }))
                      }
                      value={editDraft.environment}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IAM_CLOUD_ACCOUNT_ENVIRONMENTS.map((environment) => (
                          <SelectItem key={environment} value={environment}>
                            {environmentLabel(environment, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.accountType}</span>
                    <Select
                      onValueChange={(value) =>
                        setEditDraft((current) => ({ ...current, accountType: value }))
                      }
                      value={editDraft.accountType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IAM_CLOUD_ACCOUNT_TYPES.map((accountType) => (
                          <SelectItem key={accountType} value={accountType}>
                            {accountTypeLabel(accountType, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <RegionCombobox
                    clearLabel={messages.create.regionClear}
                    emptyText={messages.create.regionEmpty}
                    hint={regionHintFor(editDraft.vendorCode, messages)}
                    label={messages.create.region}
                    onChange={(regionCode) =>
                      setEditDraft((current) => ({ ...current, regionCode }))
                    }
                    options={listIamCloudAccountVendorRegions(editDraft.vendorCode)}
                    placeholder={messages.create.regionPlaceholder}
                    resolveLabel={(regionCode) => regionLabel(editDraft.vendorCode, regionCode, messages)}
                    value={editDraft.regionCode}
                  />
                </div>
                <CapabilityField
                  hint={messages.create.capabilitiesHint}
                  label={messages.create.capabilities}
                  summary={capabilitySummary(editDraft.capabilityCodes, messages)}
                />
              </form>
            ) : (
              <form
                className="space-y-3"
                id={EDITOR_FORM_ID}
                onSubmit={(event) => {
                  event.preventDefault();
                  submitCreate();
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.provider}</span>
                    <Select
                      onValueChange={(value) =>
                        setCreateDraft((current) => ({
                          ...current,
                          vendorCode: value,
                          // A region is provider-scoped, so one the new provider
                          // does not publish is almost certainly wrong here. A
                          // region *both* providers publish (or an empty field)
                          // is left exactly as it was.
                          regionCode: iamCloudAccountVendorAcceptsRegion(value, current.regionCode)
                            ? current.regionCode
                            : "",
                        }))
                      }
                      value={createDraft.vendorCode}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES.map((vendor) => (
                          <SelectItem key={vendor} value={vendor}>
                            {vendorLabel(vendor, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  {levelIsSelectable ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.ownership}</span>
                      <Select
                        onValueChange={(value) =>
                          setCreateDraft((current) => ({ ...current, scopeType: value as IamCloudAccountScopeLevel }))
                        }
                        value={createDraft.scopeType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {levels.map((level) => (
                            <SelectItem key={level} value={level}>
                              {messages.scope[level]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </label>
                  ) : null}
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.accountCode}</span>
                    <Input
                      onChange={(event) => setCreateDraft((current) => ({ ...current, accountCode: event.target.value }))}
                      placeholder={messages.create.accountCodePlaceholder}
                      value={createDraft.accountCode}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.displayName}</span>
                    <Input
                      onChange={(event) => setCreateDraft((current) => ({ ...current, displayName: event.target.value }))}
                      placeholder={messages.create.displayNamePlaceholder}
                      value={createDraft.displayName}
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.environment}</span>
                    <Select
                      onValueChange={(value) => setCreateDraft((current) => ({ ...current, environment: value }))}
                      value={createDraft.environment}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IAM_CLOUD_ACCOUNT_ENVIRONMENTS.map((environment) => (
                          <SelectItem key={environment} value={environment}>
                            {environmentLabel(environment, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.accountType}</span>
                    <Select
                      onValueChange={(value) => setCreateDraft((current) => ({ ...current, accountType: value }))}
                      value={createDraft.accountType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IAM_CLOUD_ACCOUNT_TYPES.map((accountType) => (
                          <SelectItem key={accountType} value={accountType}>
                            {accountTypeLabel(accountType, messages)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <RegionCombobox
                    clearLabel={messages.create.regionClear}
                    emptyText={messages.create.regionEmpty}
                    hint={regionHintFor(createDraft.vendorCode, messages)}
                    label={messages.create.region}
                    onChange={(regionCode) =>
                      setCreateDraft((current) => ({ ...current, regionCode }))
                    }
                    options={listIamCloudAccountVendorRegions(createDraft.vendorCode)}
                    placeholder={messages.create.regionPlaceholder}
                    resolveLabel={(regionCode) => regionLabel(createDraft.vendorCode, regionCode, messages)}
                    value={createDraft.regionCode}
                  />
                  {/*
                    The account's identifier *on the provider's side*, named the way
                    the provider names it (AWS account id, Azure subscription id, a
                    project id). It is a note rather than a key — the server stores it
                    as `external_account_id` — but it is the only field that says which
                    account a credential belongs to, and it was unreachable from the
                    console entirely: the column existed, `PATCH` accepted it, and no
                    form ever asked. Label and placeholder come from the provider for
                    the same reason the key fields do: an operator looks up the value
                    on the provider's own page.
                  */}
                  <div className="space-y-1 text-sm">
                    <span className="block text-[var(--sdk-color-text-secondary)]">
                      {createVendorConfig.accountIdLabel}
                    </span>
                    <Input
                      aria-label={createVendorConfig.accountIdLabel}
                      onChange={(event) =>
                        setCreateDraft((current) => ({ ...current, externalAccountId: event.target.value }))
                      }
                      placeholder={createVendorConfig.accountIdPlaceholder}
                      value={createDraft.externalAccountId}
                    />
                    {/*
                      The hint is a *sibling* of the field, not a child of its
                      label. A wrapping `<label>` takes its accessible name from
                      everything inside it, so a hint in there renames the field to
                      its own explanation — `getByLabelText` and a screen reader
                      both then see a field called "Alibaba Cloud account id
                      Optional. What the provider calls…". `RegionCombobox` already
                      carries its hint this way, for the same reason.
                    */}
                    <p className="text-xs text-[var(--sdk-color-text-muted)]">
                      {messages.create.accountIdHint}
                    </p>
                  </div>
                  {createDraft.scopeType === IAM_CLOUD_ACCOUNT_SCOPE_ORGANIZATION ? (
                    <label className="space-y-1 text-sm">
                      <span className="text-[var(--sdk-color-text-secondary)]">{messages.create.organizationId}</span>
                      <Input
                        onChange={(event) =>
                          setCreateDraft((current) => ({ ...current, organizationId: event.target.value }))
                        }
                        placeholder={messages.create.organizationIdPlaceholder}
                        value={createDraft.organizationId}
                      />
                    </label>
                  ) : null}
                </div>

                {/*
                  The credential goes in with the account.

                  A registration that stores only the account produces a row that is
                  listed, selectable and resolvable by nothing — resolution walks to a
                  credential and finds none, so the account is unusable while looking
                  perfectly registered. The concrete configuration is therefore asked
                  here, and the two axes that decide it are kept apart: the identity
                  shape chooses *which* fields exist, the provider chooses what they are
                  called.

                  An empty area means one of two different things, so the form says
                  which rather than leaving a gap: a shape that holds no secret on this
                  platform (nothing to type, and why), or a shape that does and was left
                  blank (a warning, not a block — registering now and pasting the key
                  later is a workflow the platform supports, which is why
                  `credentialConfigured` is a column in the listing).
                */}
                <div
                  className="space-y-3 border-t border-[var(--sdk-color-border-subtle)] pt-5"
                  data-slot="cloud-account-create-credentials"
                >
                  <GroupCaption>{messages.create.credentialSection}</GroupCaption>
                  {createCredentialFields.length === 0 ? (
                    /*
                      Per *shape*, not one sentence for the whole family: the three
                      shapes that hold nothing here are empty for three different
                      reasons, and the reason is the only thing the operator can act
                      on — where to grant a role, where to configure an OIDC issuer,
                      where to bind a managed identity. A shared sentence would tell
                      the operator holding a SAML assertion that there is nothing to
                      configure at all.
                    */
                    <p
                      className="text-sm text-[var(--sdk-color-text-secondary)]"
                      data-slot="cloud-account-create-credential-reason"
                    >
                      {credentialNotNeededFor(createDraft.accountType, messages)}
                    </p>
                  ) : (
                    <>
                      {/*
                        What *this* shape asks for, read off the shape.

                        It used to be one paragraph that enumerated all four shapes
                        before saying anything about the selected one, so an operator
                        registering an API key read that a long-term key asks for a
                        pair and a temporary credential adds a session token — three
                        facts about three shapes that were not on screen. Nothing here
                        restates the two rules that a lead-in paragraph also carried:
                        that the credential is written with the account (the group is
                        inside the register form, and `credentialMissingNote` states
                        the consequence at the box that is empty), and that the
                        provider names the fields (the labels *are* the provider's
                        own words).

                        The derived credential kind is deliberately not printed any
                        more either. For every single-secret kind its name is
                        word-for-word the label of the one box directly beneath it —
                        that identity is the invariant the listing depends on, see
                        `credentialKindName` — so the line said "密钥文本" twice inside
                        100px, and for a key pair the two field labels already name
                        both halves. The derivation itself is contract-enforced
                        (`iamCloudAccountTypeCredentialKind` is the only bridge), and
                        the form offers no kind picker at all.
                      */}
                      <p
                        className="max-w-3xl text-sm text-[var(--sdk-color-text-secondary)]"
                        data-slot="cloud-account-create-credential-shape"
                      >
                        {credentialShapeHintFor(createDraft.accountType, messages)}
                      </p>
                      <p className="text-xs text-[var(--sdk-color-text-muted)]">
                        {kindHintForKind(createCredentialKind, createVendorConfig)}
                      </p>
                      <div className="grid gap-3 md:grid-cols-2">
                        {createCredentialFields.map((field) => {
                          const fieldLabel = credentialFieldLabel(
                            field,
                            createCredentialKind,
                            createVendorConfig,
                            messages,
                          );
                          return (
                            // The label is a sibling span plus `aria-label`, not a
                            // wrapping `<label>`, because the session token carries a
                            // hint: a wrapping label would fold the hint into the
                            // field's accessible name.
                            <div className="space-y-1 text-sm" key={field}>
                              <span className="block text-[var(--sdk-color-text-secondary)]">
                                {fieldLabel}
                              </span>
                              <Input
                                aria-label={fieldLabel}
                                /*
                                  The key id stays readable on purpose, as it is in the
                                  credential dialog: the provider prints it in its own
                                  console, so masking it hides nothing an operator does
                                  not already have.
                                */
                                type={
                                  field === IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID
                                    ? "text"
                                    : "password"
                                }
                                onChange={(event) => setCreateCredentialField(field, event.target.value)}
                                value={credentialFieldValue(field, createDraft)}
                              />
                              {field === IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN ? (
                                <p className="text-xs text-[var(--sdk-color-text-muted)]">
                                  {messages.credentials.sessionTokenHint}
                                </p>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      {credentialIsMissing(createDraft) ? (
                        <p className="text-xs text-[var(--sdk-color-state-warning)]">
                          {messages.create.credentialMissingNote}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <CapabilityField
                  hint={messages.create.capabilitiesHint}
                  label={messages.create.capabilities}
                  summary={messages.capabilityAny}
                />

                <label className="flex items-center gap-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  <Checkbox
                    checked={createDraft.isDefault}
                    onCheckedChange={(checked) =>
                      setCreateDraft((current) => ({ ...current, isDefault: checked === true }))
                    }
                  />
                  {/*
                    The level is substituted rather than referred to as "this
                    level": the ownership picker is withheld when the caller may act
                    on exactly one level (see `levelIsSelectable`), and a sentence
                    pointing at a control that is not on screen points at nothing.
                    `scopeLabel` keeps an unrecognised code verbatim, so a server
                    that publishes a level this build does not know still reads back
                    as itself.
                  */}
                  {formatMessage(messages.create.isDefault, {
                    scope: scopeLabel(createDraft.scopeType, messages),
                  })}
                </label>
              </form>
            )}
          </ModalBody>
          <ModalFooter>
            <Button onClick={() => setEditor(undefined)} type="button" variant="secondary">
              {messages.actions.cancel}
            </Button>
            <Button
              disabled={editorMode === "create"
                ? !createDraft.accountCode.trim() || !createDraft.displayName.trim() || pending
                : !editDraft.displayName.trim() || pending}
              form={EDITOR_FORM_ID}
              type="submit"
            >
              {editorMode === "edit" ? messages.actions.save : messages.create.submit}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        cancelLabel={messages.actions.cancel}
        closeOnConfirm={false}
        confirmLabel={messages.actions.delete}
        confirmLoading={pending}
        description={deleteTarget
          ? formatMessage(messages.detail.deleteDescription, { name: deleteTarget.displayName })
          : undefined}
        onConfirm={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setDeleteTarget(undefined);
          }
        }}
        open={deleteTarget !== undefined}
        title={messages.actions.delete}
        tone="danger"
      />
    </div>
  );
}

/**
 * Caption for a group inside a dialog.
 *
 * It carries the same treatment as a section title — size, tracking, colour —
 * without the section's rule: inside a dialog the header already draws the one
 * rule the surface needs, and a second one a few pixels under it reads as two
 * stacked boxes.
 */
function GroupCaption({ children }: { children: ReactNode }) {
  return (
    <h4
      className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]"
      data-slot="cloud-account-group-caption"
    >
      {children}
    </h4>
  );
}

/**
 * One read-only fact of the account.
 *
 * A `dl` pair rather than a table row: these are the labels whose values a
 * listing cannot carry, and they read as a description of one record. The
 * value wraps instead of truncating, because a capability list is the field an
 * operator is most likely to be checking.
 */
function Fact({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0 space-y-1" data-slot="cloud-account-fact">
      <dt className="text-xs text-[var(--sdk-color-text-secondary)]">{label}</dt>
      <dd className="break-words text-sm text-[var(--sdk-color-text-primary)]">{children}</dd>
    </div>
  );
}

/**
 * Capability checkbox grid.
 *
 * The register form and the edit form both write the same field, so both render
 * this instead of each spelling out the vocabulary.
 */
/**
 * The capability line the editor modal shows, in place of a picker.
 *
 * Capability is a *narrowing* of an account that is already keyed by vendor and
 * environment, and the server reads an empty list as "unspecified" — an account
 * with none serves every capability of its provider. That default is the one an
 * operator almost always wants, and the eight-checkbox picker this replaced
 * invited the opposite: checking one box silently removed the account from every
 * other demand — including the DNS one certificate issuance resolves through —
 * and undoing it meant finding the box again.
 *
 * So the field is a read-only fact plus the reason it is not a choice. The value
 * is whatever the server holds: the register form always shows the unspecified
 * case, and the edit form echoes the account's own list rather than dropping it.
 */
function CapabilityField({
  hint,
  label,
  summary,
}: {
  hint: string;
  label: string;
  summary: string;
}) {
  return (
    <div className="space-y-1 text-sm" data-slot="cloud-account-capabilities">
      <span className="text-[var(--sdk-color-text-secondary)]">{label}</span>
      <p className="text-[var(--sdk-color-text-primary)]">{summary}</p>
      <p className="text-xs text-[var(--sdk-color-text-secondary)]">{hint}</p>
    </div>
  );
}

/**
 * Substitute `{key}` placeholders in a catalog string.
 *
 * The catalog resolver hands back plain strings — the provider has no
 * interpolation layer — so the substitution happens where the values are known.
 * A template with no placeholder is returned unchanged, which is why every call
 * site may pass values unconditionally.
 */
function formatMessage(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, value),
    template,
  );
}

/**
 * Localized name for an ownership level.
 *
 * A level read back from the API is always preserved: the vocabulary is a picker,
 * not an enum, so a server may publish one this client does not know yet and the
 * raw code is still what the operator should see.
 */
function scopeLabel(
  scopeType: string | undefined,
  messages: ReturnType<typeof useSdkworkIamCloudAccountConsoleMessages>,
): string {
  if (scopeType && scopeType in messages.scope) {
    return messages.scope[scopeType as IamCloudAccountScopeLevel];
  }
  return scopeType ?? "";
}

/** Localized label for a server status code. An absent status reads as active. */
function statusLabel(
  status: string | undefined,
  messages: ReturnType<typeof useSdkworkIamCloudAccountConsoleMessages>,
): string {
  switch (status) {
    case IAM_CLOUD_ACCOUNT_STATUS_DISABLED:
      return messages.status.disabled;
    case IAM_CLOUD_ACCOUNT_STATUS_DELETED:
      return messages.status.deleted;
    default:
      return messages.status.active;
  }
}

type CloudAccountMessages = ReturnType<typeof useSdkworkIamCloudAccountConsoleMessages>;

/**
 * A label for one code of a closed server vocabulary.
 *
 * Translation is by lookup, never by guess, and a code the catalogue does not
 * carry is rendered **verbatim rather than blanked**. Two real cases need that:
 * `IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES` is a *picker* list, not the contract
 * (the server accepts more vendors than the console offers), and an account can
 * carry a credential kind the picker does not list. Emptying the cell would hide
 * which vendor an account actually belongs to — the one fact the column exists
 * for.
 */
function vocabularyLabel<Code extends string>(
  code: string,
  labels: SdkworkIamCloudAccountVocabularyLabels<Code>,
): string {
  return code in labels ? labels[code as Code] : code;
}

/** Localized provider name. The raw code stays available from the SDK. */
function vendorLabel(vendor: string | undefined, messages: CloudAccountMessages): string {
  return vendor ? vocabularyLabel(vendor, messages.vendor) : "";
}

/** Localized environment name; an absent environment reads as the default one. */
function environmentLabel(
  environment: string | undefined,
  messages: CloudAccountMessages,
): string {
  return vocabularyLabel(environment ?? DEFAULT_ENVIRONMENT, messages.environment);
}

/** Localized identity shape; an absent shape reads as the first the console offers. */
function accountTypeLabel(
  accountType: string | undefined,
  messages: CloudAccountMessages,
): string {
  return vocabularyLabel(accountType ?? IAM_CLOUD_ACCOUNT_TYPES[0], messages.accountType);
}

/**
 * A credential's kind is named by `credentialKindName` rather than here.
 *
 * It was a local lookup into `messages.credentialKind`, which is the platform's own
 * vocabulary — so the same row was named twice: the provider's word above the field
 * that collected it, and this one in the listing and the two kind labels. The
 * resolver lives with the other label rules so the three surfaces cannot drift.
 */

/** What the operator typed into one credential field of the register draft. */
function credentialFieldValue(
  field: IamCloudAccountCredentialField,
  draft: CreateDraft,
): string {
  switch (field) {
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID:
      return draft.accessKeyId;
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET:
      return draft.secretAccessKey;
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT:
      return draft.secretText;
    case IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN:
      return draft.sessionToken;
    default:
      return "";
  }
}

/**
 * The credential the register form currently describes, or nothing.
 *
 * `undefined` in two different situations that the caller must not confuse, which
 * is why the caller asks `iamCloudAccountCredentialFields` itself when it wants to
 * tell them apart: a shape that holds no secret here (correctly nothing to send)
 * and a shape that does but whose fields are still empty (a registration that will
 * not resolve). Both send no credential; only the second one warns.
 *
 * Only the fields the current shape declares are read, so switching the identity
 * shape cannot smuggle a leftover secret into an account that has no place for
 * it — an account typed as a managed identity must not end up with a credential
 * row because a key happened to be left in the draft.
 */
function credentialDraftOf(
  draft: CreateDraft,
): SdkworkIamConsoleCloudAccountCredentialInput | undefined {
  const kind = iamCloudAccountTypeCredentialKind(draft.accountType);
  if (kind === undefined) {
    return undefined;
  }
  const fields = iamCloudAccountCredentialFields(draft.accountType);
  if (fields.every((field) => credentialFieldValue(field, draft).trim().length === 0)) {
    return undefined;
  }
  const credential: SdkworkIamConsoleCloudAccountCredentialInput = { credentialKind: kind };
  if (fields.includes(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_ID)) {
    credential.accessKeyId = draft.accessKeyId.trim();
  }
  if (fields.includes(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_KEY_SECRET)) {
    credential.secretAccessKey = draft.secretAccessKey.trim();
  }
  if (fields.includes(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SECRET_TEXT)) {
    credential.secretText = draft.secretText.trim();
  }
  if (fields.includes(IAM_CLOUD_ACCOUNT_CREDENTIAL_FIELD_SESSION_TOKEN)) {
    credential.sessionToken = draft.sessionToken.trim();
  }
  return credential;
}

/** Whether the current shape holds a secret here and none of its fields was filled in. */
function credentialIsMissing(draft: CreateDraft): boolean {
  const fields = iamCloudAccountCredentialFields(draft.accountType);
  return fields.length > 0
    && fields.every((field) => credentialFieldValue(field, draft).trim().length === 0);
}

/**
 * Localized region name, looked up **against the provider it belongs to**.
 *
 * The lookup is two levels because the codes collide across providers rather than
 * merely differing: `ap-southeast-1` is Singapore for Alibaba Cloud and AWS but
 * China Hong Kong for Huawei Cloud, and `ap-southeast-3` is Malaysia for Alibaba
 * Cloud while Huawei uses it for Singapore. A region name is therefore only
 * meaningful once the provider is known, which is why the catalogue is keyed by
 * provider and this helper takes both codes.
 *
 * A code the catalogue does not carry renders **verbatim**: the operator may have
 * typed a region this console has never heard of, the account may have been moved
 * to a provider added after this shipped, and blanking the cell would hide where
 * the account's resources actually live. An empty region reads as empty, so the
 * caller keeps deciding what absence looks like.
 */
function regionLabel(
  vendorCode: string | undefined,
  regionCode: string | undefined,
  messages: CloudAccountMessages,
): string {
  const code = (regionCode ?? "").trim();
  if (code.length === 0) {
    return "";
  }
  const key = (vendorCode ?? "").trim().toLowerCase();
  const byVendor = messages.region as Readonly<
    Partial<Record<string, Readonly<Record<string, string>>>>
  >;
  return byVendor[key]?.[code] ?? code;
}

/**
 * The account's capabilities as one line.
 *
 * An account with none is not "missing" anything: the server reads an empty list
 * as *unspecified*, and `serves_capability` then matches every capability. So
 * the empty case reads as `capabilityAny` rather than as a dash — a dash would
 * say "none", which is the one thing it does not mean.
 */
function capabilitySummary(codes: readonly string[], messages: CloudAccountMessages): string {
  return codes.length > 0
    ? codes.map((code) => vocabularyLabel(code, messages.capability)).join(" · ")
    : messages.capabilityAny;
}


function emptyCreateDraft(scopeType: IamCloudAccountScopeLevel): CreateDraft {
  return {
    accessKeyId: "",
    accountCode: "",
    accountType: IAM_CLOUD_ACCOUNT_TYPES[0],
    displayName: "",
    environment: DEFAULT_ENVIRONMENT,
    externalAccountId: "",
    isDefault: false,
    organizationId: "",
    regionCode: "",
    scopeType,
    secretAccessKey: "",
    secretText: "",
    sessionToken: "",
    vendorCode: IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES[0],
  };
}

function emptyEditDraft(): EditDraft {
  return {
    accountType: IAM_CLOUD_ACCOUNT_TYPES[0],
    capabilityCodes: [],
    displayName: "",
    environment: DEFAULT_ENVIRONMENT,
    regionCode: "",
    vendorCode: IAM_CLOUD_ACCOUNT_KNOWN_VENDOR_CODES[0],
  };
}

function emptyCredentialDraft(): CredentialDraft {
  return {
    accessKeyId: "",
    credentialKind: IAM_CLOUD_ACCOUNT_CREDENTIAL_KIND_ACCESS_KEY_PAIR,
    credentialName: "",
    secretAccessKey: "",
    secretText: "",
    sessionToken: "",
  };
}
