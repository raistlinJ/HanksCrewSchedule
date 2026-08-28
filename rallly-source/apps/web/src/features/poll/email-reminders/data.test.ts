import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthorizedSpaceId } from "@/features/space/types";
import { getPollReminderRecipients } from "./data";

vi.mock("server-only", () => ({}));

const { mockFindFirst } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
}));

vi.mock("@rallly/database", () => ({
  prisma: {
    poll: {
      findFirst: mockFindFirst,
    },
  },
}));

const spaceId = "space-1" as AuthorizedSpaceId;

describe("getPollReminderRecipients", () => {
  beforeEach(() => vi.clearAllMocks());

  it("scopes recipients to a live poll in the active space", async () => {
    mockFindFirst.mockResolvedValue({ participants: [] });

    await getPollReminderRecipients({ pollId: "poll-1", spaceId });

    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "poll-1", spaceId, deleted: false },
      select: {
        participants: {
          where: {
            deleted: false,
            email: { not: null },
            votes: { some: { type: "yes" } },
          },
          select: { name: true, email: true },
        },
      },
    });
  });

  it("returns null when the poll is unavailable", async () => {
    mockFindFirst.mockResolvedValue(null);

    await expect(
      getPollReminderRecipients({ pollId: "missing", spaceId }),
    ).resolves.toBeNull();
  });

  it("deduplicates email addresses case-insensitively", async () => {
    mockFindFirst.mockResolvedValue({
      participants: [
        { name: "First", email: "Crew@example.com" },
        { name: "Duplicate", email: " crew@EXAMPLE.com " },
        { name: "Second", email: "second@example.com" },
      ],
    });

    await expect(
      getPollReminderRecipients({ pollId: "poll-1", spaceId }),
    ).resolves.toEqual([
      { name: "First", email: "Crew@example.com" },
      { name: "Second", email: "second@example.com" },
    ]);
  });
});
