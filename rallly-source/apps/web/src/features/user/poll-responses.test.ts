import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockUserFindUnique,
  mockUserFindMany,
  mockUserDelete,
  mockParticipantFindMany,
  mockParticipantFindFirst,
  mockVoteUpsert,
  mockVoteDeleteMany,
  mockAuxiliaryVoteUpsert,
  mockTransaction,
  mockAssertYesCapacity,
  mockValidateAuxiliaryVotes,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockUserFindMany: vi.fn(),
  mockUserDelete: vi.fn(),
  mockParticipantFindMany: vi.fn(),
  mockParticipantFindFirst: vi.fn(),
  mockVoteUpsert: vi.fn(),
  mockVoteDeleteMany: vi.fn(),
  mockAuxiliaryVoteUpsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockAssertYesCapacity: vi.fn(),
  mockValidateAuxiliaryVotes: vi.fn(),
}));

vi.mock("@rallly/database", () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findMany: mockUserFindMany,
      delete: mockUserDelete,
    },
    participant: {
      findMany: mockParticipantFindMany,
      findFirst: mockParticipantFindFirst,
    },
    vote: {
      upsert: mockVoteUpsert,
      deleteMany: mockVoteDeleteMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/features/poll/yes-capacity/mutations", () => ({
  assertYesCapacity: mockAssertYesCapacity,
}));

vi.mock("@/features/poll/auxiliary-selection/mutations", () => ({
  validateAuxiliaryVotes: mockValidateAuxiliaryVotes,
}));

vi.mock("@/lib/auth", () => ({
  authLib: { $context: Promise.resolve({}) },
}));

vi.mock("@/lib/storage/image-upload", () => ({
  deleteImageFromS3: vi.fn(),
}));

const user = {
  id: "user-1",
  name: "Avery Example",
  email: "avery@example.com",
  image: null,
};

const poll = {
  id: "poll-1",
  title: "August availability",
  status: "open",
  kind: "date",
  timeZone: null,
  pollGroup: null,
  options: [],
};

describe("user poll responses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue(user);
    mockUserFindMany.mockResolvedValue([user]);
    mockParticipantFindMany.mockResolvedValue([]);
    mockParticipantFindFirst.mockResolvedValue({ id: "participant-1" });
    mockVoteUpsert.mockResolvedValue({});
    mockVoteDeleteMany.mockResolvedValue({ count: 1 });
    mockAuxiliaryVoteUpsert.mockResolvedValue({});
    mockValidateAuxiliaryVotes.mockResolvedValue([]);
    mockTransaction.mockImplementation(
      async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          participant: { findFirst: mockParticipantFindFirst },
          vote: { upsert: mockVoteUpsert },
          pollAuxiliaryVote: { upsert: mockAuxiliaryVoteUpsert },
        }),
    );
  });

  it("loads linked and legacy email-matched responses", async () => {
    const legacyResponse = {
      id: "participant-legacy",
      userId: null,
      name: user.name,
      email: user.email,
      createdAt: new Date("2026-08-01T00:00:00Z"),
      updatedAt: null,
      votes: [],
      poll,
    };
    mockParticipantFindMany.mockResolvedValue([legacyResponse]);
    const { getUserPollResponses } = await import("./data");

    const result = await getUserPollResponses(user.id);

    expect(mockParticipantFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { userId: user.id },
            {
              userId: null,
              email: { equals: user.email, mode: "insensitive" },
            },
          ],
        }),
      }),
    );
    expect(result?.responses).toEqual([legacyResponse]);
  });

  it("prefers an account-linked response when the poll also has a legacy response", async () => {
    const createdAt = new Date("2026-08-01T00:00:00Z");
    mockParticipantFindMany.mockResolvedValue([
      {
        id: "participant-legacy",
        userId: null,
        name: user.name,
        email: user.email,
        createdAt,
        updatedAt: null,
        votes: [],
        poll,
      },
      {
        id: "participant-linked",
        userId: user.id,
        name: user.name,
        email: user.email,
        createdAt,
        updatedAt: null,
        votes: [],
        poll,
      },
    ]);
    const { getUserPollResponses } = await import("./data");

    const result = await getUserPollResponses(user.id);

    expect(result?.responses).toHaveLength(1);
    expect(result?.responses[0]?.id).toBe("participant-linked");
  });

  it("builds flat export rows for selected users and their poll options", async () => {
    mockParticipantFindMany.mockResolvedValue([
      {
        userId: user.id,
        email: user.email,
        note: "Morning only",
        createdAt: new Date("2026-08-01T00:00:00Z"),
        updatedAt: new Date("2026-08-02T00:00:00Z"),
        votes: [{ optionId: "option-1", type: "yes" }],
        auxiliaryVotes: [{ auxiliaryOptionId: "role-1", type: "ifNeedBe" }],
        poll: {
          id: poll.id,
          title: poll.title,
          status: poll.status,
          pollGroup: { title: "August shifts" },
          options: [
            {
              id: "option-1",
              startTime: new Date("2026-08-15T15:00:00Z"),
              duration: 60,
              maxYes: 12,
            },
          ],
          auxiliarySelection: {
            name: "Roles",
            minYes: 1,
            maxYesSelections: 1,
            options: [{ id: "role-1", label: "Driver", maxYes: 3 }],
          },
        },
      },
    ]);
    const { getUserResponseExportRows } = await import("./data");

    const rows = await getUserResponseExportRows([user.id]);

    expect(mockUserFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [user.id] }, isAnonymous: false },
      }),
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: user.id,
          userEmail: user.email,
          pollGroup: "August shifts",
          pollId: poll.id,
          optionStart: "2026-08-15T15:00:00.000Z",
          durationMinutes: 60,
          optionMaxYes: 12,
          hasPrimaryYes: "yes",
          responseKind: "pollOption",
          response: "yes",
          note: "Morning only",
        }),
        expect.objectContaining({
          userId: user.id,
          pollId: poll.id,
          responseKind: "auxiliary",
          auxiliarySelection: "Roles",
          auxiliaryMinYes: 1,
          auxiliaryMaxYesSelections: 1,
          auxiliaryOption: "Driver",
          auxiliaryOptionMaxYes: 3,
          response: "ifNeedBe",
        }),
      ]),
    );
    expect(rows).toHaveLength(2);
  });

  it("upserts an edited vote after validating the response belongs to the user", async () => {
    const { updateUserPollResponse } = await import("./mutations");

    const result = await updateUserPollResponse({
      userId: user.id,
      participantId: "participant-1",
      pollId: poll.id,
      optionId: "option-1",
      type: "yes",
    });

    expect(mockParticipantFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "participant-1",
          pollId: poll.id,
          OR: expect.arrayContaining([{ userId: user.id }]),
        }),
      }),
    );
    expect(mockVoteUpsert).toHaveBeenCalledWith({
      where: {
        participantId_optionId: {
          participantId: "participant-1",
          optionId: "option-1",
        },
      },
      create: {
        participantId: "participant-1",
        optionId: "option-1",
        pollId: poll.id,
        type: "yes",
      },
      update: { type: "yes" },
    });
    expect(mockAssertYesCapacity).toHaveBeenCalledWith({
      tx: expect.objectContaining({ vote: { upsert: mockVoteUpsert } }),
      pollId: poll.id,
      participantId: "participant-1",
      optionIds: ["option-1"],
    });
    expect(result).toEqual({ ok: true });
  });

  it("can clear a vote and rejects responses that do not belong to the user", async () => {
    const { updateUserPollResponse } = await import("./mutations");

    await updateUserPollResponse({
      userId: user.id,
      participantId: "participant-1",
      pollId: poll.id,
      optionId: "option-1",
      type: null,
    });

    expect(mockVoteDeleteMany).toHaveBeenCalledWith({
      where: {
        participantId: "participant-1",
        optionId: "option-1",
        pollId: poll.id,
      },
    });
    expect(mockUserDelete).not.toHaveBeenCalled();

    mockParticipantFindFirst.mockResolvedValueOnce(null);
    const rejected = await updateUserPollResponse({
      userId: user.id,
      participantId: "participant-other",
      pollId: poll.id,
      optionId: "option-1",
      type: "no",
    });

    expect(rejected).toEqual({ ok: false, reason: "response_not_found" });
    expect(mockVoteUpsert).not.toHaveBeenCalled();
  });

  it("edits an auxiliary response while enforcing its Yes maximum", async () => {
    mockParticipantFindFirst.mockResolvedValueOnce({
      id: "participant-1",
      auxiliaryVotes: [{ auxiliaryOptionId: "role-1", type: "ifNeedBe" }],
    });
    mockValidateAuxiliaryVotes.mockResolvedValueOnce([
      { auxiliaryOptionId: "role-1", type: "yes" },
    ]);
    const { updateUserPollAuxiliaryResponse } = await import("./mutations");

    const result = await updateUserPollAuxiliaryResponse({
      userId: user.id,
      participantId: "participant-1",
      pollId: poll.id,
      auxiliaryOptionId: "role-1",
      type: "yes",
    });

    expect(mockValidateAuxiliaryVotes).toHaveBeenCalledWith(
      expect.objectContaining({
        pollId: poll.id,
        participantId: "participant-1",
        enforceMinimum: false,
        votes: [{ auxiliaryOptionId: "role-1", type: "yes" }],
      }),
    );
    expect(mockAuxiliaryVoteUpsert).toHaveBeenCalledWith({
      where: {
        participantId_auxiliaryOptionId: {
          participantId: "participant-1",
          auxiliaryOptionId: "role-1",
        },
      },
      create: {
        participantId: "participant-1",
        auxiliaryOptionId: "role-1",
        pollId: poll.id,
        type: "yes",
      },
      update: { type: "yes" },
    });
    expect(result).toEqual({ ok: true });
  });
});
