import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  archiveTableNames,
  INSTANCE_ARCHIVE_FORMAT,
  INSTANCE_ARCHIVE_VERSION,
} from "./schema";

const { mockTransaction, tx } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(),
    deleteMany: vi.fn(),
    createMany: vi.fn(),
  });

  return {
    mockTransaction: vi.fn(),
    tx: {
      user: model(),
      account: model(),
      userNotificationPreferences: model(),
      space: model(),
      spaceMember: model(),
      spaceMemberInvite: model(),
      pollGroup: model(),
      eventType: model(),
      sheet: model(),
      sheetSlot: model(),
      scheduledEvent: model(),
      rescheduledEventDate: model(),
      scheduledEventInvite: model(),
      poll: model(),
      option: model(),
      pollAuxiliarySelection: model(),
      pollAuxiliaryOption: model(),
      participant: model(),
      vote: model(),
      pollAuxiliaryVote: model(),
      comment: model(),
      pollInvite: model(),
      pollActivity: model(),
    },
  };
});

vi.mock("@rallly/database", () => ({
  Prisma: {
    TransactionIsolationLevel: {
      RepeatableRead: "RepeatableRead",
      Serializable: "Serializable",
    },
  },
  prisma: { $transaction: mockTransaction },
}));

const qrCodeToken = "18952f2f-9a61-4d28-a3a3-fc748689c150";
const archivedUser = {
  id: "user-1",
  name: "Avery Example",
  email: "avery@example.com",
  role: "admin",
  deletedAt: null,
  qrCodeToken,
};
const archivedParticipant = {
  id: "participant-1",
  pollId: "poll-1",
  userId: archivedUser.id,
  name: archivedUser.name,
  email: archivedUser.email,
};
const archivedVote = {
  id: "vote-1",
  participantId: archivedParticipant.id,
  pollId: archivedParticipant.pollId,
  optionId: "option-1",
  type: "yes",
};
const archivedAuxiliarySelection = {
  id: "auxiliary-selection-1",
  pollId: archivedParticipant.pollId,
  name: "Roles",
  minYes: 1,
  maxYesSelections: 1,
};
const archivedAuxiliaryOption = {
  id: "auxiliary-option-1",
  auxiliarySelectionId: archivedAuxiliarySelection.id,
  label: "Driver",
  position: 0,
  maxYes: 2,
};
const archivedAuxiliaryVote = {
  id: "auxiliary-vote-1",
  participantId: archivedParticipant.id,
  pollId: archivedParticipant.pollId,
  auxiliaryOptionId: archivedAuxiliaryOption.id,
  type: "ifNeedBe",
};

function createArchive() {
  const data = Object.fromEntries(
    archiveTableNames.map((table) => [table, []]),
  ) as unknown as Record<
    (typeof archiveTableNames)[number],
    Record<string, unknown>[]
  >;
  data.users = [{ ...archivedUser }];
  data.pollGroups = [{ id: "group-1" }];
  data.polls = [{ id: "poll-1", pollGroupId: "group-1" }];
  data.options = [{ id: "option-1", pollId: "poll-1", maxYes: 8 }];
  data.pollAuxiliarySelections = [{ ...archivedAuxiliarySelection }];
  data.pollAuxiliaryOptions = [{ ...archivedAuxiliaryOption }];
  data.participants = [{ ...archivedParticipant }];
  data.votes = [{ ...archivedVote }];
  data.pollAuxiliaryVotes = [{ ...archivedAuxiliaryVote }];

  return {
    format: INSTANCE_ARCHIVE_FORMAT,
    version: INSTANCE_ARCHIVE_VERSION,
    exportedAt: "2026-08-15T12:00:00.000Z",
    applicationVersion: "4.12.0",
    counts: Object.fromEntries(
      archiveTableNames.map((table) => [table, data[table].length]),
    ),
    data,
  };
}

describe("QR poll voting archive support", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const model of Object.values(tx)) {
      model.findMany.mockResolvedValue([]);
      model.deleteMany.mockResolvedValue({ count: 0 });
      model.createMany.mockResolvedValue({ count: 0 });
    }
    mockTransaction.mockImplementation(
      async (callback: (transaction: typeof tx) => Promise<unknown>) =>
        callback(tx),
    );
  });

  it("exports the badge credential, linked participant, and yes vote", async () => {
    tx.user.findMany.mockResolvedValue([archivedUser]);
    tx.pollGroup.findMany.mockResolvedValue([{ id: "group-1" }]);
    tx.poll.findMany.mockResolvedValue([
      { id: "poll-1", pollGroupId: "group-1" },
    ]);
    tx.option.findMany.mockResolvedValue([
      { id: "option-1", pollId: "poll-1", maxYes: 8 },
    ]);
    tx.pollAuxiliarySelection.findMany.mockResolvedValue([
      archivedAuxiliarySelection,
    ]);
    tx.pollAuxiliaryOption.findMany.mockResolvedValue([
      archivedAuxiliaryOption,
    ]);
    tx.participant.findMany.mockResolvedValue([archivedParticipant]);
    tx.vote.findMany.mockResolvedValue([archivedVote]);
    tx.pollAuxiliaryVote.findMany.mockResolvedValue([archivedAuxiliaryVote]);
    const { createInstanceArchive } = await import("./data");

    const archive = await createInstanceArchive();

    expect(archive.data.users[0]).toMatchObject({
      id: archivedUser.id,
      qrCodeToken,
    });
    expect(archive.data.participants[0]).toMatchObject({
      pollId: "poll-1",
      userId: archivedUser.id,
    });
    expect(archive.data.votes[0]).toMatchObject({
      participantId: archivedParticipant.id,
      optionId: "option-1",
      type: "yes",
    });
    expect(archive.data.options[0]).toMatchObject({
      id: "option-1",
      maxYes: 8,
    });
    expect(archive.data.pollAuxiliarySelections[0]).toMatchObject({
      name: "Roles",
      minYes: 1,
      maxYesSelections: 1,
    });
    expect(archive.data.pollAuxiliaryOptions[0]).toMatchObject({
      label: "Driver",
      maxYes: 2,
    });
    expect(archive.data.pollAuxiliaryVotes[0]).toMatchObject({
      auxiliaryOptionId: archivedAuxiliaryOption.id,
      type: "ifNeedBe",
    });
  });

  it("restores the same credential so already-issued QR codes remain valid", async () => {
    const { restoreInstanceArchive } = await import("./mutations");

    await restoreInstanceArchive(createArchive());

    expect(tx.user.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: archivedUser.id, qrCodeToken })],
    });
    expect(tx.participant.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          pollId: "poll-1",
          userId: archivedUser.id,
        }),
      ],
    });
    expect(tx.vote.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          participantId: archivedParticipant.id,
          optionId: "option-1",
          type: "yes",
        }),
      ],
    });
    expect(tx.option.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: "option-1", maxYes: 8 })],
    });
    expect(tx.pollAuxiliarySelection.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: archivedAuxiliarySelection.id,
          pollId: "poll-1",
          name: "Roles",
          minYes: 1,
          maxYesSelections: 1,
        }),
      ],
    });
    expect(tx.pollAuxiliaryOption.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: archivedAuxiliaryOption.id,
          auxiliarySelectionId: archivedAuxiliarySelection.id,
          label: "Driver",
          position: 0,
          maxYes: 2,
        }),
      ],
    });
    expect(tx.pollAuxiliaryVote.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          auxiliaryOptionId: archivedAuxiliaryOption.id,
          participantId: archivedParticipant.id,
          pollId: "poll-1",
          type: "ifNeedBe",
        }),
      ],
    });
  });

  it("keeps version-one archives from before QR badges restoreable", async () => {
    const archive = createArchive();
    Reflect.deleteProperty(archive.data.users[0], "qrCodeToken");
    Reflect.deleteProperty(archive.data.options[0], "maxYes");
    const { restoreInstanceArchive } = await import("./mutations");

    await restoreInstanceArchive(archive);

    expect(tx.user.createMany).toHaveBeenCalledWith({
      data: [expect.not.objectContaining({ qrCodeToken: expect.anything() })],
    });
    expect(tx.option.createMany).toHaveBeenCalledWith({
      data: [expect.not.objectContaining({ maxYes: expect.anything() })],
    });
  });

  it("keeps version-one archives from before auxiliary selections restoreable", async () => {
    const archive = createArchive();
    for (const table of [
      "pollAuxiliarySelections",
      "pollAuxiliaryOptions",
      "pollAuxiliaryVotes",
    ] as const) {
      Reflect.deleteProperty(archive.data, table);
      Reflect.deleteProperty(archive.counts, table);
    }
    const { restoreInstanceArchive } = await import("./mutations");

    await restoreInstanceArchive(archive);

    expect(tx.pollAuxiliarySelection.createMany).toHaveBeenCalledWith({
      data: [],
    });
    expect(tx.pollAuxiliaryOption.createMany).toHaveBeenCalledWith({
      data: [],
    });
    expect(tx.pollAuxiliaryVote.createMany).toHaveBeenCalledWith({ data: [] });
  });

  it("restores auxiliary selections archived before per-participant limits", async () => {
    const archive = createArchive();
    Reflect.deleteProperty(
      archive.data.pollAuxiliarySelections[0],
      "maxYesSelections",
    );
    const { restoreInstanceArchive } = await import("./mutations");

    await restoreInstanceArchive(archive);

    expect(tx.pollAuxiliarySelection.createMany).toHaveBeenCalledWith({
      data: [
        expect.not.objectContaining({ maxYesSelections: expect.anything() }),
      ],
    });
  });
});
