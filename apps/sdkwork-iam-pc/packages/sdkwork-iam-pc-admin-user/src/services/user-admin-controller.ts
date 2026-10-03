import { createSdkWorkPagedListSession } from "@sdkwork/iam-contracts";
import type { SdkworkIamService } from "@sdkwork/iam-service";
import { isBlank, trim } from "@sdkwork/utils";

import type {
  CreateSdkworkIamUserAdminControllerInput,
  SdkworkIamAdminUser,
  SdkworkIamAdminUserDraft,
  SdkworkIamAdminUserState,
  SdkworkIamUserAdminController,
} from "../types/user-admin-types";

export function createSdkworkIamUserAdminController(
  input: SdkworkIamService | CreateSdkworkIamUserAdminControllerInput,
): SdkworkIamUserAdminController {
  const resolved = resolveInput(input);
  let state: SdkworkIamAdminUserState = {
    listPageInfo: undefined,
    selectedUser: undefined,
    status: "idle",
    users: [],
  };

  const usersSession = createSdkWorkPagedListSession({
    fetchPage: (query) => resolved.service.iam.users.list(query),
    mapItem: toUser,
  });

  const setState = (patch: Partial<SdkworkIamAdminUserState>) => {
    state = { ...state, ...patch };
  };

  const controller: SdkworkIamUserAdminController = {
    banUser: async (userId) => {
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        const user = toUser(await resolved.service.iam.users.ban(normalizedUserId));
        if (!user) {
          throw new Error("SDKWork IAM user ban response is missing userId");
        }
        const users = [...state.users.filter((item) => item.userId !== user.userId), user];
        const selectedUser = state.selectedUser?.userId === user.userId ? user : state.selectedUser;
        setState({ selectedUser, status: "ready", users });
        return user;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    createUser: async (body) => {
      requireIdentityField(body);
      setState({ status: "loading" });
      try {
        const user = toUser(await resolved.service.iam.users.create(toUserPayload(body)));
        if (!user) {
          throw new Error("SDKWork IAM user create response is missing userId");
        }
        const users = [...state.users.filter((item) => item.userId !== user.userId), user];
        setState({ selectedUser: user, status: "ready", users });
        return user;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    deleteUser: async (userId) => {
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        await resolved.service.iam.users.delete(normalizedUserId);
        const users = state.users.filter((user) => user.userId !== normalizedUserId);
        const selectedUser = state.selectedUser?.userId === normalizedUserId ? undefined : state.selectedUser;
        setState({ selectedUser, status: "ready", users });
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    getSelectedUser: () => state.selectedUser,
    getState: () => ({
      ...state,
      listPageInfo: state.listPageInfo ? { ...state.listPageInfo } : undefined,
      selectedUser: state.selectedUser ? { ...state.selectedUser } : undefined,
      users: [...state.users],
    }),
    listUsers: async (params) => {
      setState({ lastError: undefined, status: "loading" });
      try {
        const users = await usersSession.list(params) as SdkworkIamAdminUser[];
        const selectedUser = state.selectedUser
          ? users.find((user) => user.userId === state.selectedUser?.userId) ?? state.selectedUser
          : users.find((user) => user.userId === resolved.selectedUserId);
        setState({
          listPageInfo: usersSession.getPageInfo(),
          selectedUser,
          status: "ready",
          users,
        });
        return users;
      } catch (error) {
        setState({
          lastError: error instanceof Error ? error.message : "Failed to load users",
          status: "error",
        });
        throw error;
      }
    },
    loadMoreUsers: async () => {
      setState({ lastError: undefined, status: "loading" });
      try {
        const users = await usersSession.loadMore() as SdkworkIamAdminUser[];
        setState({
          listPageInfo: usersSession.getPageInfo(),
          status: "ready",
          users,
        });
        return users;
      } catch (error) {
        setState({
          lastError: error instanceof Error ? error.message : "Failed to load more users",
          status: "error",
        });
        throw error;
      }
    },
    retrieveUser: async (userId) => {
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        const user = toUser(await resolved.service.iam.users.retrieve(normalizedUserId));
        if (user) {
          const users = [...state.users.filter((item) => item.userId !== user.userId), user];
          setState({ selectedUser: user, status: "ready", users });
        } else {
          setState({ status: "ready" });
        }
        return user;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    selectUser: async (userId) => {
      const normalizedUserId = requireId(userId, "userId");
      const users = state.users.length > 0 ? state.users : await controller.listUsers();
      const selectedUser = users.find((user) => user.userId === normalizedUserId || user.id === normalizedUserId);
      if (selectedUser) {
        setState({ selectedUser });
        return selectedUser;
      }
      return controller.retrieveUser(normalizedUserId);
    },
    updateUser: async (userId, body) => {
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        const user = toUser(
          await resolved.service.iam.users.update(normalizedUserId, toUserPayload(body)),
        );
        if (!user) {
          throw new Error("SDKWork IAM user update response is missing userId");
        }
        const users = [...state.users.filter((item) => item.userId !== user.userId), user];
        const selectedUser = state.selectedUser?.userId === user.userId ? user : state.selectedUser;
        setState({ selectedUser, status: "ready", users });
        return user;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
    unbanUser: async (userId) => {
      const normalizedUserId = requireId(userId, "userId");
      setState({ status: "loading" });
      try {
        const user = toUser(await resolved.service.iam.users.unban(normalizedUserId));
        if (!user) {
          throw new Error("SDKWork IAM user unban response is missing userId");
        }
        const users = [...state.users.filter((item) => item.userId !== user.userId), user];
        const selectedUser = state.selectedUser?.userId === user.userId ? user : state.selectedUser;
        setState({ selectedUser, status: "ready", users });
        return user;
      } catch (error) {
        setState({ status: "error" });
        throw error;
      }
    },
  };

  return controller;
}

function resolveInput(
  input: SdkworkIamService | CreateSdkworkIamUserAdminControllerInput,
): CreateSdkworkIamUserAdminControllerInput {
  if ("service" in input) {
    return input;
  }
  return { service: input };
}

function toUser(value: unknown): SdkworkIamAdminUser | undefined {
  const record = toRecord(value);
  const userId = optionalString(record.userId) || optionalString(record.user_id) || optionalString(record.id);
  if (!userId) {
    return undefined;
  }
  return {
    avatarUrl: optionalString(record.avatarUrl) || avatarSnapshotUrl(record.avatar),
    birthDate: optionalString(record.birthDate) || optionalString(record.birth_date),
    country: optionalString(record.country),
    createdAt: optionalString(record.createdAt) || optionalString(record.created_at),
    displayName: optionalString(record.displayName) || optionalString(record.display_name),
    email: optionalString(record.email),
    gender: optionalString(record.gender),
    id: optionalString(record.id) || userId,
    lastLoginAt: optionalString(record.lastLoginAt) || optionalString(record.last_login_at),
    phone: optionalString(record.phone) || optionalString(record.phoneNumber) || optionalString(record.phone_number),
    status: optionalString(record.status),
    userId,
    username: optionalString(record.username),
  };
}

/**
 * Delivery URL of the avatar media-resource snapshot the backend returns on
 * `avatar`. Reads the camelCase SDK shape first and falls back to the
 * snake_case shape the user-center host serializes.
 */
function avatarSnapshotUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }
  const snapshot = value as Record<string, unknown>;
  return optionalString(snapshot.publicUrl) || optionalString(snapshot.url) || optionalString(snapshot.uri)
    || optionalString(snapshot.public_url);
}

/**
 * Wire body for users.create / users.update. Text fields are trimmed and
 * dropped when blank so a blank draft field leaves the stored value untouched,
 * matching the backend's blank-means-unchanged patch semantics.
 */
function toUserPayload(body: Partial<SdkworkIamAdminUserDraft>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of [
    "username",
    "displayName",
    "email",
    "phone",
    "status",
    "gender",
    "birthDate",
    "country",
    "avatarUrl",
    "initialPassword",
  ] as const) {
    const value = optionalString(body[key]);
    if (value !== undefined) {
      payload[key] = value;
    }
  }
  return payload;
}

function requireIdentityField(body: SdkworkIamAdminUserDraft) {
  if (!optionalString(body.username) && !optionalString(body.email) && !optionalString(body.phone)) {
    throw new Error("SDKWork IAM user create requires username, email, or phone");
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? trim(value) : value === undefined || value === null ? "" : trim(String(value));
  return isBlank(normalized) ? undefined : normalized;
}

function requireId(value: unknown, name: string): string {
  const normalized = optionalString(value);
  if (!normalized) {
    throw new Error(`SDKWork IAM user admin controller requires ${name}`);
  }
  return normalized;
}
