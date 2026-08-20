import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFindMany, mockCount } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@rallly/database", () => ({
  prisma: {
    space: {
      findMany: mockFindMany,
      count: mockCount,
    },
  },
}));

describe("listAllSpaces", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("lists every space without filtering out registered-user spaces", async () => {
    const spaces = [
      { id: "space-1", owner: { isAnonymous: false } },
      { id: "space-2", owner: { isAnonymous: true } },
    ];
    mockFindMany.mockResolvedValue(spaces);
    mockCount.mockResolvedValue(2);
    const { listAllSpaces } = await import("./data");

    await expect(listAllSpaces({ page: 1, pageSize: 20 })).resolves.toEqual({
      spaces,
      total: 2,
    });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ where: expect.anything() }),
    );
  });

  it("searches by space name or owner identity", async () => {
    const { listAllSpaces } = await import("./data");

    await listAllSpaces({ page: 2, pageSize: 10, q: "avery" });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { name: { contains: "avery", mode: "insensitive" } },
            {
              owner: {
                name: { contains: "avery", mode: "insensitive" },
              },
            },
            {
              owner: {
                email: { contains: "avery", mode: "insensitive" },
              },
            },
          ],
        },
        skip: 10,
        take: 10,
      }),
    );
  });
});
