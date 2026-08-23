import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const NOT_FOUND = "NEXT_NOT_FOUND";
const mockNotFound = vi.fn(() => {
  throw Object.assign(new Error(NOT_FOUND), { digest: NOT_FOUND });
});
const mockGetPublicPollMetadata = vi.fn();
const mockGetPublicPollGroupResults = vi.fn();
const mockGetPollGroupResults = vi.fn();
const mockGetActiveSpace = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

vi.mock("@/features/poll/data", () => ({
  getPollQrVotingData: vi.fn(),
  getPollGroupResults: (...args: unknown[]) => mockGetPollGroupResults(...args),
  getPollStatusCounts: vi.fn(),
  getPublicPollMetadata: (...args: unknown[]) =>
    mockGetPublicPollMetadata(...args),
  getPublicPollGroupResults: (...args: unknown[]) =>
    mockGetPublicPollGroupResults(...args),
  hasPollAdminAccess: vi.fn(),
}));

vi.mock("@/features/space/loaders", () => ({
  getActiveSpace: (...args: unknown[]) => mockGetActiveSpace(...args),
}));

vi.mock("@/features/user/loaders", () => ({
  requireUser: vi.fn(),
}));

const loadModule = async () => {
  vi.resetModules();
  return import("./loaders");
};

describe("public results loaders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads poll results when public access is enabled", async () => {
    const poll = {
      id: "poll-1",
      title: "Poll",
      deleted: false,
      publicResults: true,
      user: null,
    };
    mockGetPublicPollMetadata.mockResolvedValue(poll);
    const { loadPublicPollResults } = await loadModule();

    await expect(loadPublicPollResults(poll.id)).resolves.toEqual(poll);
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("returns not-found when public poll results are disabled", async () => {
    mockGetPublicPollMetadata.mockResolvedValue({
      id: "poll-1",
      title: "Poll",
      deleted: false,
      publicResults: false,
      user: null,
    });
    const { loadPublicPollResults } = await loadModule();

    await expect(loadPublicPollResults("poll-1")).rejects.toThrow(NOT_FOUND);
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it("loads and orders public group results", async () => {
    mockGetPublicPollGroupResults.mockResolvedValue({
      id: "group-1",
      publicResults: true,
      pollOrder: ["poll-2", "poll-1"],
      polls: [
        { id: "poll-1", createdAt: new Date("2026-01-01") },
        { id: "poll-2", createdAt: new Date("2026-01-02") },
      ],
    });
    const { loadPublicPollGroupResults } = await loadModule();

    const group = await loadPublicPollGroupResults("group-1");

    expect(group.polls.map((poll) => poll.id)).toEqual(["poll-2", "poll-1"]);
  });

  it("returns not-found when public group results are disabled", async () => {
    mockGetPublicPollGroupResults.mockResolvedValue({
      id: "group-1",
      publicResults: false,
      pollOrder: [],
      polls: [],
    });
    const { loadPublicPollGroupResults } = await loadModule();

    await expect(loadPublicPollGroupResults("group-1")).rejects.toThrow(
      NOT_FOUND,
    );
    expect(mockNotFound).toHaveBeenCalledOnce();
  });

  it("loads managed group results only from the active space", async () => {
    mockGetActiveSpace.mockResolvedValue({ id: "space-1" });
    mockGetPollGroupResults.mockResolvedValue({
      id: "group-1",
      pollOrder: ["poll-2", "poll-1"],
      polls: [
        { id: "poll-1", createdAt: new Date("2026-01-01") },
        { id: "poll-2", createdAt: new Date("2026-01-02") },
      ],
    });
    const { loadPollGroupResults } = await loadModule();

    const group = await loadPollGroupResults("group-1");

    expect(mockGetPollGroupResults).toHaveBeenCalledWith({
      groupId: "group-1",
      spaceId: "space-1",
    });
    expect(group.polls.map((poll) => poll.id)).toEqual(["poll-2", "poll-1"]);
  });
});
