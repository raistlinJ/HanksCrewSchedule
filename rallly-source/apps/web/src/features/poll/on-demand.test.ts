import { describe, expect, it } from "vitest";
import {
  createDefaultOnDemandTimeOption,
  getOnDemandPollTitle,
} from "./on-demand/utils";

describe("createDefaultOnDemandTimeOption", () => {
  it("rounds the start down to a half hour and ends 90 minutes later", () => {
    expect(
      createDefaultOnDemandTimeOption(new Date(2026, 7, 19, 14, 47, 28)),
    ).toEqual({
      type: "timeSlot",
      start: "2026-08-19T14:30:00",
      end: "2026-08-19T16:00:00",
    });
  });

  it("carries the end date into the next day", () => {
    expect(
      createDefaultOnDemandTimeOption(new Date(2026, 7, 19, 23, 50)),
    ).toEqual({
      type: "timeSlot",
      start: "2026-08-19T23:30:00",
      end: "2026-08-20T01:00:00",
    });
  });
});

describe("getOnDemandPollTitle", () => {
  it("uses only the local date and time when the title is unique", () => {
    expect(getOnDemandPollTitle("2026-08-19T14:30:00")).toBe(
      "2026-08-19/14:30",
    );
  });

  it("adds the first available suffix only when the title collides", () => {
    expect(
      getOnDemandPollTitle("2026-08-19T14:30:00", [
        "2026-08-19/14:30",
        "2026-08-19/14:30-(2)",
        "A different poll",
      ]),
    ).toBe("2026-08-19/14:30-(3)");
  });
});
