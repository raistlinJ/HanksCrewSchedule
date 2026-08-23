import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockParticipantFindFirst,
  mockParticipantFindMany,
  mockUserUpsert,
  mockParticipantCreate,
  mockParticipantUpdateMany,
  mockPollAuxiliaryVoteCreateMany,
  mockTransaction,
  mockValidateAuxiliaryVotes,
} = vi.hoisted(() => ({
  mockParticipantFindFirst: vi.fn(),
  mockParticipantFindMany: vi.fn(),
  mockUserUpsert: vi.fn(),
  mockParticipantCreate: vi.fn(),
  mockParticipantUpdateMany: vi.fn(),
  mockPollAuxiliaryVoteCreateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockValidateAuxiliaryVotes: vi.fn(),
}));

const transaction = {
  user: { upsert: mockUserUpsert },
  participant: {
    create: mockParticipantCreate,
    findMany: mockParticipantFindMany,
    updateMany: mockParticipantUpdateMany,
  },
  pollAuxiliaryVote: { createMany: mockPollAuxiliaryVoteCreateMany },
};

vi.mock("@rallly/database", () => ({
  prisma: {
    participant: {
      findFirst: mockParticipantFindFirst,
      updateMany: mockParticipantUpdateMany,
    },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/features/poll/auxiliary-selection/mutations", () => ({
  validateAuxiliaryVotes: mockValidateAuxiliaryVotes,
}));

describe("addUserAsPollParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParticipantFindFirst.mockResolvedValue(null);
    mockParticipantFindMany.mockResolvedValue([]);
    mockUserUpsert.mockResolvedValue({
      id: "user-1",
      banned: false,
      deletedAt: null,
      isAnonymous: false,
    });
    mockParticipantCreate.mockResolvedValue({ id: "participant-1" });
    mockParticipantUpdateMany.mockResolvedValue({ count: 0 });
    mockPollAuxiliaryVoteCreateMany.mockResolvedValue({ count: 0 });
    mockValidateAuxiliaryVotes.mockResolvedValue([]);
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it("creates one user and links that user across every poll in a group", async () => {
    mockParticipantCreate
      .mockResolvedValueOnce({ id: "participant-1" })
      .mockResolvedValueOnce({ id: "participant-2" });
    const { addUserAsPollGroupParticipant } = await import("./mutations");

    const result = await addUserAsPollGroupParticipant({
      pollIds: ["poll-1", "poll-2"],
      name: "Avery Example",
      email: " AVERY@EXAMPLE.COM ",
    });

    expect(mockUserUpsert).toHaveBeenCalledTimes(1);
    expect(mockParticipantCreate).toHaveBeenNthCalledWith(1, {
      data: {
        pollId: "poll-1",
        name: "Avery Example",
        email: "avery@example.com",
        userId: "user-1",
      },
      select: { id: true },
    });
    expect(mockParticipantCreate).toHaveBeenNthCalledWith(2, {
      data: {
        pollId: "poll-2",
        name: "Avery Example",
        email: "avery@example.com",
        userId: "user-1",
      },
      select: { id: true },
    });
    expect(result).toEqual({
      ok: true,
      participantIds: ["participant-1", "participant-2"],
      createdParticipantIds: ["participant-1", "participant-2"],
      userId: "user-1",
    });
  });

  it("links existing group results to the user and creates only missing rows", async () => {
    mockParticipantFindMany.mockResolvedValueOnce([
      { id: "participant-1", pollId: "poll-1" },
    ]);
    mockParticipantCreate.mockResolvedValueOnce({ id: "participant-2" });
    const { addUserAsPollGroupParticipant } = await import("./mutations");

    const result = await addUserAsPollGroupParticipant({
      pollIds: ["poll-1", "poll-2"],
      name: "Avery Example",
      email: "avery@example.com",
    });

    expect(mockParticipantUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["participant-1"] } },
      data: {
        name: "Avery Example",
        email: "avery@example.com",
        userId: "user-1",
      },
    });
    expect(mockParticipantCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      participantIds: ["participant-1", "participant-2"],
      createdParticipantIds: ["participant-2"],
      userId: "user-1",
    });
  });

  it("removes only result rows and preserves the linked user", async () => {
    mockParticipantUpdateMany.mockResolvedValueOnce({ count: 2 });
    const { removePollParticipantsFromResults } = await import("./mutations");

    const result = await removePollParticipantsFromResults({
      participantIds: ["participant-1", "participant-2"],
      pollIds: ["poll-1", "poll-2"],
    });

    expect(mockParticipantUpdateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["participant-1", "participant-2"] },
        pollId: { in: ["poll-1", "poll-2"] },
        deleted: false,
      },
      data: {
        deleted: true,
        deletedAt: expect.any(Date),
      },
    });
    expect(mockUserUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({ count: 2 });
  });

  it("creates or reuses a member account and links the participant", async () => {
    const { addUserAsPollParticipant } = await import("./mutations");

    const result = await addUserAsPollParticipant({
      pollId: "poll-1",
      name: "Avery Example",
      email: " AVERY@EXAMPLE.COM ",
    });

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "avery@example.com" },
      create: {
        name: "Avery Example",
        email: "avery@example.com",
        emailVerified: false,
        role: "user",
      },
      update: {},
      select: {
        id: true,
        banned: true,
        deletedAt: true,
        isAnonymous: true,
      },
    });
    expect(mockParticipantCreate).toHaveBeenCalledWith({
      data: {
        pollId: "poll-1",
        name: "Avery Example",
        email: "avery@example.com",
        userId: "user-1",
      },
      select: { id: true },
    });
    expect(result).toEqual({
      ok: true,
      participantId: "participant-1",
      userId: "user-1",
    });
  });

  it("promotes an emailed guest response to a regular user", async () => {
    const { resolvePollResponseUser } = await import("./mutations");

    const result = await resolvePollResponseUser({
      tx: transaction,
      sessionUser: { id: "guest-1", isGuest: true },
      name: "Avery Example",
      email: " AVERY@EXAMPLE.COM ",
    });

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "avery@example.com" },
      create: {
        name: "Avery Example",
        email: "avery@example.com",
        emailVerified: false,
        role: "user",
      },
      update: {},
      select: {
        id: true,
        banned: true,
        deletedAt: true,
        isAnonymous: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      email: "avery@example.com",
    });
  });

  it("creates an emailed response user without a signed-in session", async () => {
    const { resolvePollResponseUser } = await import("./mutations");

    const result = await resolvePollResponseUser({
      tx: transaction,
      name: "Avery Example",
      email: " AVERY@EXAMPLE.COM ",
    });

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "avery@example.com" },
      create: {
        name: "Avery Example",
        email: "avery@example.com",
        emailVerified: false,
        role: "user",
      },
      update: {},
      select: {
        id: true,
        banned: true,
        deletedAt: true,
        isAnonymous: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      email: "avery@example.com",
    });
  });

  it("uses the submitted email as the user identity for signed-in responses", async () => {
    const { resolvePollResponseUser } = await import("./mutations");

    const result = await resolvePollResponseUser({
      tx: transaction,
      sessionUser: { id: "member-1", isGuest: false },
      name: "Avery Example",
      email: " AVERY@EXAMPLE.COM ",
    });

    expect(mockUserUpsert).toHaveBeenCalledWith({
      where: { email: "avery@example.com" },
      create: {
        name: "Avery Example",
        email: "avery@example.com",
        emailVerified: false,
        role: "user",
      },
      update: {},
      select: {
        id: true,
        banned: true,
        deletedAt: true,
        isAnonymous: true,
      },
    });
    expect(result).toEqual({
      ok: true,
      userId: "user-1",
      email: "avery@example.com",
    });
  });

  it("uses the session identity when a response has no email", async () => {
    const { resolvePollResponseUser } = await import("./mutations");

    const result = await resolvePollResponseUser({
      tx: transaction,
      sessionUser: { id: "member-1" },
      name: "Avery Example",
    });

    expect(mockUserUpsert).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      userId: "member-1",
      email: null,
    });
  });

  it("does not create a duplicate participant for the same poll and email", async () => {
    mockParticipantFindFirst.mockResolvedValueOnce({ id: "participant-1" });
    const { addUserAsPollParticipant } = await import("./mutations");

    const result = await addUserAsPollParticipant({
      pollId: "poll-1",
      name: "Avery Example",
      email: "avery@example.com",
    });

    expect(result).toEqual({ ok: false, reason: "participant_exists" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("rejects banned, deleted, or anonymous accounts", async () => {
    mockUserUpsert.mockResolvedValueOnce({
      id: "user-1",
      banned: true,
      deletedAt: null,
      isAnonymous: false,
    });
    const { addUserAsPollParticipant } = await import("./mutations");

    const result = await addUserAsPollParticipant({
      pollId: "poll-1",
      name: "Avery Example",
      email: "avery@example.com",
    });

    expect(result).toEqual({ ok: false, reason: "user_unavailable" });
    expect(mockParticipantCreate).not.toHaveBeenCalled();
  });
});
