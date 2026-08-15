import { describe, expect, it } from "vitest";
import { createStoredZip } from "./stored-zip";

describe("createStoredZip", () => {
  it("creates a ZIP containing each named file", () => {
    const zip = createStoredZip(
      [
        { name: "one.png", data: new Uint8Array([1, 2, 3]) },
        { name: "two.png", data: new Uint8Array([4, 5]) },
      ],
      new Date("2026-08-15T12:00:00"),
    );
    const view = new DataView(zip.buffer);
    const text = new TextDecoder().decode(zip);

    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(text).toContain("one.png");
    expect(text).toContain("two.png");
    expect(view.getUint32(zip.byteLength - 22, true)).toBe(0x06054b50);
  });
});
