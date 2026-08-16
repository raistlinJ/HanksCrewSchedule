import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockSql, mockJoin } = vi.hoisted(() => ({
  mockSql: vi.fn(() => ({ sql: "lock-auxiliary-options" })),
  mockJoin: vi.fn((values: string[]) => values),
}));

vi.mock("@rallly/database", () => ({
  Prisma: {
    sql: mockSql,
    join: mockJoin,
  },
}));

describe("validateAuxiliaryVotes", () => {
  const queryRaw = vi.fn();
  const findUnique = vi.fn();
  const findMany = vi.fn();
  const tx = {
    $queryRaw: queryRaw,
    pollAuxiliarySelection: { findUnique },
    pollAuxiliaryOption: { findMany },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryRaw.mockResolvedValue([]);
    findMany.mockResolvedValue([]);
    findUnique.mockResolvedValue({
      minYes: 0,
      maxYesSelections: null,
      options: [
        { id: "role-1", maxYes: null },
        { id: "role-2", maxYes: 2 },
      ],
    });
  });

  it("defaults every omitted choice to not selected", async () => {
    const { validateAuxiliaryVotes } = await import("./mutations");

    await expect(
      validateAuxiliaryVotes({
        tx: tx as never,
        pollId: "poll-1",
        votes: [],
      }),
    ).resolves.toEqual([
      { auxiliaryOptionId: "role-1", type: "no" },
      { auxiliaryOptionId: "role-2", type: "no" },
    ]);
  });

  it("requires the configured minimum number of Yes choices", async () => {
    findUnique.mockResolvedValue({
      minYes: 2,
      maxYesSelections: null,
      options: [
        { id: "role-1", maxYes: null },
        { id: "role-2", maxYes: null },
      ],
    });
    const { validateAuxiliaryVotes } = await import("./mutations");

    await expect(
      validateAuxiliaryVotes({
        tx: tx as never,
        pollId: "poll-1",
        votes: [{ auxiliaryOptionId: "role-1", type: "yes" }],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { code: "AUXILIARY_MINIMUM_NOT_MET" },
    });
  });

  it("rejects a new Yes when a choice has reached its maximum", async () => {
    findMany.mockResolvedValue([
      { id: "role-2", maxYes: 2, _count: { votes: 2 } },
    ]);
    const { validateAuxiliaryVotes } = await import("./mutations");

    await expect(
      validateAuxiliaryVotes({
        tx: tx as never,
        pollId: "poll-1",
        votes: [{ auxiliaryOptionId: "role-2", type: "yes" }],
      }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      cause: { code: "AUXILIARY_OPTION_FULL" },
    });
  });

  it("rejects more Yes choices than one participant is allowed", async () => {
    findUnique.mockResolvedValue({
      minYes: 0,
      maxYesSelections: 1,
      options: [
        { id: "role-1", maxYes: null },
        { id: "role-2", maxYes: null },
      ],
    });
    const { validateAuxiliaryVotes } = await import("./mutations");

    await expect(
      validateAuxiliaryVotes({
        tx: tx as never,
        pollId: "poll-1",
        votes: [
          { auxiliaryOptionId: "role-1", type: "yes" },
          { auxiliaryOptionId: "role-2", type: "yes" },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { code: "AUXILIARY_MAXIMUM_EXCEEDED" },
    });
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("excludes the participant being edited from the Yes count", async () => {
    findMany.mockResolvedValue([
      { id: "role-2", maxYes: 2, _count: { votes: 1 } },
    ]);
    const { validateAuxiliaryVotes } = await import("./mutations");

    await validateAuxiliaryVotes({
      tx: tx as never,
      pollId: "poll-1",
      participantId: "participant-1",
      votes: [{ auxiliaryOptionId: "role-2", type: "yes" }],
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
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

  it("lets administrative QR voting use the not-selected defaults", async () => {
    findUnique.mockResolvedValue({
      minYes: 1,
      maxYesSelections: null,
      options: [{ id: "role-1", maxYes: 1 }],
    });
    const { validateAuxiliaryVotes } = await import("./mutations");

    await expect(
      validateAuxiliaryVotes({
        tx: tx as never,
        pollId: "poll-1",
        votes: [],
        enforceMinimum: false,
      }),
    ).resolves.toEqual([{ auxiliaryOptionId: "role-1", type: "no" }]);
  });
});
