import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUserFindMany, mockParticipantFindMany } = vi.hoisted(() => ({
  mockUserFindMany: vi.fn(),
  mockParticipantFindMany: vi.fn(),
}));

vi.mock("@rallly/database", () => ({
  prisma: {
    user: { findMany: mockUserFindMany },
    participant: { findMany: mockParticipantFindMany },
  },
}));

describe("user cleanup candidates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindMany.mockResolvedValue([
      { id: "unused", name: "Unused User", email: "unused@example.com" },
      {
        id: "legacy",
        name: "Legacy Participant",
        email: "legacy@example.com",
      },
    ]);
    mockParticipantFindMany.mockResolvedValue([
      { email: "LEGACY@example.com" },
    ]);
  });

  it("keeps linked and legacy email-matched poll participants out of cleanup", async () => {
    const { getUserCleanupCandidates } = await import("./data");

    const result = await getUserCleanupCandidates({
      excludeUserId: "current-admin",
    });

    expect(result).toEqual({
      users: [
        { id: "unused", name: "Unused User", email: "unused@example.com" },
      ],
      hasMore: false,
    });
    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "current-admin" },
          role: "user",
          isAnonymous: false,
          deletedAt: null,
          customerId: null,
          participants: { none: { deleted: false } },
          polls: { none: {} },
          pollGroups: { none: {} },
          spaces: { none: {} },
          memberOf: { none: {} },
          subscriptions: { none: { active: true } },
        }),
      }),
    );
    expect(mockParticipantFindMany).toHaveBeenCalledWith({
      where: {
        deleted: false,
        userId: null,
        email: { in: ["unused@example.com", "legacy@example.com"] },
      },
      select: { email: true },
      distinct: ["email"],
    });
  });

  it("limits a confirmation-time recheck to the requested users", async () => {
    mockUserFindMany.mockResolvedValue([]);
    const { getUserCleanupCandidates } = await import("./data");

    await getUserCleanupCandidates({
      excludeUserId: "current-admin",
      userIds: ["candidate-1", "candidate-2"],
    });

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: {
            in: ["candidate-1", "candidate-2"],
            not: "current-admin",
          },
        }),
      }),
    );
  });
});
