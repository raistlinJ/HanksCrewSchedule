import { describe, expect, it } from "vitest";
import { duplicateAuxiliarySelection } from "./utils";

describe("duplicateAuxiliarySelection", () => {
  it("copies the name, minimum, ordered choices, and Yes maximums", () => {
    expect(
      duplicateAuxiliarySelection({
        name: "Roles",
        minYes: 2,
        maxYesSelections: 2,
        options: [
          { label: "Driver", maxYes: 1, position: 0 },
          { label: "Setup", maxYes: null, position: 1 },
          { label: "Cleanup", maxYes: 3, position: 2 },
        ],
      }),
    ).toEqual({
      create: {
        name: "Roles",
        minYes: 2,
        maxYesSelections: 2,
        options: {
          createMany: {
            data: [
              { label: "Driver", maxYes: 1, position: 0 },
              { label: "Setup", maxYes: null, position: 1 },
              { label: "Cleanup", maxYes: 3, position: 2 },
            ],
          },
        },
      },
    });
  });

  it("keeps polls without auxiliary selections unchanged", () => {
    expect(duplicateAuxiliarySelection(null)).toBeUndefined();
  });
});
