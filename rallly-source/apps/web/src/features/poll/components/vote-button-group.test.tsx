import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VoteButtonGroup } from "./vote-button-group";

vi.mock("@/i18n/client", () => ({
  Trans: ({ defaults }: { defaults: string }) => defaults,
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? _key,
  }),
}));

describe("VoteButtonGroup", () => {
  it("shows large explicit choices and selects one directly", () => {
    const onChange = vi.fn();
    render(<VoteButtonGroup value="ifNeedBe" onChange={onChange} />);

    expect(screen.getByRole("button", { name: "Yes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "If needed" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onChange).toHaveBeenCalledWith("no");
  });

  it("disables only Yes when that choice has reached its limit", () => {
    render(
      <VoteButtonGroup value="no" yesDisabled={true} onChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "If needed" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "No" })).toBeEnabled();
  });
});
