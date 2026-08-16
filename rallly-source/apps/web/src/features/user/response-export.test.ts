import { describe, expect, it } from "vitest";
import { createUserResponsesCsv } from "./utils";

describe("createUserResponsesCsv", () => {
  it("exports a BOM-prefixed CSV and escapes user content", () => {
    const csv = createUserResponsesCsv([
      {
        userId: "user-1",
        userName: 'Jessie "Jay" Smith',
        userEmail: "jessie@example.com",
        pollGroup: "Volunteer Day",
        pollId: "poll-1",
        pollTitle: "Morning, shift",
        pollStatus: "open",
        optionStart: "2026-08-15T15:00:00.000Z",
        durationMinutes: 60,
        optionMaxYes: 8,
        hasPrimaryYes: "yes",
        auxiliarySelection: "Roles",
        auxiliaryMinYes: 1,
        auxiliaryMaxYesSelections: 1,
        auxiliaryOption: "Driver",
        auxiliaryOptionMaxYes: 2,
        response: "yes",
        note: "Can help",
        responseUpdatedAt: "2026-08-15T14:00:00.000Z",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Jessie ""Jay"" Smith"');
    expect(csv).toContain('"Morning, shift"');
    expect(csv).toContain('"Option Yes Limit"');
    expect(csv).toContain('"Auxiliary Minimum Yes"');
    expect(csv).toContain('"Auxiliary Maximum Selections Per Participant"');
    expect(csv).toContain('"Auxiliary Choice Yes Limit"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
