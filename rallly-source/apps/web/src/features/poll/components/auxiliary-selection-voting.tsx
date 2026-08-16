"use client";

import { cn } from "@rallly/ui";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { usePoll } from "@/features/poll/components/poll-context";
import VoteIcon from "@/features/poll/components/vote-icon";
import { VoteSelector } from "@/features/poll/components/vote-selector";
import { useVotingForm } from "@/features/poll/components/voting-form";

export function AuxiliarySelectionVoting() {
  const { poll } = usePoll();
  const { participants } = useParticipants();
  const form = useVotingForm();
  const selection = poll.auxiliarySelection;

  if (!selection) {
    return null;
  }

  const isEditing = form.watch("mode") !== "view";
  const participantId = form.watch("participantId");
  const formVotes = form.watch("auxiliaryVotes") ?? [];
  const selectedParticipant = participants.find(
    (participant) => participant.id === participantId,
  );
  const selectedYesCount = formVotes.filter(
    (vote) => vote?.type === "yes",
  ).length;

  return (
    <section className="border-t bg-muted/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h3 className="font-semibold">{selection.name}</h3>
          <p className="text-muted-foreground text-xs">
            {selection.minYes > 0 && selection.maxYesSelections !== null
              ? `Select Yes for ${selection.minYes} to ${selection.maxYesSelections} choices.`
              : selection.minYes > 0
                ? `Select Yes for at least ${selection.minYes} choice${selection.minYes === 1 ? "" : "s"}.`
                : selection.maxYesSelections !== null
                  ? `Select Yes for up to ${selection.maxYesSelections} choice${selection.maxYesSelections === 1 ? "" : "s"}.`
                  : "These choices are optional."}
          </p>
        </div>
        {isEditing &&
        (selection.minYes > 0 || selection.maxYesSelections !== null) ? (
          <span
            className={cn(
              "rounded-full px-2 py-1 font-medium text-xs",
              selectedYesCount >= selection.minYes &&
                (selection.maxYesSelections === null ||
                  selectedYesCount <= selection.maxYesSelections)
                ? "bg-green-500/10 text-green-700 dark:text-green-300"
                : "bg-amber-500/10 text-amber-800 dark:text-amber-300",
            )}
          >
            {selectedYesCount} selected
            {selection.minYes > 0 ? ` · min ${selection.minYes}` : ""}
            {selection.maxYesSelections !== null
              ? ` · max ${selection.maxYesSelections}`
              : ""}
          </span>
        ) : null}
      </div>
      <div className="divide-y">
        {selection.options.map((option, index) => {
          const yesParticipants = participants.filter((participant) =>
            participant.auxiliaryVotes.some(
              (vote) =>
                vote.auxiliaryOptionId === option.id && vote.type === "yes",
            ),
          );
          const yesIsFull =
            option.maxYes !== null && yesParticipants.length >= option.maxYes;
          const participantHasExistingYes = yesParticipants.some(
            (participant) => participant.id === participantId,
          );
          const value = isEditing
            ? (formVotes[index]?.type ?? "ifNeedBe")
            : selectedParticipant?.auxiliaryVotes.find(
                (vote) => vote.auxiliaryOptionId === option.id,
              )?.type;
          const participantLimitReached =
            selection.maxYesSelections !== null &&
            selectedYesCount >= selection.maxYesSelections &&
            value !== "yes";

          return (
            <div key={option.id} className="px-4 py-3">
              <div className="flex min-h-9 items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm">{option.label}</div>
                  {yesParticipants.length > 0 ? (
                    <div className="mt-0.5 truncate text-muted-foreground text-xs">
                      Yes: {yesParticipants.map(({ name }) => name).join(", ")}
                    </div>
                  ) : null}
                </div>
                {option.maxYes !== null ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-1 font-medium text-xs tabular-nums",
                      yesIsFull
                        ? "bg-green-600 text-white"
                        : "bg-green-500/10 text-green-800 dark:text-green-200",
                    )}
                  >
                    {yesIsFull
                      ? `Yes full (${yesParticipants.length}/${option.maxYes})`
                      : `${yesParticipants.length}/${option.maxYes} Yes`}
                  </span>
                ) : null}
                {isEditing ? (
                  <VoteSelector
                    optionLabel={option.label}
                    value={value ?? "ifNeedBe"}
                    yesDisabled={
                      (yesIsFull && !participantHasExistingYes) ||
                      participantLimitReached
                    }
                    onChange={(type) => {
                      const nextVotes = [...formVotes];
                      nextVotes[index] = {
                        auxiliaryOptionId: option.id,
                        type,
                      };
                      form.setValue("auxiliaryVotes", nextVotes, {
                        shouldDirty: true,
                      });
                    }}
                  />
                ) : value ? (
                  <VoteIcon type={value} />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
