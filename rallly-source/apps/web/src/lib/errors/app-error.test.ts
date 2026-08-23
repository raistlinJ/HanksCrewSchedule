import { describe, expect, it } from "vitest";
import { AppError, findAppError } from "./app-error";

describe("findAppError", () => {
  it("finds an AppError nested inside a transport error", () => {
    const appError = new AppError({
      code: "OPTION_FULL",
      message: "The Yes limit has been reached",
    });
    const transportError = new Error("Conflict", { cause: appError });

    expect(findAppError(transportError)).toBe(appError);
  });

  it("returns null for unrelated errors", () => {
    expect(findAppError(new Error("Unexpected"))).toBeNull();
  });
});
