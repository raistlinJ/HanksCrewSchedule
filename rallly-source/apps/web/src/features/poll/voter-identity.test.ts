import { describe, expect, it } from "vitest";
import { isVoterIdentityComplete } from "./voter-identity/utils";

describe("isVoterIdentityComplete", () => {
  it("requires both a name and a valid email", () => {
    expect(
      isVoterIdentityComplete({ name: "Jordan", email: "j@example.com" }),
    ).toBe(true);
    expect(isVoterIdentityComplete({ name: "", email: "j@example.com" })).toBe(
      false,
    );
    expect(isVoterIdentityComplete({ name: "Jordan", email: "invalid" })).toBe(
      false,
    );
  });
});
