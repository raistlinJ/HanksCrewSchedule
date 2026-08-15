import { createUserQrCodeValue, parseUserQrCodeValue } from "./schema";

const token = "18952f2f-9a61-4d28-a3a3-fc748689c150";

describe("user QR codes", () => {
  it("round-trips an opaque user token", () => {
    expect(parseUserQrCodeValue(createUserQrCodeValue(token))).toBe(token);
  });

  it("rejects another QR payload", () => {
    expect(parseUserQrCodeValue("https://example.com/users/123")).toBeNull();
  });

  it("rejects malformed credentials", () => {
    expect(parseUserQrCodeValue("rallly-user:v1:not-a-uuid")).toBeNull();
  });
});
