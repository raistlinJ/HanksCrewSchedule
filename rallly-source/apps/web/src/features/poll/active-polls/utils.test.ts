import { describe, expect, it } from "vitest";
import type { ActivePollOverviewSource } from "./utils";
import { buildActivePollOverview } from "./utils";

const defaultRange = {
  start: new Date("2026-08-22T12:00:00Z"),
  end: new Date("2026-08-29T12:00:00Z"),
};
const referenceTime = new Date("2026-08-22T12:00:00Z");

function poll(
  input: Partial<ActivePollOverviewSource> &
    Pick<ActivePollOverviewSource, "id" | "title">,
): ActivePollOverviewSource {
  return {
    description: null,
    location: null,
    isOnDemand: false,
    publicResults: false,
    status: "open",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    options: [],
    yesRespondentIds: [],
    pollGroupId: null,
    pollGroup: null,
    ...input,
  };
}

describe("buildActivePollOverview", () => {
  it("collapses active polls from the same group into one ordered item", () => {
    const group = {
      id: "group-1",
      title: "Volunteer shifts",
      description: "Choose a shift",
      pollOrder: ["poll-2", "poll-1"],
      publicResults: true,
    };

    const result = buildActivePollOverview(
      [
        poll({
          id: "poll-1",
          title: "Morning",
          status: "scheduled",
          yesRespondentIds: ["user-1", "user-2"],
          options: [
            { startTime: new Date("2026-08-24T09:00:00Z"), duration: 60 },
          ],
          pollGroupId: group.id,
          pollGroup: group,
        }),
        poll({
          id: "poll-2",
          title: "Evening",
          yesRespondentIds: ["user-1", "user-3"],
          options: [
            { startTime: new Date("2026-08-23T17:00:00Z"), duration: 60 },
          ],
          pollGroupId: group.id,
          pollGroup: group,
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      kind: "group",
      id: "group-1",
      yesResponseCount: 3,
      status: "open",
      nextStart: new Date("2026-08-23T17:00:00Z"),
      scanHref: "/groups/group-1/scan",
      manualAddHref: "/g/group-1?manualAdd=1",
      resultsHref: "/groups/group-1/responses",
      publicResultsHref: "/g/group-1/results",
    });
    expect(result[0]?.polls.map(({ id }) => id)).toEqual(["poll-2", "poll-1"]);
  });

  it("does not show a group poll as standalone when group details are missing", () => {
    const result = buildActivePollOverview(
      [
        poll({
          id: "group-poll",
          title: "Grouped poll",
          pollGroupId: "group-1",
          options: [
            { startTime: new Date("2026-08-22T12:15:00Z"), duration: 60 },
          ],
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result).toEqual([]);
  });

  it("keeps only polls with an option overlapping the hard date range", () => {
    const result = buildActivePollOverview(
      [
        poll({
          id: "ended",
          title: "Just ended",
          status: "closed",
          options: [
            { startTime: new Date("2026-08-22T11:00:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "active",
          title: "Still active",
          options: [
            { startTime: new Date("2026-08-22T11:30:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "future",
          title: "Within one week",
          options: [
            { startTime: new Date("2026-08-29T12:00:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "too-far",
          title: "Beyond one week",
          options: [
            { startTime: new Date("2026-08-29T12:01:00Z"), duration: 60 },
          ],
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result.map(({ id }) => id)).toEqual(["active", "future"]);
    expect(result[0]).toMatchObject({
      kind: "poll",
      status: "open",
      scanHref: "/poll/active/scan",
      manualAddHref: "/poll/active?manualAdd=1",
      resultsHref: "/poll/active/results",
      publicHref: "/invite/active",
    });
  });

  it("does not treat gaps between options as active time", () => {
    const result = buildActivePollOverview(
      [
        poll({
          id: "split-options",
          title: "No nearby choices",
          options: [
            { startTime: new Date("2026-08-20T12:00:00Z"), duration: 60 },
            { startTime: new Date("2026-09-01T12:00:00Z"), duration: 60 },
          ],
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result).toEqual([]);
  });

  it("shows only nearby group questions unless the range start is moved", () => {
    const group = {
      id: "group-1",
      title: "Crew questions",
      description: null,
      pollOrder: ["passed", "near", "far"],
      publicResults: false,
    };
    const questions = [
      poll({
        id: "passed",
        title: "Passed question",
        pollGroupId: group.id,
        pollGroup: group,
        options: [
          { startTime: new Date("2026-08-22T09:00:00Z"), duration: 60 },
        ],
      }),
      poll({
        id: "near",
        title: "Nearby question",
        pollGroupId: group.id,
        pollGroup: group,
        options: [
          { startTime: new Date("2026-08-23T09:00:00Z"), duration: 60 },
        ],
      }),
      poll({
        id: "far",
        title: "Far question",
        pollGroupId: group.id,
        pollGroup: group,
        options: [
          { startTime: new Date("2026-09-01T09:00:00Z"), duration: 60 },
        ],
      }),
    ];

    const defaultResult = buildActivePollOverview(
      questions,
      defaultRange,
      referenceTime,
    );
    expect(defaultResult[0]?.polls.map(({ id }) => id)).toEqual(["near"]);

    const movedStartResult = buildActivePollOverview(
      questions,
      {
        start: new Date("2026-08-22T08:00:00Z"),
        end: defaultRange.end,
      },
      referenceTime,
    );
    expect(movedStartResult[0]?.polls.map(({ id }) => id)).toEqual([
      "passed",
      "near",
    ]);
  });

  it("orders items by their distance from the current date and time", () => {
    const result = buildActivePollOverview(
      [
        poll({
          id: "later",
          title: "Later",
          options: [
            { startTime: new Date("2026-08-22T14:00:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "recent",
          title: "Recent",
          options: [
            { startTime: new Date("2026-08-22T11:30:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "soon",
          title: "Soon",
          options: [
            { startTime: new Date("2026-08-22T12:15:00Z"), duration: 60 },
          ],
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result.map(({ id }) => id)).toEqual(["soon", "recent", "later"]);
  });

  it("includes a public results link only when public results are enabled", () => {
    const result = buildActivePollOverview(
      [
        poll({
          id: "public-poll",
          title: "Public poll",
          publicResults: true,
          options: [
            { startTime: new Date("2026-08-22T12:15:00Z"), duration: 60 },
          ],
        }),
        poll({
          id: "private-poll",
          title: "Private poll",
          options: [
            { startTime: new Date("2026-08-22T12:30:00Z"), duration: 60 },
          ],
        }),
      ],
      defaultRange,
      referenceTime,
    );

    expect(result.find(({ id }) => id === "public-poll")).toMatchObject({
      publicResultsHref: "/invite/public-poll/results",
    });
    expect(result.find(({ id }) => id === "private-poll")).toMatchObject({
      publicResultsHref: null,
    });
  });
});
