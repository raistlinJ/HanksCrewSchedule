import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockParticipantFindFirst,
  mockUserUpsert,
  mockParticipantCreate,
  mockTransaction,
  mockValidateAuxiliaryVotes,
} = vi.hoisted(() => ({
  mockParticipantFindFirst: vi.fn(),
  mockUserUpsert: vi.fn(),
  mockParticipantCreate: vi.fn(),
  mockTransaction: vi.fn(),
  mockValidateAuxiliaryVotes: vi.fn(),
}));

const transaction = {
  user: { upsert: mockUserUpsert },
  participant: { create: mockParticipantCreate },
};

vi.mock("@rallly/database", () => ({
  prisma: {
    participant: { findFirst: mockParticipantFindFirst },
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
    mockUserUpsert.mockResolvedValue({
      id: "user-1",
      banned: false,
      deletedAt: null,
      isAnonymous: false,
    });
    mockParticipantCreate.mockResolvedValue({ id: "participant-1" });
    mockValidateAuxiliaryVotes.mockResolvedValue([]);
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
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
