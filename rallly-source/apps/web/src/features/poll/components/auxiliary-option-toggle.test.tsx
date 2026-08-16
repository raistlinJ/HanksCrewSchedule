import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuxiliaryOptionToggle } from "./auxiliary-option-toggle";

describe("AuxiliaryOptionToggle", () => {
  it("uses one compact binary selection control", () => {
    const onChange = vi.fn();
    render(
      <AuxiliaryOptionToggle
        optionLabel="Driver"
        selected={false}
        onChange={onChange}
      />,
    );

    const button = screen.getByRole("button", {
      name: "Driver: Not selected",
    });
    expect(button).toHaveTextContent("Select");
    expect(button).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(button);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("allows a selected choice to be cleared", () => {
    const onChange = vi.fn();
    render(
      <AuxiliaryOptionToggle
        optionLabel="Driver"
        selected={true}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Driver: Selected" }));
    expect(onChange).toHaveBeenCalledWith(false);
  });
});
