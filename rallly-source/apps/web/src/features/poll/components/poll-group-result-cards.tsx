"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ResultCardParticipant } from "@/features/poll/components/poll-result-cards";
import {
  PollResultCards,
  ResultsEditLockButton,
  ResultsFilterInput,
} from "@/features/poll/components/poll-result-cards";
import {
  filterResultParticipants,
  getLatestVoteDate,
} from "@/features/poll/poll-results/utils";
import { useDateTime } from "@/lib/datetime/client";
import { trpc } from "@/trpc/client";

type DatedVote = {
  createdAt: Date;
  updatedAt: Date | null;
};

type PollGroupResults = {
  polls: Array<{
    id: string;
    title: string;
    timeZone: string | null;
    options: Array<{
      id: string;
      startTime: Date;
      duration: number;
    }>;
    auxiliarySelection: {
      name: string;
      options: Array<{ id: string; label: string }>;
    } | null;
    participants: Array<{
      id: string;
      name: string;
      email?: string | null;
      user?: { image: string | null } | null;
      votes: Array<
        DatedVote & {
          optionId: string;
          type: "yes" | "no" | "ifNeedBe";
        }
      >;
      auxiliaryVotes: Array<
        DatedVote & {
          auxiliaryOptionId: string;
          type: "yes" | "no" | "ifNeedBe";
        }
      >;
    }>;
  }>;
};

export function PollGroupResultCards({
  group,
  showEmail = false,
  canEdit = false,
}: {
  group: PollGroupResults;
  showEmail?: boolean;
  canEdit?: boolean;
}) {
  const [filter, setFilter] = useState("");
  const [editingUnlocked, setEditingUnlocked] = useState(false);
  const updateParticipant = trpc.polls.participants.update.useMutation();
  const utils = trpc.useUtils();
  const router = useRouter();
  const { formatDateTime, formatDateTimeRange } = useDateTime();
  const normalizedFilter = filter.trim().toLowerCase();
  const polls = useMemo(
    () =>
      group.polls
        .map((poll) => {
          const titleMatches = poll.title
            .toLowerCase()
            .includes(normalizedFilter);
          const participants: ResultCardParticipant[] = poll.participants.map(
            (participant) => ({
              id: participant.id,
              name: participant.name,
              email: participant.email,
              image: participant.user?.image,
              votedAt: getLatestVoteDate([
                ...participant.votes,
                ...participant.auxiliaryVotes,
              ]),
              votes: participant.votes,
              auxiliaryVotes: participant.auxiliaryVotes,
            }),
          );
          const hasParticipantMatch =
            filterResultParticipants(
              participants,
              filter,
              poll.auxiliarySelection,
            ).length > 0;
          const options = poll.options.map((option) => {
            const endTime = new Date(
              option.startTime.getTime() + option.duration * 60_000,
            );
            const timeZoneOptions =
              option.duration > 0 ? undefined : { timeZone: "UTC" };

            return {
              id: option.id,
              label:
                option.duration > 0
                  ? formatDateTimeRange(
                      option.startTime,
                      endTime,
                      "datetime",
                      timeZoneOptions,
                    )
                  : formatDateTime(option.startTime, "date", timeZoneOptions),
            };
          });

          return {
            poll,
            participants,
            options,
            titleMatches,
            hasParticipantMatch,
          };
        })
        .filter(
          ({ titleMatches, hasParticipantMatch }) =>
            !normalizedFilter || titleMatches || hasParticipantMatch,
        ),
    [
      filter,
      formatDateTime,
      formatDateTimeRange,
      group.polls,
      normalizedFilter,
    ],
  );

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <div className="flex w-full min-w-0 items-center gap-2">
        <ResultsFilterInput value={filter} onChange={setFilter} />
        {canEdit ? (
          <ResultsEditLockButton
            unlocked={editingUnlocked}
            onUnlockedChange={setEditingUnlocked}
          />
        ) : null}
      </div>
      {polls.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground text-sm">
          No matching results.
        </div>
      ) : (
        polls.map(({ poll, participants, options, titleMatches }) => (
          <PollResultCards
            key={poll.id}
            title={poll.title}
            participants={participants}
            auxiliarySelection={poll.auxiliarySelection}
            options={options}
            filter={titleMatches ? "" : filter}
            showEmail={showEmail}
            editable={canEdit && editingUnlocked}
            onParticipantChange={async (participant) => {
              const savedParticipant = await updateParticipant.mutateAsync({
                pollId: poll.id,
                participantId: participant.id,
                votes: participant.votes,
                auxiliaryVotes: participant.auxiliaryVotes ?? [],
              });
              await utils.polls.participants.list.invalidate({
                pollId: poll.id,
              });
              router.refresh();

              return {
                ...participant,
                name: savedParticipant.name,
                email: savedParticipant.email,
                image: savedParticipant.image,
                votedAt: savedParticipant.votedAt,
                votes: savedParticipant.votes,
                auxiliaryVotes: savedParticipant.auxiliaryVotes,
              };
            }}
          />
        ))
      )}
    </div>
  );
}
