import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizedSpaceId } from "@/features/space/types";
import { sendPollReminderEmails } from "./mutations";

vi.mock("server-only", () => ({}));

const { mockGetRecipients, mockSendRawEmail } = vi.hoisted(() => ({
  mockGetRecipients: vi.fn(),
  mockSendRawEmail: vi.fn(),
}));

vi.mock("./data", () => ({
  getPollReminderRecipients: mockGetRecipients,
}));

vi.mock("@rallly/emails", () => ({
  sendRawEmail: mockSendRawEmail,
}));

const spaceId = "space-1" as AuthorizedSpaceId;
const input = {
  pollId: "poll-1",
  spaceId,
  subject: "Reminder",
  body: "Please update your availability.",
};

describe("sendPollReminderEmails", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not send when the poll is unavailable", async () => {
    mockGetRecipients.mockResolvedValue(null);

    await expect(sendPollReminderEmails(input)).resolves.toBeNull();
    expect(mockSendRawEmail).not.toHaveBeenCalled();
  });

  it("sends the editable message to every recipient", async () => {
    mockGetRecipients.mockResolvedValue([
      { name: "One", email: "one@example.com" },
      { name: "Two", email: "two@example.com" },
    ]);
    mockSendRawEmail.mockResolvedValue({ ok: true });

    await expect(sendPollReminderEmails(input)).resolves.toEqual({
      count: 2,
      failedCount: 0,
      recipientCount: 2,
    });
    expect(mockSendRawEmail).toHaveBeenCalledTimes(2);
    expect(mockSendRawEmail).toHaveBeenCalledWith({
      to: "one@example.com",
      subject: input.subject,
      text: input.body,
    });
  });

  it("reports delivery failures separately", async () => {
    mockGetRecipients.mockResolvedValue([
      { name: "One", email: "one@example.com" },
      { name: "Two", email: "two@example.com" },
    ]);
    mockSendRawEmail
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false, reason: "TRANSPORT_ERROR" });

    await expect(sendPollReminderEmails(input)).resolves.toEqual({
      count: 1,
      failedCount: 1,
      recipientCount: 2,
    });
  });
});
