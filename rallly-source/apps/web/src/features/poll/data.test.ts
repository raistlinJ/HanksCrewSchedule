import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockFindMany = vi.fn();
vi.mock("@rallly/database", () => ({
  prisma: {
    poll: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

import type { AuthorizedSpaceId } from "@/features/space/types";
import { getOnDemandPollTitles, listPolls } from "./data";

const spaceId = "test-space-id" as AuthorizedSpaceId;

const makePoll = (id: string) => ({
  id,
  title: `Poll ${id}`,
  description: null,
  location: null,
  timeZone: null,
  status: "open",
  createdAt: new Date("2025-01-10T12:00:00Z"),
  user: null,
  options: [],
  _count: { participants: 2 },
});

describe("listPolls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all polls with a null nextCursor when there are no more pages", async () => {
    mockFindMany.mockResolvedValue([makePoll("p1"), makePoll("p2")]);

    const result = await listPolls({ spaceId, limit: 20 });

    expect(result.polls).toHaveLength(2);
    expect(result.polls[0]?.participantCount).toBe(2);
    expect(result.nextCursor).toBeNull();
  });

  it("slices to the limit and returns the last item's id as nextCursor", async () => {
    mockFindMany.mockResolvedValue([
      makePoll("p1"),
      makePoll("p2"),
      makePoll("p3"),
    ]);

    const result = await listPolls({ spaceId, limit: 2 });

    expect(result.polls).toHaveLength(2);
    expect(result.polls.map((poll) => poll.id)).toEqual(["p1", "p2"]);
    expect(result.nextCursor).toBe("p2");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    );
  });

  it("scopes the query to the space and excludes deleted polls", async () => {
    mockFindMany.mockResolvedValue([]);

    await listPolls({ spaceId, limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId, deleted: false },
      }),
    );
  });

  it("applies the status filter when provided", async () => {
    mockFindMany.mockResolvedValue([]);

    await listPolls({ spaceId, status: "closed", limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId, deleted: false, status: "closed" },
      }),
    );
  });

  it("can limit results to on-demand polls", async () => {
    mockFindMany.mockResolvedValue([]);

    await listPolls({ spaceId, isOnDemand: true, limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { spaceId, deleted: false, isOnDemand: true },
      }),
    );
  });

  it("resumes from the cursor when provided", async () => {
    mockFindMany.mockResolvedValue([]);

    await listPolls({ spaceId, cursor: "p2", limit: 20 });

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "p2" },
        skip: 1,
      }),
    );
  });
});

describe("getOnDemandPollTitles", () => {
  it("returns active on-demand titles in the space", async () => {
    mockFindMany.mockResolvedValue([
      { title: "2026-08-19/14:30" },
      { title: "2026-08-19/14:30-(2)" },
    ]);

    await expect(getOnDemandPollTitles({ spaceId })).resolves.toEqual([
      "2026-08-19/14:30",
      "2026-08-19/14:30-(2)",
    ]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isOnDemand: true, deleted: false, spaceId },
      select: { title: true },
    });
  });
});
