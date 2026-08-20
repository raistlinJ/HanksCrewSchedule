import { describe, expect, it } from "vitest";
import type { UserResponseExportRow } from "./utils";
import { createUserHoursCsv, createUserResponsesCsv } from "./utils";

function makeRow(
  overrides: Partial<UserResponseExportRow> = {},
): UserResponseExportRow {
  return {
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
    ...overrides,
  };
}

describe("createUserHoursCsv", () => {
  it("adds the event date range heading and escapes user content", () => {
    const csv = createUserHoursCsv([
      makeRow(),
      makeRow({
        pollId: "poll-2",
        optionStart: "2026-08-17T15:00:00.000Z",
      }),
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Hours Export (2026-08-15 - 2026-08-17)");
    expect(csv).toContain('"Jessie ""Jay"" Smith"');
    expect(csv).toContain('"Morning, shift"');
    expect(csv).toContain('"Counted Hours (No Overlap)"');
    expect(csv).toContain('"Person Total Hours"');
  });

  it("counts overlapping poll hours only once per email", () => {
    const csv = createUserHoursCsv([
      makeRow({ durationMinutes: 120 }),
      makeRow({
        pollId: "poll-2",
        pollTitle: "Overlapping shift",
        optionStart: "2026-08-15T16:00:00.000Z",
        durationMinutes: 120,
      }),
      makeRow({
        userId: "user-2",
        userName: "Different person",
        userEmail: "OTHER@example.com",
        pollId: "poll-3",
        pollTitle: "Independent shift",
        optionStart: "2026-08-15T16:30:00.000Z",
        durationMinutes: 60,
      }),
    ]);
    const lines = csv.split("\r\n");

    expect(lines).toContain(
      '"Total","Jessie ""Jay"" Smith","jessie@example.com","","","","","","","","3"',
    );
    expect(lines).toContain(
      '"Total","Different person","OTHER@example.com","","","","","","","","1"',
    );
    expect(
      lines.find((line) => line.includes('"Overlapping shift"')),
    ).toContain('"2","1",""');
  });

  it("reports an empty date range when nobody answered yes", () => {
    expect(createUserHoursCsv([])).toContain("Hours Export (No yes responses)");
  });
});

describe("createUserResponsesCsv", () => {
  it("retains the original flat response export columns and values", () => {
    const csv = createUserResponsesCsv([
      makeRow({
        responseKind: "auxiliary",
        auxiliarySelection: "Roles",
        auxiliaryMinYes: 1,
        auxiliaryMaxYesSelections: 2,
        auxiliaryOption: "Driver",
        auxiliaryOptionMaxYes: 3,
        response: "ifNeedBe",
      }),
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Response Kind"');
    expect(csv).toContain('"Auxiliary Selection"');
    expect(csv).toContain('"Auxiliary Choice Yes Limit"');
    expect(csv).toContain('"ifNeedBe"');
    expect(csv.split("\r\n")).toHaveLength(2);
  });
});
