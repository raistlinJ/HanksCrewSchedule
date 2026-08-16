import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizedSpaceId } from "@/features/space/types";

const {
  mockPollFindFirst,
  mockUserFindUnique,
  mockParticipantFindFirst,
  mockParticipantCreate,
  mockParticipantUpdate,
  mockVoteUpsert,
  mockTransaction,
  mockAssertYesCapacity,
  mockValidateAuxiliaryVotes,
} = vi.hoisted(() => ({
  mockPollFindFirst: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockParticipantFindFirst: vi.fn(),
  mockParticipantCreate: vi.fn(),
  mockParticipantUpdate: vi.fn(),
  mockVoteUpsert: vi.fn(),
  mockTransaction: vi.fn(),
  mockAssertYesCapacity: vi.fn(),
  mockValidateAuxiliaryVotes: vi.fn(),
}));

const transaction = {
  participant: {
    create: mockParticipantCreate,
    update: mockParticipantUpdate,
  },
  vote: { upsert: mockVoteUpsert },
};

vi.mock("@rallly/database", () => ({
  prisma: {
    poll: { findFirst: mockPollFindFirst },
    user: { findUnique: mockUserFindUnique },
    participant: { findFirst: mockParticipantFindFirst },
    $transaction: mockTransaction,
  },
}));

vi.mock("@/features/poll/yes-capacity/mutations", () => ({
  assertYesCapacity: mockAssertYesCapacity,
}));

vi.mock("@/features/poll/auxiliary-selection/mutations", () => ({
  validateAuxiliaryVotes: mockValidateAuxiliaryVotes,
}));

const spaceId = "space-1" as AuthorizedSpaceId;
const user = {
  id: "user-1",
  name: "Avery Example",
  email: "avery@example.com",
  image: null,
  banned: false,
  deletedAt: null,
  isAnonymous: false,
};
const poll = {
  id: "poll-1",
  options: [{ id: "option-1" }, { id: "option-2" }],
};

describe("markUserYesForPoll", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPollFindFirst.mockResolvedValue(poll);
    mockUserFindUnique.mockResolvedValue(user);
    mockParticipantFindFirst.mockResolvedValue(null);
    mockParticipantCreate.mockResolvedValue({ id: "participant-1" });
    mockParticipantUpdate.mockResolvedValue({ id: "participant-1" });
    mockVoteUpsert.mockResolvedValue({});
    mockValidateAuxiliaryVotes.mockResolvedValue([]);
    mockTransaction.mockImplementation(
      async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction),
    );
  });

  it("creates a linked participant and yes votes for every option", async () => {
    const { markUserYesForPoll } = await import("./mutations");

    const result = await markUserYesForPoll({
      groupId: "group-1",
      pollId: poll.id,
      qrCodeToken: "18952f2f-9a61-4d28-a3a3-fc748689c150",
      spaceId,
    });

    expect(mockPollFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: poll.id,
          pollGroupId: "group-1",
          spaceId,
        }),
      }),
    );
    expect(mockParticipantCreate).toHaveBeenCalledWith({
      data: {
        name: user.name,
        email: user.email,
        userId: user.id,
        pollId: poll.id,
      },
      select: { id: true },
    });
    expect(mockAssertYesCapacity).toHaveBeenCalledWith({
      tx: transaction,
      pollId: poll.id,
      participantId: undefined,
      optionIds: ["option-1", "option-2"],
    });
    expect(mockVoteUpsert).toHaveBeenCalledTimes(2);
    expect(mockVoteUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ type: "yes", pollId: poll.id }),
        update: { type: "yes" },
      }),
    );
    expect(result).toMatchObject({ ok: true, alreadyYes: false });
  });

  it("updates an existing participant and replaces non-yes votes", async () => {
    mockParticipantFindFirst.mockResolvedValueOnce({
      id: "participant-1",
      votes: [
        { optionId: "option-1", type: "no" },
        { optionId: "option-2", type: "yes" },
      ],
    });
    const { markUserYesForPoll } = await import("./mutations");

    const result = await markUserYesForPoll({
      groupId: "group-1",
      pollId: poll.id,
      qrCodeToken: "18952f2f-9a61-4d28-a3a3-fc748689c150",
      spaceId,
    });

    expect(mockParticipantCreate).not.toHaveBeenCalled();
    expect(mockParticipantUpdate).toHaveBeenCalledWith({
      where: { id: "participant-1" },
      data: { name: user.name, email: user.email, userId: user.id },
      select: { id: true },
    });
    expect(mockVoteUpsert).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, alreadyYes: false });
  });

  it("is idempotent when every option is already yes", async () => {
    mockParticipantFindFirst.mockResolvedValueOnce({
      id: "participant-1",
      votes: [
        { optionId: "option-1", type: "yes" },
        { optionId: "option-2", type: "yes" },
      ],
    });
    const { markUserYesForPoll } = await import("./mutations");

    const result = await markUserYesForPoll({
      groupId: "group-1",
      pollId: poll.id,
      qrCodeToken: "18952f2f-9a61-4d28-a3a3-fc748689c150",
      spaceId,
    });

    expect(mockParticipantCreate).not.toHaveBeenCalled();
    expect(mockVoteUpsert).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ ok: true, alreadyYes: true });
  });

  it("rejects badges for banned users without writing votes", async () => {
    mockUserFindUnique.mockResolvedValue({ ...user, banned: true });
    const { markUserYesForPoll } = await import("./mutations");

    const result = await markUserYesForPoll({
      groupId: "group-1",
      pollId: poll.id,
      qrCodeToken: "18952f2f-9a61-4d28-a3a3-fc748689c150",
      spaceId,
    });

    expect(result).toEqual({ ok: false, reason: "invalid_qr_code" });
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("does not write votes when every Yes place is taken", async () => {
    mockAssertYesCapacity.mockRejectedValueOnce(new Error("Yes is full"));
    const { markUserYesForPoll } = await import("./mutations");

    await expect(
      markUserYesForPoll({
        groupId: "group-1",
        pollId: poll.id,
        qrCodeToken: "18952f2f-9a61-4d28-a3a3-fc748689c150",
        spaceId,
      }),
    ).rejects.toThrow("Yes is full");

    expect(mockParticipantCreate).not.toHaveBeenCalled();
    expect(mockVoteUpsert).not.toHaveBeenCalled();
  });
});
