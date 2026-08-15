import { beforeEach, describe, expect, it, vi } from "vitest";
import { getNotificationRecipient } from "./data";

const { getInstanceSettings, pollFindUnique, userFindUnique } = vi.hoisted(
  () => ({
    getInstanceSettings: vi.fn(),
    pollFindUnique: vi.fn(),
    userFindUnique: vi.fn(),
  }),
);

vi.mock("@rallly/database", () => ({
  prisma: {
    poll: { findUnique: pollFindUnique },
    user: { findUnique: userFindUnique },
    userNotificationPreferences: { findUnique: vi.fn() },
  },
}));

vi.mock("@/features/instance-settings/data", () => ({
  getInstanceSettings,
}));

describe("getNotificationRecipient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips activity email lookup when support emails are disabled", async () => {
    getInstanceSettings.mockResolvedValue({ sendSupportEmails: false });

    const recipient = await getNotificationRecipient({
      pollId: "poll-1",
      type: "poll.response.submitted",
      excludeUserId: "participant-1",
    });

    expect(recipient).toBeNull();
    expect(pollFindUnique).not.toHaveBeenCalled();
    expect(userFindUnique).not.toHaveBeenCalled();
  });
});
