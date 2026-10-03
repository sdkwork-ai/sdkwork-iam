import { describe, expect, it, vi } from "vitest";

import { buildSdkworkIamOrganizationTree, createSdkworkIamOrganizationController } from "../src/index";

describe("@sdkwork/iam-pc-admin-organization", () => {
  it("lists organization hierarchy, memberships, departments, and department assignments through the mature Organization system", async () => {
    const service = {
      iam: {
        organizations: {
          list: vi.fn().mockResolvedValue([
            {
              name: "Headquarters",
              organizationId: "org-root",
              tenantBoundaryKind: "root_tenant",
            },
            {
              name: "Research",
              organizationId: "org-child",
              parentOrganizationId: "org-root",
              tenantBoundaryKind: "sub_tenant",
            },
          ]),
          tree: {
            retrieve: vi.fn().mockResolvedValue([
              {
                name: "Headquarters",
                organizationId: "org-root",
                children: [
                  {
                    name: "Research",
                    organizationId: "org-child",
                    parentOrganizationId: "org-root",
                  },
                ],
              },
            ]),
          },
        },
        organizationMemberships: {
          create: vi.fn().mockResolvedValue({
            id: "membership-2",
            membershipId: "membership-2",
            organizationId: "org-child",
            userId: "user-2",
          }),
          list: vi.fn().mockResolvedValue({
            items: [
              {
                displayName: "Alice",
                email: "alice@example.com",
                id: "membership-1",
                membershipId: "membership-1",
                organizationId: "org-child",
                userId: "1",
              },
            ],
          }),
        },
        departments: {
          list: vi.fn().mockResolvedValue({
            items: [
              {
                departmentId: "dept-root",
                name: "Research Center",
                organizationId: "org-child",
              },
              {
                departmentId: "dept-platform",
                name: "Platform",
                organizationId: "org-child",
                parentDepartmentId: "dept-root",
              },
            ],
          }),
          tree: {
            retrieve: vi.fn().mockResolvedValue([
              {
                children: [
                  {
                    departmentId: "dept-platform",
                    name: "Platform",
                    organizationId: "org-child",
                    parentDepartmentId: "dept-root",
                  },
                ],
                departmentId: "dept-root",
                name: "Research Center",
                organizationId: "org-child",
              },
            ]),
          },
        },
        departmentAssignments: {
          list: vi.fn().mockResolvedValue({
            items: [
              {
                departmentAssignmentId: "assignment-1",
                departmentId: "dept-platform",
                displayName: "Alice",
                organizationId: "org-child",
                organizationMembershipId: "membership-1",
                positionName: "Platform Lead",
                userId: "1",
              },
            ],
          }),
        },
        positions: {
          list: vi.fn().mockResolvedValue({
            items: [
              {
                departmentId: "dept-platform",
                name: "Platform Lead",
                positionId: "position-1",
              },
            ],
          }),
        },
        roleBindings: {
          list: vi.fn().mockResolvedValue({
            items: [
              {
                principalId: "membership-1",
                principalKind: "organization_membership",
                roleId: "role-admin",
                scopeId: "org-child",
                scopeKind: "organization",
              },
            ],
          }),
        },
      },
    };

    const controller = createSdkworkIamOrganizationController(service as never);

    await controller.listOrganizations({ tenantId: "100001" });
    expect(controller.getState().tree).toMatchObject([
      {
        children: [
          {
            depth: 1,
            organizationId: "org-child",
          },
        ],
        depth: 0,
        organizationId: "org-root",
      },
    ]);

    await expect(controller.selectOrganization("org-child")).resolves.toMatchObject({
      organizationId: "org-child",
    });
    await expect(controller.listMemberships("org-child")).resolves.toEqual([
      {
        displayName: "Alice",
        email: "alice@example.com",
        id: "membership-1",
        membershipId: "membership-1",
        organizationId: "org-child",
        status: undefined,
        userId: "1",
        username: undefined,
      },
    ]);
    await expect(controller.addMembership("org-child", { userId: "user-2" })).resolves.toMatchObject({
      id: "membership-2",
      membershipId: "membership-2",
      organizationId: "org-child",
      userId: "user-2",
    });
    await expect(controller.listDepartments("org-child")).resolves.toMatchObject([
      {
        departmentId: "dept-root",
      },
      {
        departmentId: "dept-platform",
        parentDepartmentId: "dept-root",
      },
    ]);
    await expect(controller.buildDepartmentTree()).toMatchObject([
      {
        children: [
          {
            departmentId: "dept-platform",
            depth: 1,
          },
        ],
        departmentId: "dept-root",
        depth: 0,
      },
    ]);
    await expect(controller.listDepartmentAssignments("dept-platform")).resolves.toEqual([
      {
        assignmentId: "assignment-1",
        departmentId: "dept-platform",
        displayName: "Alice",
        id: "assignment-1",
        organizationId: "org-child",
        organizationMembershipId: "membership-1",
        positionName: "Platform Lead",
        isPrimary: undefined,
        status: undefined,
        userId: "1",
      },
    ]);
    await expect(controller.listPositions({ departmentId: "dept-platform" })).resolves.toMatchObject([
      {
        positionId: "position-1",
      },
    ]);
    await expect(controller.listRoleBindings({ scopeId: "org-child" })).resolves.toMatchObject([
      {
        principalId: "membership-1",
        scopeKind: "organization",
      },
    ]);

    expect(service.iam.organizations.list).toHaveBeenCalledWith({ page_size: 20, tenantId: "100001" });
    expect(service.iam.organizationMemberships.list).toHaveBeenCalledWith({
      page_size: 20,
      organizationId: "org-child",
    });
    expect(service.iam.organizationMemberships.create).toHaveBeenCalledWith({
      organizationId: "org-child",
      userId: "user-2",
    });
    expect(service.iam.departments.list).toHaveBeenCalledWith({ page_size: 20, organizationId: "org-child" });
    expect(service.iam.departmentAssignments.list).toHaveBeenCalledWith({
      page_size: 20,
      departmentId: "dept-platform",
    });
    expect(service.iam.positions.list).toHaveBeenCalledWith({ page_size: 20, departmentId: "dept-platform" });
    expect(service.iam.roleBindings.list).toHaveBeenCalledWith({ page_size: 20, scopeId: "org-child" });
    expect(Object.prototype.hasOwnProperty.call(service.iam.organizations, "members")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(controller, "listMembers")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(controller, "addMember")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(controller.getState(), "members")).toBe(false);
  });

  it("builds organization trees without a controller", () => {
    expect(
      buildSdkworkIamOrganizationTree([
        {
          id: "root",
          name: "Root",
          organizationId: "root",
        },
        {
          id: "child",
          name: "Child",
          organizationId: "child",
          parentId: "root",
        },
      ]),
    ).toMatchObject([
      {
        children: [
          {
            depth: 1,
            organizationId: "child",
          },
        ],
        depth: 0,
        organizationId: "root",
      },
    ]);
  });

  it("retrieves an organization directly for a refreshable structure route", async () => {
    const retrieve = vi.fn().mockResolvedValue({ name: "Deep-linked organization", organizationId: "org-deep" });
    const controller = createSdkworkIamOrganizationController({
      service: {
        iam: {
          departmentAssignments: { list: vi.fn() },
          departments: { list: vi.fn() },
          organizationMemberships: { list: vi.fn() },
          organizations: { list: vi.fn(), retrieve },
          positions: { list: vi.fn() },
          roleBindings: { list: vi.fn() },
        },
      } as never,
    });

    await expect(controller.selectOrganization("org-deep")).resolves.toMatchObject({
      name: "Deep-linked organization",
      organizationId: "org-deep",
    });
    expect(retrieve).toHaveBeenCalledWith("org-deep");
  });

  it("creates, updates, and deletes organizations, departments, and memberships", async () => {
    const service = {
      iam: {
        organizations: {
          create: vi.fn().mockResolvedValue({ organizationId: "org-new", name: "New Org" }),
          update: vi.fn().mockResolvedValue({ organizationId: "org-new", name: "Updated Org" }),
          delete: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue([]),
        },
        organizationMemberships: {
          create: vi.fn().mockResolvedValue({ membershipId: "m-1", userId: "1", organizationId: "org-new" }),
          update: vi.fn().mockResolvedValue({ membershipId: "m-1", userId: "1", status: "inactive" }),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
        departments: {
          create: vi.fn().mockResolvedValue({ departmentId: "dept-1", name: "Engineering", organizationId: "org-new" }),
          delete: vi.fn().mockResolvedValue(undefined),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
        departmentAssignments: {
          create: vi.fn().mockResolvedValue({ assignmentId: "da-1", departmentId: "dept-1", isPrimary: false, organizationMembershipId: "m-1", userId: "1" }),
          update: vi.fn().mockResolvedValue({ assignmentId: "da-1", departmentId: "dept-1", isPrimary: true, organizationMembershipId: "m-1", userId: "1" }),
          list: vi.fn().mockResolvedValue({ items: [] }),
        },
      },
    };

    const controller = createSdkworkIamOrganizationController({ service: service as never });

    await expect(controller.createOrganization({ name: "New Org" })).resolves.toMatchObject({
      organizationId: "org-new",
    });
    await expect(controller.updateOrganization("org-new", { name: "Updated Org" })).resolves.toMatchObject({
      name: "Updated Org",
    });
    await expect(controller.createDepartment({ name: "Engineering", organizationId: "org-new" })).resolves.toMatchObject({
      departmentId: "dept-1",
    });
    await expect(controller.addMembership("org-new", { userId: "1" })).resolves.toMatchObject({
      userId: "1",
    });
    await expect(controller.updateMembership("m-1", { status: "inactive" })).resolves.toMatchObject({
      status: "inactive",
    });
    await expect(controller.createDepartmentAssignment({ departmentId: "dept-1", organizationMembershipId: "m-1" })).resolves.toMatchObject({
      assignmentId: "da-1",
      isPrimary: false,
    });
    await expect(controller.updateDepartmentAssignment("da-1", { isPrimary: true })).resolves.toMatchObject({
      assignmentId: "da-1",
      isPrimary: true,
    });
    await controller.deleteDepartment("dept-1");
    await controller.deleteOrganization("org-new");

    expect(service.iam.organizations.create).toHaveBeenCalledWith({ name: "New Org" });
    expect(service.iam.departments.create).toHaveBeenCalledWith({ name: "Engineering", organizationId: "org-new" });
    expect(service.iam.organizationMemberships.update).toHaveBeenCalledWith("m-1", { status: "inactive" });
    expect(service.iam.departmentAssignments.create).toHaveBeenCalledWith({ departmentId: "dept-1", organizationMembershipId: "m-1" });
    expect(service.iam.departmentAssignments.update).toHaveBeenCalledWith("da-1", { isPrimary: true });
    expect(service.iam.organizations.delete).toHaveBeenCalledWith("org-new");
  });

  it("normalizes organization drafts into the wire payload the backend create/update handlers read", async () => {
    const create = vi.fn().mockResolvedValue({
      address: "北京市朝阳区",
      code: "sub",
      contactEmail: "contact@sub.example.com",
      contactPhone: "13800000000",
      description: "制造子公司",
      industryCategory: "manufacturing",
      logo: { kind: "image", publicUrl: "data:image/png;base64,AAA", url: "data:image/png;base64,AAA" },
      logoUrl: "data:image/png;base64,AAA",
      name: "制造子公司",
      organizationCategory: "subsidiary",
      organizationId: "org-sub",
      organizationKind: "enterprise",
      parentOrganizationId: "org-root",
    });
    const update = vi.fn().mockResolvedValue({ name: "根组织", organizationId: "org-root" });
    const controller = createSdkworkIamOrganizationController({
      service: {
        iam: {
          departmentAssignments: { list: vi.fn() },
          departments: { list: vi.fn() },
          organizationMemberships: { list: vi.fn() },
          organizations: { create, list: vi.fn().mockResolvedValue([]), update },
          positions: { list: vi.fn() },
          roleBindings: { list: vi.fn() },
        },
      } as never,
    });

    const created = await controller.createOrganization({
      address: "北京市朝阳区",
      code: "sub",
      contactEmail: "contact@sub.example.com",
      contactPhone: "13800000000",
      description: "制造子公司",
      industryCategory: "manufacturing",
      logoUrl: "data:image/png;base64,AAA",
      name: "制造子公司",
      organizationCategory: "子公司",
      organizationKind: "enterprise",
      parentId: "org-root",
    });

    // The backend create handler reads `parentOrganizationId`, never the
    // draft-facing `parentId`; every supplied profile field must survive the
    // rename.
    expect(create).toHaveBeenCalledWith({
      address: "北京市朝阳区",
      code: "sub",
      contactEmail: "contact@sub.example.com",
      contactPhone: "13800000000",
      description: "制造子公司",
      industryCategory: "manufacturing",
      logoUrl: "data:image/png;base64,AAA",
      name: "制造子公司",
      organizationCategory: "子公司",
      organizationKind: "enterprise",
      parentOrganizationId: "org-root",
    });
    expect(created).toMatchObject({
      industryCategory: "manufacturing",
      logoUrl: "data:image/png;base64,AAA",
      organizationCategory: "subsidiary",
      organizationKind: "enterprise",
      parentId: "org-root",
    });

    // An empty parentId is the explicit "move to root" request and must be
    // forwarded as an empty parentOrganizationId, not dropped.
    await controller.updateOrganization("org-root", { name: "根组织", parentId: "" });
    expect(update).toHaveBeenCalledWith("org-root", { name: "根组织", parentOrganizationId: "" });
  });
});
