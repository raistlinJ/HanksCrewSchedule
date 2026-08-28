import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMembership: vi.fn(),
  effectiveWhere: vi.fn((userId: string) => ({
    userId,
    OR: [{ space: { tier: "pro" } }],
  })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@rallly/database", () => ({
  prisma: {
    spaceMember: { findFirst: mocks.findMembership },
    spaceMemberInvite: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));
vi.mock("@/features/space/member/utils", () => ({
  effectiveSpaceMemberWhere: ({ userId }: { userId: string }) =>
    mocks.effectiveWhere(userId),
}));

import { getAvailableSpaceMembership } from "./data";

describe("getAvailableSpaceMembership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("checks that the selected space is an effective membership for the user", async () => {
    mocks.findMembership.mockResolvedValue({ id: "member-1" });

    await expect(
      getAvailableSpaceMembership({
        userId: "user-1",
        spaceId: "space-1",
      }),
    ).resolves.toEqual({ id: "member-1" });

    expect(mocks.findMembership).toHaveBeenCalledWith({
      where: {
        spaceId: "space-1",
        userId: "user-1",
        OR: [{ space: { tier: "pro" } }],
      },
      select: { id: true },
    });
  });
});
