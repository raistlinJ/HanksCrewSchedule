"use client";

import { Button } from "@rallly/ui/button";
import { Input } from "@rallly/ui/input";
import { toast } from "@rallly/ui/sonner";
import {
  ChevronDownIcon,
  LockIcon,
  SearchIcon,
  UnlockIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import VoteIcon from "@/features/poll/components/vote-icon";
import type { ResultResponse } from "@/features/poll/poll-results/utils";
import {
  filterResultParticipants,
  getResponseTotals,
  sortParticipantsByResponse,
} from "@/features/poll/poll-results/utils";
import { useDateTime } from "@/lib/datetime/client";

type ResultVote = {
  optionId: string;
  type: ResultResponse;
};

type AuxiliaryVote = {
  auxiliaryOptionId: string;
  type: ResultResponse;
};

export type ResultCardParticipant = {
  id: string;
  name: string;
  email?: string | null;
  image?: string | null;
  votedAt?: Date | null;
  votes: ResultVote[];
  auxiliaryVotes?: AuxiliaryVote[];
};

export type ResultCardAuxiliarySelection = {
  name: string;
  options: Array<{ id: string; label: string }>;
};

export type ResultCardPollOption = {
  id: string;
  label: string;
};

const responsePresentation = {
  yes: {
    label: "Yes",
    card: "border-green-500/20 bg-green-500/10",
    text: "text-green-700 dark:text-green-300",
  },
  ifNeedBe: {
    label: "If needed",
    card: "border-yellow-500/20 bg-yellow-500/10",
    text: "text-yellow-700 dark:text-yellow-300",
  },
  no: {
    label: "No",
    card: "border-red-500/20 bg-red-500/5",
    text: "text-red-700 dark:text-red-300",
  },
} satisfies Record<
  ResultResponse,
  { label: string; card: string; text: string }
>;

export function ResultsFilterInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative w-full md:w-80">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        className="pl-9"
        placeholder="Filter results..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ResultsEditLockButton({
  unlocked,
  onUnlockedChange,
}: {
  unlocked: boolean;
  onUnlockedChange: (unlocked: boolean) => void;
}) {
  const label = unlocked ? "Lock response editing" : "Unlock response editing";

  return (
    <Button
      type="button"
      variant={unlocked ? "primary" : "default"}
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={unlocked}
      onClick={() => onUnlockedChange(!unlocked)}
    >
      {unlocked ? <UnlockIcon /> : <LockIcon />}
    </Button>
  );
}

function getNextResponse(response: ResultResponse): ResultResponse {
  if (response === "no") return "ifNeedBe";
  if (response === "ifNeedBe") return "yes";
  return "no";
}

export function PollResultCards({
  title,
  participants,
  auxiliarySelection,
  options = [],
  filter = "",
  showEmail = false,
  editable = false,
  onParticipantChange,
}: {
  title?: string;
  participants: ResultCardParticipant[];
  auxiliarySelection?: ResultCardAuxiliarySelection | null;
  options?: ResultCardPollOption[];
  filter?: string;
  showEmail?: boolean;
  editable?: boolean;
  onParticipantChange?: (
    participant: ResultCardParticipant,
  ) => Promise<ResultCardParticipant | undefined>;
}) {
  const { formatDateTime } = useDateTime();
  const [displayParticipants, setDisplayParticipants] = useState(participants);
  const [pendingParticipantId, setPendingParticipantId] = useState<
    string | null
  >(null);

  useEffect(() => {
    setDisplayParticipants(participants);
  }, [participants]);

  const normalizedFilter = filter.trim().toLowerCase();
  const filteredParticipants = filterResultParticipants(
    displayParticipants,
    filter,
    auxiliarySelection,
  );
  const resultRows = sortParticipantsByResponse(filteredParticipants);
  const responseTotals = getResponseTotals(resultRows);

  const saveParticipant = async (
    previousParticipant: ResultCardParticipant,
    nextParticipant: ResultCardParticipant,
  ) => {
    if (!onParticipantChange || pendingParticipantId) return;

    setPendingParticipantId(previousParticipant.id);
    setDisplayParticipants((current) =>
      current.map((participant) =>
        participant.id === nextParticipant.id ? nextParticipant : participant,
      ),
    );

    try {
      const savedParticipant = await onParticipantChange(nextParticipant);
      if (savedParticipant) {
        setDisplayParticipants((current) =>
          current.map((participant) =>
            participant.id === savedParticipant.id
              ? savedParticipant
              : participant,
          ),
        );
      }
    } catch (error) {
      setDisplayParticipants((current) =>
        current.map((participant) =>
          participant.id === previousParticipant.id
            ? previousParticipant
            : participant,
        ),
      );
      toast.error(
        error instanceof Error
          ? error.message
          : "The response could not be updated.",
      );
    } finally {
      setPendingParticipantId(null);
    }
  };

  return (
    <section
      className={
        title ? "space-y-4 rounded-2xl border bg-card p-4 sm:p-5" : "space-y-4"
      }
    >
      {title ? <h2 className="font-semibold text-xl">{title}</h2> : null}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(["yes", "ifNeedBe", "no"] as const).map((response) => {
          const presentation = responsePresentation[response];
          return (
            <div
              key={response}
              className={`rounded-xl border p-3 ${presentation.card} ${presentation.text}`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs sm:text-sm">
                <VoteIcon type={response} className="size-4 sm:size-5" />
                <span className="truncate">{presentation.label}</span>
              </div>
              <div className="mt-1 font-bold text-2xl tabular-nums">
                {responseTotals[response]}
              </div>
            </div>
          );
        })}
      </div>

      {resultRows.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground text-sm">
          {normalizedFilter ? "No matching responses." : "No responses yet."}
        </div>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {resultRows.map(({ participant, response }) => {
            const presentation = responsePresentation[response];
            const auxiliaryVotes = new Map(
              participant.auxiliaryVotes?.map((vote) => [
                vote.auxiliaryOptionId,
                vote.type,
              ]),
            );
            const visibleAuxiliaryOptions = editable
              ? (auxiliarySelection?.options ?? [])
              : (auxiliarySelection?.options.filter(
                  (option) => auxiliaryVotes.get(option.id) === "yes",
                ) ?? []);
            const isPending = pendingParticipantId === participant.id;

            return (
              <li
                key={participant.id}
                className={`rounded-xl border p-4 ${presentation.card}`}
              >
                <div className="flex items-start gap-3">
                  <OptimizedAvatarImage
                    size="lg"
                    name={participant.name}
                    src={participant.image ?? undefined}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {participant.name}
                    </div>
                    {showEmail ? (
                      <div className="truncate text-muted-foreground text-sm">
                        {participant.email || "No email"}
                      </div>
                    ) : null}
                    {participant.votedAt ? (
                      <div className="mt-0.5 text-muted-foreground text-xs">
                        Voted {formatDateTime(participant.votedAt, "datetime")}
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={`flex shrink-0 items-center gap-2 font-medium ${presentation.text}`}
                  >
                    <VoteIcon type={response} className="size-6" />
                    <span className="hidden sm:inline">
                      {presentation.label}
                    </span>
                  </div>
                </div>

                {editable && options.length ? (
                  <div className="mt-3 border-current/10 border-t pt-3">
                    <div className="mb-2 font-medium text-sm">Responses</div>
                    <ul className="space-y-2">
                      {options.map((option) => {
                        const currentVote =
                          participant.votes.find(
                            (vote) => vote.optionId === option.id,
                          )?.type ?? "no";
                        const votePresentation =
                          responsePresentation[currentVote];

                        return (
                          <li
                            key={option.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 text-sm"
                          >
                            <span>{option.label}</span>
                            <button
                              type="button"
                              disabled={isPending}
                              aria-label={`${option.label}: ${votePresentation.label}. Change response`}
                              className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted disabled:opacity-50 ${votePresentation.text}`}
                              onClick={() => {
                                const nextType = getNextResponse(currentVote);
                                const existingVote = participant.votes.find(
                                  (vote) => vote.optionId === option.id,
                                );
                                const nextVotes = existingVote
                                  ? participant.votes.map((vote) =>
                                      vote.optionId === option.id
                                        ? { ...vote, type: nextType }
                                        : vote,
                                    )
                                  : [
                                      ...participant.votes,
                                      { optionId: option.id, type: nextType },
                                    ];

                                void saveParticipant(participant, {
                                  ...participant,
                                  votedAt: new Date(),
                                  votes: nextVotes,
                                });
                              }}
                            >
                              <VoteIcon type={currentVote} className="size-5" />
                              <span>{votePresentation.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {auxiliarySelection && visibleAuxiliaryOptions.length ? (
                  <details className="group mt-3 border-current/10 border-t pt-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-sm [&::-webkit-details-marker]:hidden">
                      <span>{auxiliarySelection.name}</span>
                      <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="mt-3 space-y-2">
                      {visibleAuxiliaryOptions.map((option) => {
                        const vote = auxiliaryVotes.get(option.id) ?? "no";
                        const votePresentation = responsePresentation[vote];
                        return (
                          <li
                            key={option.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-background/70 px-3 py-2 text-sm"
                          >
                            <span>{option.label}</span>
                            {editable ? (
                              <button
                                type="button"
                                disabled={isPending}
                                aria-label={`${option.label}: ${votePresentation.label}. Change response`}
                                className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 font-medium transition-colors hover:bg-muted disabled:opacity-50 ${votePresentation.text}`}
                                onClick={() => {
                                  const nextType =
                                    vote === "yes" ? "no" : "yes";
                                  const nextAuxiliaryVotes =
                                    auxiliarySelection.options.map(
                                      (auxiliaryOption) => ({
                                        auxiliaryOptionId: auxiliaryOption.id,
                                        type:
                                          auxiliaryOption.id === option.id
                                            ? nextType
                                            : (auxiliaryVotes.get(
                                                auxiliaryOption.id,
                                              ) ?? "no"),
                                      }),
                                    );

                                  void saveParticipant(participant, {
                                    ...participant,
                                    votedAt: new Date(),
                                    auxiliaryVotes: nextAuxiliaryVotes,
                                  });
                                }}
                              >
                                <VoteIcon type={vote} className="size-5" />
                                <span>{votePresentation.label}</span>
                              </button>
                            ) : (
                              <VoteIcon
                                type="yes"
                                className="size-5 shrink-0"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
