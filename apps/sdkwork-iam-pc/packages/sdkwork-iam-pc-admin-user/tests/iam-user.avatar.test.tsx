import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SdkworkIamUserAdminWorkspace } from "../src";

/**
 * Avatar upload adoption regression (`DRIVE_SPEC.md` §18.3).
 *
 * The avatar field renders the shared `DriveUploadImage` placeholder in every
 * drawer mode: create parks the pick in the component's controller and the
 * workspace flushes it against the fresh user id after createUser returns
 * (persist first, upload second); edit uploads immediately against the
 * existing id. A failed post-create upload keeps the drawer open as the
 * created user's edit view so the retry cannot create a duplicate. Without a
 * host upload capability the field degrades to the plain URL input — never a
 * local data-URL read.
 */

/** Drawer-scoped queries: the footer submit shares the toolbar button's label. */
function useDrawer() {
  return within(screen.getByRole("dialog"));
}

const uploadedValue = {
  metadata: { drive: { nodeId: "node-9", spaceId: "space-1" } },
  source: "drive" as const,
  uri: "drive://spaces/space-1/nodes/node-9",
};

function createController(overrides: Record<string, unknown> = {}) {
  const user = {
    avatar: undefined,
    avatarUrl: "",
    displayName: "Alice",
    email: "alice@example.com",
    id: "user-1",
    phone: "",
    status: "active",
    userId: "user-1",
    username: "alice",
  };
  return {
    banUser: vi.fn(),
    createUser: vi.fn().mockResolvedValue({ ...user, id: "user-2", userId: "user-2", username: "neo", displayName: "Neo" }),
    deleteUser: vi.fn(),
    getState: () => ({ status: "idle" as const, users: [user] }),
    listUsers: vi.fn().mockResolvedValue([user]),
    loadMoreUsers: vi.fn().mockResolvedValue([]),
    retrieveUser: vi.fn(),
    selectUser: vi.fn().mockResolvedValue(user),
    unbanUser: vi.fn(),
    updateUser: vi.fn().mockImplementation(async (userId: string, body: Record<string, unknown>) => ({ ...user, userId, ...body })),
    ...overrides,
  };
}

function createUploadService(overrides: Record<string, unknown> = {}) {
  return {
    resolvePreview: vi.fn().mockResolvedValue(null),
    upload: vi.fn().mockResolvedValue(uploadedValue),
    ...overrides,
  };
}

function pickAvatarFile(file: File): void {
  const picker = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(picker).not.toBeNull();
  Object.defineProperty(picker, "files", { value: [file] });
  fireEvent.change(picker);
}

describe("user avatar upload adoption", () => {
  it("renders the shared placeholder in create mode and flushes the parked pick after the user exists", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    render(
      <SdkworkIamUserAdminWorkspace
        controller={controller as never}
        driveUploadImageService={uploadService as never}
        locale="zh-CN"
        permissions={{ create: true, delete: false, update: true }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));

    // The placeholder itself is the pick affordance: an upload-icon slot, not
    // a standalone upload button beside a preview circle.
    const drawer = useDrawer();
    expect(await drawer.findByRole("button", { name: "点击或拖拽图片到此处" })).not.toBeNull();
    expect(drawer.queryByRole("button", { name: "上传" })).toBeNull();
    expect(uploadService.upload).not.toHaveBeenCalled();

    pickAvatarFile(new File(["avatar-bytes"], "avatar.png", { type: "image/png" }));
    fireEvent.change(drawer.getByLabelText("用户名"), { target: { value: "neo" } });
    fireEvent.change(drawer.getByLabelText("显示名称"), { target: { value: "Neo" } });
    fireEvent.click(drawer.getByRole("button", { name: "创建用户" }));

    await waitFor(() => expect(controller.createUser).toHaveBeenCalled());
    // Persist first, upload second: the bytes attribute to the fresh user id,
    // then a follow-up update attaches the returned media resource.
    await waitFor(() =>
      expect(uploadService.upload).toHaveBeenCalledWith(expect.objectContaining({ appResourceId: "user-2" })),
    );
    await waitFor(() =>
      expect(controller.updateUser).toHaveBeenCalledWith(
        "user-2",
        expect.objectContaining({
          avatar: expect.objectContaining({ id: "node-9", source: "drive", uri: uploadedValue.uri }),
        }),
      ),
    );
  });

  it("keeps the drawer open as the created user's edit view when the post-create upload fails", async () => {
    const controller = createController();
    const uploadService = createUploadService({
      upload: vi.fn().mockRejectedValueOnce(new Error("drive unavailable")).mockResolvedValue(uploadedValue),
    });
    render(
      <SdkworkIamUserAdminWorkspace
        controller={controller as never}
        driveUploadImageService={uploadService as never}
        locale="zh-CN"
        permissions={{ create: true, delete: false, update: true }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "创建用户" }));
    const drawer = useDrawer();
    await drawer.findByRole("button", { name: "点击或拖拽图片到此处" });
    pickAvatarFile(new File(["avatar-bytes"], "avatar.png", { type: "image/png" }));
    fireEvent.change(drawer.getByLabelText("用户名"), { target: { value: "neo" } });
    fireEvent.change(drawer.getByLabelText("显示名称"), { target: { value: "Neo" } });
    fireEvent.click(drawer.getByRole("button", { name: "创建用户" }));

    // The record exists but the avatar upload failed: the drawer must not sit
    // in create mode (a second submit would duplicate the user), and the
    // field's retry affordance stays reachable.
    await screen.findAllByText("drive unavailable");
    const saveButton = await drawer.findByRole("button", { name: "保存更改" });
    expect(drawer.queryByRole("button", { name: "创建用户" })).toBeNull();

    fireEvent.click(await drawer.findByRole("button", { name: "重试上传" }));
    await waitFor(() => expect(uploadService.upload).toHaveBeenCalledTimes(2));
    fireEvent.click(saveButton);
    await waitFor(() =>
      expect(controller.updateUser).toHaveBeenCalledWith(
        "user-2",
        expect.objectContaining({
          avatar: expect.objectContaining({ source: "drive", uri: uploadedValue.uri }),
        }),
      ),
    );
  });

  it("uploads immediately in edit mode and attaches on save", async () => {
    const controller = createController();
    const uploadService = createUploadService();
    render(
      <SdkworkIamUserAdminWorkspace
        controller={controller as never}
        driveUploadImageService={uploadService as never}
        locale="zh-CN"
        permissions={{ create: true, delete: false, update: true }}
      />,
    );

    await screen.findByText("Alice");
    fireEvent.click(screen.getByRole("button", { name: "编辑用户: Alice" }));
    await screen.findByRole("button", { name: "保存更改" });
    const drawer = useDrawer();

    pickAvatarFile(new File(["avatar-bytes"], "avatar.png", { type: "image/png" }));
    await waitFor(() =>
      expect(uploadService.upload).toHaveBeenCalledWith(expect.objectContaining({ appResourceId: "user-1" })),
    );
    fireEvent.click(drawer.getByRole("button", { name: "保存更改" }));
    await waitFor(() =>
      expect(controller.updateUser).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({
          avatar: expect.objectContaining({ source: "drive", uri: uploadedValue.uri }),
        }),
      ),
    );
  });

  it("offers only the external-URL field when no upload capability is injected", async () => {
    const controller = createController();
    render(
      <SdkworkIamUserAdminWorkspace
        controller={controller as never}
        locale="zh-CN"
        permissions={{ create: true, delete: false, update: true }}
      />,
    );

    await screen.findByText("Alice");
    fireEvent.click(screen.getByRole("button", { name: "编辑用户: Alice" }));
    await screen.findByRole("button", { name: "保存更改" });

    // No pick affordance without a host capability: a local data-URL read
    // would be a fake upload, so the field degrades to the URL input.
    expect(screen.queryByRole("button", { name: "点击或拖拽图片到此处" })).toBeNull();
    expect(screen.getByPlaceholderText("头像图片链接")).not.toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
