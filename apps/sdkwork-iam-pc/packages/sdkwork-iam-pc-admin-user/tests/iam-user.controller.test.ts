import { describe, expect, it, vi } from "vitest";

import { createSdkworkIamUserAdminController } from "../src/index";

describe("@sdkwork/iam-pc-admin-user", () => {
  it("lists and selects users through the standard IAM backend service", async () => {
    const service = {
      iam: {
        users: {
          list: vi.fn().mockResolvedValue({
            items: [
              {
                createdAt: "2026-01-02T03:04:05Z",
                displayName: "Alice",
                email: "alice@example.com",
                id: "1",
                lastLoginAt: "2026-08-01T10:00:00Z",
                status: "active",
                userId: "1",
                username: "alice",
              },
            ],
          }),
          retrieve: vi.fn().mockResolvedValue({
            displayName: "Alice",
            id: "1",
            userId: "1",
          }),
        },
      },
    };

    const controller = createSdkworkIamUserAdminController({
      selectedUserId: "1",
      service: service as never,
    });

    await expect(controller.listUsers()).resolves.toEqual([
      {
        createdAt: "2026-01-02T03:04:05Z",
        displayName: "Alice",
        email: "alice@example.com",
        id: "1",
        lastLoginAt: "2026-08-01T10:00:00Z",
        phone: undefined,
        status: "active",
        userId: "1",
        username: "alice",
      },
    ]);
    await expect(controller.selectUser("1")).resolves.toMatchObject({ userId: "1" });
    expect(service.iam.users.list).toHaveBeenCalledWith({ page_size: 20 });
    expect(controller.getSelectedUser()).toMatchObject({ userId: "1" });
  });

  it("passes status and search filters through to the backend list call", async () => {
    const service = {
      iam: {
        users: {
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
      },
    };

    const controller = createSdkworkIamUserAdminController({ service: service as never });

    await controller.listUsers({ q: "alice", status: "banned", page_size: 50 });
    expect(service.iam.users.list).toHaveBeenCalledWith({
      page_size: 50,
      q: "alice",
      status: "banned",
    });
  });

  it("creates, updates, deletes, bans, and unbans users through backend IAM resources", async () => {
    const service = {
      iam: {
        users: {
          create: vi.fn().mockResolvedValue({ userId: "user-2", username: "bob", email: "bob@example.com" }),
          update: vi.fn().mockResolvedValue({ userId: "user-2", displayName: "Bob Updated" }),
          delete: vi.fn().mockResolvedValue(undefined),
          ban: vi.fn().mockResolvedValue({ userId: "user-2", status: "banned" }),
          unban: vi.fn().mockResolvedValue({ userId: "user-2", status: "active" }),
          list: vi.fn().mockResolvedValue({ items: [] }),
          retrieve: vi.fn().mockResolvedValue({ userId: "user-2" }),
        },
      },
    };

    const controller = createSdkworkIamUserAdminController({ service: service as never });

    await expect(controller.createUser({ username: "bob", email: "bob@example.com" })).resolves.toMatchObject({
      userId: "user-2",
    });
    await expect(controller.updateUser("user-2", { displayName: "Bob Updated" })).resolves.toMatchObject({
      displayName: "Bob Updated",
    });
    await expect(controller.banUser("user-2")).resolves.toMatchObject({ status: "banned" });
    await expect(controller.unbanUser("user-2")).resolves.toMatchObject({ status: "active" });
    await controller.deleteUser("user-2");

    expect(service.iam.users.create).toHaveBeenCalledWith({ username: "bob", email: "bob@example.com" });
    expect(service.iam.users.update).toHaveBeenCalledWith("user-2", { displayName: "Bob Updated" });
    expect(service.iam.users.ban).toHaveBeenCalledWith("user-2");
    expect(service.iam.users.unban).toHaveBeenCalledWith("user-2");
    expect(service.iam.users.delete).toHaveBeenCalledWith("user-2");
  });

  it("carries profile fields, the avatar, and the initial password through create and update", async () => {
    const service = {
      iam: {
        users: {
          create: vi.fn().mockResolvedValue({
            avatar: { kind: "image", publicUrl: "https://cdn.example.com/a.png", source: "external_url", url: "https://cdn.example.com/a.png" },
            birthDate: "1998-07-15",
            country: "CN",
            gender: "female",
            userId: "user-3",
            username: "carol",
          }),
          update: vi.fn().mockResolvedValue({
            avatar: { public_url: "https://cdn.example.com/b.png" },
            birthDate: "1999-01-02",
            country: "JP",
            gender: "male",
            userId: "user-3",
          }),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
      },
    };

    const controller = createSdkworkIamUserAdminController({ service: service as never });

    await expect(controller.createUser({
      avatarUrl: " https://cdn.example.com/a.png ",
      birthDate: "1998-07-15",
      country: "CN",
      displayName: "Carol",
      gender: "female",
      initialPassword: "Initial#2026",
      phone: "",
      username: "carol",
    })).resolves.toMatchObject({
      avatarUrl: "https://cdn.example.com/a.png",
      birthDate: "1998-07-15",
      country: "CN",
      gender: "female",
      userId: "user-3",
    });

    expect(service.iam.users.create).toHaveBeenCalledWith({
      avatarUrl: "https://cdn.example.com/a.png",
      birthDate: "1998-07-15",
      country: "CN",
      displayName: "Carol",
      gender: "female",
      initialPassword: "Initial#2026",
      username: "carol",
    });

    await expect(controller.updateUser("user-3", {
      avatarUrl: "https://cdn.example.com/b.png",
      birthDate: "1999-01-02",
      country: "JP",
      displayName: "",
      gender: "male",
    })).resolves.toMatchObject({
      avatarUrl: "https://cdn.example.com/b.png",
      userId: "user-3",
    });

    // Blank fields are dropped instead of overwriting stored values, and the
    // update response's snake_case avatar snapshot still resolves to a URL.
    expect(service.iam.users.update).toHaveBeenCalledWith("user-3", {
      avatarUrl: "https://cdn.example.com/b.png",
      birthDate: "1999-01-02",
      country: "JP",
      gender: "male",
    });
  });

  it("passes the drive-backed avatar resource object through create and update", async () => {
    const driveResource = {
      fileName: "avatar.png",
      id: "node_1",
      kind: "image",
      metadata: { drive: { nodeId: "node_1", spaceId: "space_1" } },
      mimeType: "image/png",
      sizeBytes: "12",
      source: "drive",
      uri: "drive://spaces/space_1/nodes/node_1",
    };
    const service = {
      iam: {
        users: {
          create: vi.fn().mockResolvedValue({
            avatar: driveResource,
            userId: "user-4",
            username: "dave",
          }),
          list: vi.fn().mockResolvedValue({ items: [] }),
          retrieve: vi.fn().mockResolvedValue({ userId: "user-4" }),
          update: vi.fn().mockResolvedValue({ avatar: driveResource, userId: "user-4" }),
        },
      },
    };

    const controller = createSdkworkIamUserAdminController({ service: service as never });

    // Create stores the resource object; the response carries the full
    // resource so the workspace can resolve a drive-backed preview.
    await expect(controller.createUser({
      avatar: driveResource,
      displayName: "Dave",
      username: "dave",
    })).resolves.toMatchObject({
      avatar: { uri: "drive://spaces/space_1/nodes/node_1" },
      avatarUrl: "drive://spaces/space_1/nodes/node_1",
      userId: "user-4",
    });
    expect(service.iam.users.create).toHaveBeenCalledWith({
      avatar: driveResource,
      displayName: "Dave",
      username: "dave",
    });

    // Attach-after-create flow: the follow-up update carries the resource.
    await controller.updateUser("user-4", { avatar: driveResource });
    expect(service.iam.users.update).toHaveBeenCalledWith("user-4", { avatar: driveResource });
  });
});
