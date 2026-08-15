import { describe, expect, it } from "vitest";
import { createDefaultTimeOption } from "./utils";

describe("createDefaultTimeOption", () => {
  it("rounds the start down and now plus one hour up to selectable times", () => {
    const option = createDefaultTimeOption(
      new Date(2026, 7, 15, 10, 23, 47, 500),
    );

    expect(option).toEqual({
      type: "timeSlot",
      start: "2026-08-15T10:15:00",
      end: "2026-08-15T11:30:00",
    });
  });

  it("keeps times that are already on selectable boundaries", () => {
    const option = createDefaultTimeOption(new Date(2026, 7, 15, 10, 15, 0, 0));

    expect(option).toEqual({
      type: "timeSlot",
      start: "2026-08-15T10:15:00",
      end: "2026-08-15T11:15:00",
    });
  });

  it("rounds a partial boundary minute up for the end time", () => {
    const option = createDefaultTimeOption(
      new Date(2026, 7, 15, 10, 15, 0, 500),
    );

    expect(option.end).toBe("2026-08-15T11:30:00");
  });
});
