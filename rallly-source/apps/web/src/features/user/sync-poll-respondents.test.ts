import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockParticipantFindMany,
  mockParticipantUpdateMany,
  mockUserFindMany,
  mockUserCreateMany,
} = vi.hoisted(() => ({
  mockParticipantFindMany: vi.fn(),
  mockParticipantUpdateMany: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserCreateMany: vi.fn(),
}));

vi.mock("@rallly/database", () => ({
  Prisma: {},
  prisma: {
    participant: {
      findMany: mockParticipantFindMany,
      updateMany: mockParticipantUpdateMany,
    },
    user: {
      findMany: mockUserFindMany,
      createMany: mockUserCreateMany,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  authLib: { $context: Promise.resolve({}) },
}));

vi.mock("@/lib/storage/image-upload", () => ({
  deleteImageFromS3: vi.fn(),
}));

describe("syncPollRespondentsToUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCreateMany.mockResolvedValue({ count: 1 });
    mockParticipantUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("creates one user per normalized respondent email and links every matching response", async () => {
    mockParticipantFindMany.mockResolvedValue([
      {
        name: "Older Name",
        email: "AVERY@example.com",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: null,
      },
      {
        name: "Current Name",
        email: "avery@example.com",
        createdAt: new Date("2026-08-02T00:00:00Z"),
        updatedAt: new Date("2026-08-03T00:00:00Z"),
      },
      {
        name: "Existing User",
        email: "existing@example.com",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: null,
      },
      {
        name: "Invalid",
        email: "not-an-email",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: null,
      },
    ]);
    mockUserFindMany
      .mockResolvedValueOnce([{ email: "existing@example.com" }])
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "avery@example.com",
          banned: false,
          deletedAt: null,
          isAnonymous: false,
        },
        {
          id: "user-2",
          email: "existing@example.com",
          banned: false,
          deletedAt: null,
          isAnonymous: false,
        },
      ]);
    mockParticipantUpdateMany
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 1 });
    const { syncPollRespondentsToUsers } = await import("./mutations");

    const result = await syncPollRespondentsToUsers();

    expect(mockUserCreateMany).toHaveBeenCalledWith({
      data: [
        {
          email: "avery@example.com",
          name: "Current Name",
          emailVerified: false,
          role: "user",
        },
      ],
      skipDuplicates: true,
    });
    expect(mockParticipantUpdateMany).toHaveBeenCalledWith({
      where: {
        deleted: false,
        email: { equals: "avery@example.com", mode: "insensitive" },
        poll: { deleted: false },
        OR: [{ userId: null }, { userId: { not: "user-1" } }],
      },
      data: { userId: "user-1" },
    });
    expect(result).toEqual({
      respondents: 2,
      createdUsers: 1,
      linkedResponses: 3,
      skippedEmails: 1,
    });
  });

  it("is idempotent when the respondent and responses are already linked", async () => {
    mockParticipantFindMany.mockResolvedValue([
      {
        name: "Avery Example",
        email: "avery@example.com",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: null,
      },
    ]);
    mockUserFindMany
      .mockResolvedValueOnce([{ email: "avery@example.com" }])
      .mockResolvedValueOnce([
        {
          id: "user-1",
          email: "avery@example.com",
          banned: false,
          deletedAt: null,
          isAnonymous: false,
        },
      ]);
    mockParticipantUpdateMany.mockResolvedValue({ count: 0 });
    const { syncPollRespondentsToUsers } = await import("./mutations");

    await expect(syncPollRespondentsToUsers()).resolves.toEqual({
      respondents: 1,
      createdUsers: 0,
      linkedResponses: 0,
      skippedEmails: 0,
    });
    expect(mockUserCreateMany).not.toHaveBeenCalled();
  });
});
