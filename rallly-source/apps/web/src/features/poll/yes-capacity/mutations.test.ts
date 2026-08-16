import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSql, mockJoin } = vi.hoisted(() => ({
  mockSql: vi.fn(() => ({ sql: "lock-options" })),
  mockJoin: vi.fn((values: string[]) => values),
}));

vi.mock("@rallly/database", () => ({
  Prisma: {
    sql: mockSql,
    join: mockJoin,
  },
}));

describe("assertYesCapacity", () => {
  const queryRaw = vi.fn();
  const findMany = vi.fn();
  const tx = {
    $queryRaw: queryRaw,
    option: { findMany },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([]);
  });

  it("allows an unlimited option", async () => {
    findMany.mockResolvedValue([
      { id: "option-1", maxYes: null, _count: { votes: 25 } },
    ]);
    const { assertYesCapacity } = await import("./mutations");

    await expect(
      assertYesCapacity({
        tx: tx as never,
        pollId: "poll-1",
        optionIds: ["option-1"],
      }),
    ).resolves.toBeUndefined();
  });

  it("allows the final available Yes place", async () => {
    findMany.mockResolvedValue([
      { id: "option-1", maxYes: 3, _count: { votes: 2 } },
    ]);
    const { assertYesCapacity } = await import("./mutations");

    await expect(
      assertYesCapacity({
        tx: tx as never,
        pollId: "poll-1",
        optionIds: ["option-1"],
      }),
    ).resolves.toBeUndefined();
  });

  it("rejects another Yes once the maximum is reached", async () => {
    findMany.mockResolvedValue([
      { id: "option-1", maxYes: 3, _count: { votes: 3 } },
    ]);
    const { assertYesCapacity } = await import("./mutations");

    await expect(
      assertYesCapacity({
        tx: tx as never,
        pollId: "poll-1",
        optionIds: ["option-1"],
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      cause: { code: "OPTION_FULL" },
    });
  });

  it("excludes the participant being edited from the Yes count", async () => {
    findMany.mockResolvedValue([
      { id: "option-1", maxYes: 1, _count: { votes: 0 } },
    ]);
    const { assertYesCapacity } = await import("./mutations");

    await assertYesCapacity({
      tx: tx as never,
      pollId: "poll-1",
      optionIds: ["option-1", "option-1"],
      participantId: "participant-1",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ["option-1"] }, pollId: "poll-1" },
        select: expect.objectContaining({
          _count: {
            select: {
              votes: {
                where: {
                  type: "yes",
                  participant: { deleted: false },
                  participantId: { not: "participant-1" },
                },
              },
            },
          },
        }),
      }),
    );
  });
});
