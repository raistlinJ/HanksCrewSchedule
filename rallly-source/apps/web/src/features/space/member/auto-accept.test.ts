import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findInvites: vi.fn(),
  findMember: vi.fn(),
  countMembers: vi.fn(),
  upsertMember: vi.fn(),
  deleteInvites: vi.fn(),
  getTotalSeats: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@rallly/database", () => {
  const tx = {
    spaceMemberInvite: {
      findMany: mocks.findInvites,
      deleteMany: mocks.deleteInvites,
    },
    spaceMember: {
      findUnique: mocks.findMember,
      count: mocks.countMembers,
      upsert: mocks.upsertMember,
    },
  };

  return {
    prisma: {
      $transaction: vi.fn((callback: (transaction: typeof tx) => unknown) =>
        callback(tx),
      ),
    },
  };
});
vi.mock("@/features/space/data", () => ({
  getTotalSeatsForSpace: mocks.getTotalSeats,
}));

import { claimAutoAcceptedSpaceInvites } from "./auto-accept/mutations";

describe("claimAutoAcceptedSpaceInvites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when no override invitations are pending", async () => {
    mocks.findInvites.mockResolvedValue([]);

    await expect(
      claimAutoAcceptedSpaceInvites({
        userId: "user-1",
        email: "member@example.com",
      }),
    ).resolves.toBe(0);

    expect(mocks.upsertMember).not.toHaveBeenCalled();
    expect(mocks.deleteInvites).not.toHaveBeenCalled();
  });

  it("claims every override invitation for the account email", async () => {
    mocks.findInvites.mockResolvedValue([
      { id: "invite-1", spaceId: "space-1", role: "MEMBER" },
      { id: "invite-2", spaceId: "space-2", role: "ADMIN" },
    ]);
    mocks.findMember.mockResolvedValue(null);
    mocks.countMembers.mockResolvedValue(1);
    mocks.getTotalSeats.mockResolvedValue(3);
    mocks.upsertMember.mockResolvedValue({ id: "member-1" });
    mocks.deleteInvites.mockResolvedValue({ count: 2 });

    await expect(
      claimAutoAcceptedSpaceInvites({
        userId: "user-1",
        email: "Member@Example.com",
      }),
    ).resolves.toBe(2);

    expect(mocks.findInvites).toHaveBeenCalledWith({
      where: {
        autoAccept: true,
        email: { equals: "Member@Example.com", mode: "insensitive" },
      },
      select: { id: true, spaceId: true, role: true },
    });
    expect(mocks.upsertMember).toHaveBeenNthCalledWith(1, {
      where: { spaceId_userId: { spaceId: "space-1", userId: "user-1" } },
      create: { spaceId: "space-1", userId: "user-1", role: "MEMBER" },
      update: {},
    });
    expect(mocks.upsertMember).toHaveBeenNthCalledWith(2, {
      where: { spaceId_userId: { spaceId: "space-2", userId: "user-1" } },
      create: { spaceId: "space-2", userId: "user-1", role: "ADMIN" },
      update: {},
    });
    expect(mocks.deleteInvites).toHaveBeenCalledWith({
      where: { id: { in: ["invite-1", "invite-2"] } },
    });
  });

  it("leaves the override pending if its space filled up", async () => {
    mocks.findInvites.mockResolvedValue([
      { id: "invite-1", spaceId: "space-1", role: "MEMBER" },
    ]);
    mocks.findMember.mockResolvedValue(null);
    mocks.countMembers.mockResolvedValue(3);
    mocks.getTotalSeats.mockResolvedValue(3);

    await expect(
      claimAutoAcceptedSpaceInvites({
        userId: "user-1",
        email: "member@example.com",
      }),
    ).resolves.toBe(0);

    expect(mocks.upsertMember).not.toHaveBeenCalled();
    expect(mocks.deleteInvites).not.toHaveBeenCalled();
  });
});
