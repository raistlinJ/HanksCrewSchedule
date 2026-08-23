import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  PollResultCards,
  ResultsEditLockButton,
} from "@/features/poll/components/poll-result-cards";
import { render, screen } from "@/test/test-utils";

describe("PollResultCards", () => {
  it("reveals only affirmative auxiliary responses while locked", async () => {
    const user = userEvent.setup();
    render(
      <PollResultCards
        participants={[
          {
            id: "participant-1",
            name: "Avery Example",
            votes: [{ optionId: "option-1", type: "yes" }],
            auxiliaryVotes: [{ auxiliaryOptionId: "aux-1", type: "yes" }],
          },
        ]}
        auxiliarySelection={{
          name: "Skills",
          options: [
            { id: "aux-1", label: "Registration" },
            { id: "aux-2", label: "Cleanup" },
          ],
        }}
      />,
    );

    const details = screen.getByText("Skills").closest("details");
    expect(details).not.toHaveAttribute("open");

    await user.click(screen.getByText("Skills"));

    expect(details).toHaveAttribute("open");
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.queryByText("Cleanup")).not.toBeInTheDocument();
  });

  it("allows auxiliary responses to be changed while unlocked", async () => {
    const user = userEvent.setup();
    const onParticipantChange = vi.fn().mockResolvedValue(undefined);
    render(
      <PollResultCards
        editable
        onParticipantChange={onParticipantChange}
        participants={[
          {
            id: "participant-1",
            name: "Avery Example",
            votes: [{ optionId: "option-1", type: "yes" }],
            auxiliaryVotes: [{ auxiliaryOptionId: "aux-1", type: "yes" }],
          },
        ]}
        auxiliarySelection={{
          name: "Skills",
          options: [
            { id: "aux-1", label: "Registration" },
            { id: "aux-2", label: "Cleanup" },
          ],
        }}
      />,
    );

    await user.click(screen.getByText("Skills"));
    await user.click(
      screen.getByRole("button", {
        name: "Cleanup: No. Change response",
      }),
    );

    expect(onParticipantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        auxiliaryVotes: [
          { auxiliaryOptionId: "aux-1", type: "yes" },
          { auxiliaryOptionId: "aux-2", type: "yes" },
        ],
      }),
    );
  });

  it("allows poll responses to be changed while unlocked", async () => {
    const user = userEvent.setup();
    const onParticipantChange = vi.fn().mockResolvedValue(undefined);
    render(
      <PollResultCards
        editable
        onParticipantChange={onParticipantChange}
        options={[{ id: "option-1", label: "Monday, August 24" }]}
        participants={[
          {
            id: "participant-1",
            name: "Avery Example",
            votes: [{ optionId: "option-1", type: "yes" }],
          },
        ]}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Monday, August 24: Yes. Change response",
      }),
    );

    expect(onParticipantChange).toHaveBeenCalledWith(
      expect.objectContaining({
        votes: [{ optionId: "option-1", type: "no" }],
      }),
    );
  });

  it("toggles the response editing lock", async () => {
    const user = userEvent.setup();
    const onUnlockedChange = vi.fn();
    render(
      <ResultsEditLockButton
        unlocked={false}
        onUnlockedChange={onUnlockedChange}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Unlock response editing" }),
    );

    expect(onUnlockedChange).toHaveBeenCalledWith(true);
  });
});
