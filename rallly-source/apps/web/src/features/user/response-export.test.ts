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
        response: "yes",
        note: "Can help",
        responseUpdatedAt: "2026-08-15T14:00:00.000Z",
      },
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Jessie ""Jay"" Smith"');
    expect(csv).toContain('"Morning, shift"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
