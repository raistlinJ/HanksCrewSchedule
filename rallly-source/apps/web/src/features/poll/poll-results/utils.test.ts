import { describe, expect, it } from "vitest";
import {
  filterResultParticipants,
  getLatestVoteDate,
  getOverallResponse,
  getResponseTotals,
  isPublicPollResultsPath,
  redactPublicResultParticipants,
  sortParticipantsByResponse,
} from "./utils";

describe("public poll result responses", () => {
  it("uses the latest vote creation or update time", () => {
    const firstVote = new Date("2026-08-17T14:00:00.000Z");
    const updatedVote = new Date("2026-08-17T15:30:00.000Z");

    expect(
      getLatestVoteDate([
        { createdAt: firstVote, updatedAt: null },
        { createdAt: firstVote, updatedAt: updatedVote },
      ]),
    ).toEqual(updatedVote);
    expect(getLatestVoteDate([])).toBeNull();
  });

  it("uses the strongest response across a participant's votes", () => {
    expect(getOverallResponse([{ type: "no" }, { type: "yes" }])).toBe("yes");
    expect(getOverallResponse([{ type: "no" }, { type: "ifNeedBe" }])).toBe(
      "ifNeedBe",
    );
    expect(getOverallResponse([{ type: "no" }])).toBe("no");
    expect(getOverallResponse([])).toBe("no");
  });

  it("sorts yes first, if-needed second, and no last", () => {
    const sorted = sortParticipantsByResponse([
      { name: "No", votes: [{ type: "no" as const }] },
      { name: "Maybe", votes: [{ type: "ifNeedBe" as const }] },
      { name: "Yes", votes: [{ type: "yes" as const }] },
    ]);

    expect(sorted.map((row) => row.participant.name)).toEqual([
      "Yes",
      "Maybe",
      "No",
    ]);
  });

  it("counts each overall response", () => {
    expect(
      getResponseTotals([
        { response: "yes" },
        { response: "yes" },
        { response: "ifNeedBe" },
        { response: "no" },
      ]),
    ).toEqual({ yes: 2, ifNeedBe: 1, no: 1 });
  });

  it("filters result participants by name or email", () => {
    const participants = [
      { name: "Avery Example", email: "avery@example.com" },
      { name: "Blake Sample", email: "blake@example.com" },
    ];

    expect(filterResultParticipants(participants, "avery")).toEqual([
      participants[0],
    ]);
    expect(filterResultParticipants(participants, "BLAKE@EXAMPLE")).toEqual([
      participants[1],
    ]);
    expect(filterResultParticipants(participants, "  ")).toEqual(participants);
  });

  it("filters participants by affirmative auxiliary items", () => {
    const participants = [
      {
        name: "Avery",
        auxiliaryVotes: [
          { auxiliaryOptionId: "registration", type: "yes" as const },
          { auxiliaryOptionId: "cleanup", type: "no" as const },
        ],
      },
      {
        name: "Blake",
        auxiliaryVotes: [
          { auxiliaryOptionId: "cleanup", type: "yes" as const },
        ],
      },
    ];
    const auxiliarySelection = {
      name: "Skills",
      options: [
        { id: "registration", label: "Registration" },
        { id: "cleanup", label: "Cleanup" },
      ],
    };

    expect(
      filterResultParticipants(
        participants,
        "registration",
        auxiliarySelection,
      ),
    ).toEqual([participants[0]]);
    expect(
      filterResultParticipants(participants, "cleanup", auxiliarySelection),
    ).toEqual([participants[1]]);
    expect(
      filterResultParticipants(participants, "skills", auxiliarySelection),
    ).toEqual(participants);
  });

  it("recognizes only the public invite results route", () => {
    expect(isPublicPollResultsPath("/en/invite/poll-1/results")).toBe(true);
    expect(isPublicPollResultsPath("/en/poll/poll-1/results")).toBe(false);
    expect(isPublicPollResultsPath("/en/invite/poll-1")).toBe(false);
  });

  it("redacts private participant fields from public results", () => {
    const participants = redactPublicResultParticipants([
      { id: "participant-1", email: "person@example.com", note: "Private" },
    ]);

    expect(participants).toEqual([
      { id: "participant-1", email: null, note: null },
    ]);
  });
});
