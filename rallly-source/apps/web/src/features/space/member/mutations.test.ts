import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  findMember: vi.fn(),
  countMembers: vi.fn(),
  createMember: vi.fn(),
  deleteInvites: vi.fn(),
  findInvite: vi.fn(),
  updateInvite: vi.fn(),
  createInvite: vi.fn(),
  getTotalSeats: vi.fn(),
  setActiveSpace: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@rallly/database", () => {
  const tx = {
    spaceMember: {
      findUnique: mocks.findMember,
      count: mocks.countMembers,
      create: mocks.createMember,
    },
    spaceMemberInvite: {
      deleteMany: mocks.deleteInvites,
      findFirst: mocks.findInvite,
      update: mocks.updateInvite,
      create: mocks.createInvite,
    },
  };

  return {
    prisma: {
      user: { findUnique: mocks.findUser },
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
});
vi.mock("@rallly/emails/templates/space-invite", () => ({
  sendSpaceInviteEmail: vi.fn(),
}));
vi.mock("@rallly/logger", () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn() }),
}));
vi.mock("@rallly/utils/absolute-url", () => ({ absoluteUrl: vi.fn() }));
vi.mock("@/emails/branding", () => ({ getInstanceBranding: vi.fn() }));
vi.mock("@/features/space/data", () => ({
  getTotalSeatsForSpace: mocks.getTotalSeats,
}));
vi.mock("@/features/user/mutations", () => ({
  setActiveSpace: mocks.setActiveSpace,
}));

import { overrideAcceptInvite } from "./mutations";

describe("overrideAcceptInvite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queues automatic acceptance when the account does not exist yet", async () => {
    mocks.findUser.mockResolvedValue(null);
    mocks.countMembers.mockResolvedValue(1);
    mocks.getTotalSeats.mockResolvedValue(3);
    mocks.findInvite.mockResolvedValue(null);
    mocks.createInvite.mockResolvedValue({ id: "invite-1" });

    await expect(
      overrideAcceptInvite({
        spaceId: "space-1",
        email: "new@example.com",
        role: "member",
        inviterId: "admin-1",
      }),
    ).resolves.toEqual({
      ok: true,
      code: "AUTO_ACCEPT_PENDING",
      memberCount: 1,
    });

    expect(mocks.createMember).not.toHaveBeenCalled();
    expect(mocks.createInvite).toHaveBeenCalledWith({
      data: {
        spaceId: "space-1",
        email: "new@example.com",
        role: "MEMBER",
        inviterId: "admin-1",
        autoAccept: true,
      },
    });
    expect(mocks.setActiveSpace).not.toHaveBeenCalled();
  });

  it("does not add an existing member again", async () => {
    mocks.findUser.mockResolvedValue({ id: "user-1" });
    mocks.findMember.mockResolvedValue({ id: "member-1" });

    await expect(
      overrideAcceptInvite({
        spaceId: "space-1",
        email: "member@example.com",
        role: "member",
        inviterId: "admin-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "ALREADY_MEMBER" });

    expect(mocks.createMember).not.toHaveBeenCalled();
  });

  it("enforces the space seat limit", async () => {
    mocks.findUser.mockResolvedValue({ id: "user-1" });
    mocks.findMember.mockResolvedValue(null);
    mocks.countMembers.mockResolvedValue(3);
    mocks.getTotalSeats.mockResolvedValue(3);

    await expect(
      overrideAcceptInvite({
        spaceId: "space-1",
        email: "member@example.com",
        role: "member",
        inviterId: "admin-1",
      }),
    ).resolves.toEqual({ ok: false, reason: "NOT_ENOUGH_SEATS" });

    expect(mocks.createMember).not.toHaveBeenCalled();
  });

  it("adds the member, clears their pending invite, and activates the space", async () => {
    mocks.findUser.mockResolvedValue({ id: "user-1" });
    mocks.findMember.mockResolvedValue(null);
    mocks.countMembers.mockResolvedValue(1);
    mocks.getTotalSeats.mockResolvedValue(3);
    mocks.createMember.mockResolvedValue({ id: "member-1" });
    mocks.deleteInvites.mockResolvedValue({ count: 1 });

    await expect(
      overrideAcceptInvite({
        spaceId: "space-1",
        email: " MEMBER@Example.com ",
        role: "admin",
        inviterId: "admin-1",
      }),
    ).resolves.toEqual({
      ok: true,
      code: "MEMBER_ADDED",
      memberCount: 2,
      userId: "user-1",
    });

    expect(mocks.findUser).toHaveBeenCalledWith({
      where: { email: "member@example.com" },
      select: { id: true },
    });
    expect(mocks.createMember).toHaveBeenCalledWith({
      data: {
        spaceId: "space-1",
        userId: "user-1",
        role: "ADMIN",
      },
    });
    expect(mocks.deleteInvites).toHaveBeenCalledWith({
      where: {
        spaceId: "space-1",
        email: { equals: "member@example.com", mode: "insensitive" },
      },
    });
    expect(mocks.setActiveSpace).toHaveBeenCalledWith({
      userId: "user-1",
      spaceId: "space-1",
    });
  });
});
