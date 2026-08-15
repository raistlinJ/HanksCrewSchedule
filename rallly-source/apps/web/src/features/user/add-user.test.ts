import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUserCreate, mockSpaceMemberCreateMany, mockTransaction } =
  vi.hoisted(() => ({
    mockUserCreate: vi.fn(),
    mockSpaceMemberCreateMany: vi.fn(),
    mockTransaction: vi.fn(),
  }));

const transaction = {
  user: { create: mockUserCreate },
  spaceMember: { createMany: mockSpaceMemberCreateMany },
};

vi.mock("@rallly/database", () => ({
  prisma: {
    $transaction: mockTransaction,
  },
}));

vi.mock("@/lib/auth", () => ({
  authLib: { $context: Promise.resolve({}) },
}));

vi.mock("@/lib/storage/image-upload", () => ({
  deleteImageFromS3: vi.fn(),
}));

describe("createUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCreate.mockResolvedValue({ id: "user-1" });
    mockSpaceMemberCreateMany.mockResolvedValue({ count: 2 });
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it("creates the selected account role and space memberships atomically", async () => {
    const { createUser } = await import("./mutations");

    const result = await createUser({
      name: "Avery Example",
      email: "AVERY@EXAMPLE.COM",
      emailVerified: false,
      role: "admin",
      spaceIds: ["space-1", "space-2"],
    });

    expect(mockTransaction).toHaveBeenCalledOnce();
    expect(mockUserCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Avery Example",
        email: "avery@example.com",
        emailVerified: false,
        role: "admin",
      }),
    });
    expect(mockSpaceMemberCreateMany).toHaveBeenCalledWith({
      data: [
        { spaceId: "space-1", userId: "user-1", role: "MEMBER" },
        { spaceId: "space-2", userId: "user-1", role: "MEMBER" },
      ],
    });
    expect(result).toEqual({ id: "user-1" });
  });

  it("does not create memberships when no spaces are selected", async () => {
    const { createUser } = await import("./mutations");

    await createUser({
      name: "Avery Example",
      email: "avery@example.com",
      role: "user",
    });

    expect(mockSpaceMemberCreateMany).not.toHaveBeenCalled();
  });
});
