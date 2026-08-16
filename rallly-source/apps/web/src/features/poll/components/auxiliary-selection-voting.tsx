"use client";

import { cn } from "@rallly/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { usePoll } from "@/features/poll/components/poll-context";
import { VoteButtonGroup } from "@/features/poll/components/vote-button-group";
import VoteIcon from "@/features/poll/components/vote-icon";
import { VoteSelector } from "@/features/poll/components/vote-selector";
import { useVotingForm } from "@/features/poll/components/voting-form";

export function AuxiliarySelectionVoting() {
  const { poll } = usePoll();
  const { participants } = useParticipants();
  const form = useVotingForm();
  const [viewingParticipants, setViewingParticipants] = useState<{
    label: string;
    participants: Array<{
      id: string;
      name: string;
      image?: string | null;
    }>;
  } | null>(null);
  const selection = poll.auxiliarySelection;

  if (!selection) {
    return null;
  }

  const isEditing = form.watch("mode") !== "view";
  const participantId = form.watch("participantId");
  const primaryVotes = form.watch("votes") ?? [];
  const formVotes = form.watch("auxiliaryVotes") ?? [];
  const selectedParticipant = participants.find(
    (participant) => participant.id === participantId,
  );
  const selectedYesCount = formVotes.filter(
    (vote) => vote?.type === "yes",
  ).length;
  const hasPrimaryYes = isEditing
    ? primaryVotes.some((vote) => vote?.type === "yes")
    : (selectedParticipant?.votes.some((vote) => vote.type === "yes") ?? false);

  if (!hasPrimaryYes) {
    return null;
  }

  return (
    <>
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
            const yesDisabled =
              (yesIsFull && !participantHasExistingYes) ||
              participantLimitReached;
            const updateVote = (type: "yes" | "no" | "ifNeedBe") => {
              const nextVotes = [...formVotes];
              nextVotes[index] = {
                auxiliaryOptionId: option.id,
                type,
              };
              form.setValue("auxiliaryVotes", nextVotes, {
                shouldDirty: true,
              });
            };

            return (
              <div key={option.id} className="px-3 py-3 sm:px-4">
                <div className="flex min-h-9 items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm">{option.label}</div>
                    {yesParticipants.length > 0 ? (
                      <button
                        type="button"
                        className="mt-1 flex min-h-11 max-w-full items-center gap-2 rounded-md px-1 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        onClick={() =>
                          setViewingParticipants({
                            label: option.label,
                            participants: yesParticipants.map(
                              ({ id, name, image }) => ({ id, name, image }),
                            ),
                          })
                        }
                      >
                        <span className="min-w-0 truncate text-xs">
                          {yesParticipants.length} signed up ·{" "}
                          {yesParticipants.map(({ name }) => name).join(", ")}
                        </span>
                        <ChevronRightIcon className="size-4 shrink-0" />
                      </button>
                    ) : null}
                  </div>
                  {option.maxYes !== null ? (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-1 font-medium text-xs tabular-nums",
                        yesIsFull
                          ? "bg-green-600 text-white"
                          : "bg-green-500/10 text-green-800 dark:text-green-200",
                      )}
                    >
                      {yesParticipants.length}/{option.maxYes}
                    </span>
                  ) : null}
                  {isEditing ? (
                    <div className="hidden sm:block">
                      <VoteSelector
                        optionLabel={option.label}
                        value={value ?? "ifNeedBe"}
                        disabled={!form.identityReady}
                        yesDisabled={yesDisabled}
                        onChange={updateVote}
                      />
                    </div>
                  ) : value ? (
                    <VoteIcon type={value} />
                  ) : null}
                </div>
                {isEditing ? (
                  <VoteButtonGroup
                    className="mt-3 sm:hidden"
                    value={value ?? "ifNeedBe"}
                    optionLabel={option.label}
                    disabled={!form.identityReady}
                    yesDisabled={yesDisabled}
                    onChange={updateVote}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      <Dialog
        open={viewingParticipants !== null}
        onOpenChange={(open) => {
          if (!open) setViewingParticipants(null);
        }}
      >
        <DialogContent className="max-h-[min(80vh,36rem)] overflow-hidden p-0 sm:max-w-md">
          {viewingParticipants ? (
            <>
              <DialogHeader className="border-b p-4 pr-12">
                <DialogTitle>{viewingParticipants.label}</DialogTitle>
                <DialogDescription>
                  {viewingParticipants.participants.length}{" "}
                  {viewingParticipants.participants.length === 1
                    ? "person signed up"
                    : "people signed up"}
                </DialogDescription>
              </DialogHeader>
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto p-3">
                {viewingParticipants.participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
                  >
                    <OptimizedAvatarImage
                      size="sm"
                      name={participant.name}
                      src={participant.image ?? undefined}
                    />
                    <span className="min-w-0 truncate font-medium text-sm">
                      {participant.name}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
