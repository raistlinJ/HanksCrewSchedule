import { describe, expect, it } from "vitest";

import { toggleVote } from "./vote-selector";

describe("toggleVote", () => {
  it("cycles through Yes when the option has capacity", () => {
    expect(toggleVote("no")).toBe("yes");
    expect(toggleVote("yes")).toBe("ifNeedBe");
  });

  it("skips Yes when the option is full", () => {
    expect(toggleVote("no", true)).toBe("ifNeedBe");
    expect(toggleVote("ifNeedBe", true)).toBe("no");
  });

  it("starts at If needed when the option is full", () => {
    expect(toggleVote(undefined, true)).toBe("ifNeedBe");
  });

  it("lets an existing Yes voter move to If needed", () => {
    expect(toggleVote("yes", true)).toBe("ifNeedBe");
  });
});
