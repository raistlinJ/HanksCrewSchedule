"use client";

import { Button } from "@rallly/ui/button";
import { shortUrl } from "@rallly/utils/absolute-url";
import { ArrowLeftIcon, CheckIcon, CopyIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useCopyToClipboard } from "react-use";
import { usePoll } from "@/features/poll/client";
import { useParticipants } from "@/features/poll/components/participants-provider";
import {
  PollResultCards,
  ResultsEditLockButton,
  ResultsFilterInput,
} from "@/features/poll/components/poll-result-cards";
import { Trans } from "@/i18n/client";
import { useDateTime } from "@/lib/datetime/client";
import { trpc } from "@/trpc/client";

export function PollResultsPage({
  publicView = false,
}: {
  publicView?: boolean;
}) {
  const { participants } = useParticipants();
  const poll = usePoll();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, copyToClipboard] = useCopyToClipboard();
  const [didCopyResultsLink, setDidCopyResultsLink] = useState(false);
  const [filter, setFilter] = useState("");
  const [editingUnlocked, setEditingUnlocked] = useState(false);
  const updateParticipant = trpc.polls.participants.update.useMutation();
  const utils = trpc.useUtils();
  const { formatDateTime, formatDateTimeRange } = useDateTime();
  const token = searchParams.get("token");
  const publicPollHref = token
    ? `/invite/${poll.id}?token=${encodeURIComponent(token)}`
    : `/invite/${poll.id}`;
  const publicResultsLink = shortUrl(`/invite/${poll.id}/results`);
  const resultOptions = poll.options.map((option) => {
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        {publicView ? (
          <Link
            href={publicPollHref}
            className="flex items-center font-medium text-primary text-sm hover:underline"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to poll
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center font-medium text-primary text-sm hover:underline"
          >
            <ArrowLeftIcon className="mr-1 h-4 w-4" />
            Back to poll
          </button>
        )}
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b pb-8 md:flex-row">
        <div>
          <h1 className="mb-2 font-bold text-3xl tracking-tight">
            {poll.title} - Results
          </h1>
          {poll.description && (
            <p className="whitespace-pre-wrap text-md text-muted-foreground">
              {poll.description}
            </p>
          )}
        </div>
        {!publicView ? (
          <div className="flex flex-wrap justify-end gap-2">
            {poll.publicResults ? (
              <Button
                onClick={() => {
                  copyToClipboard(publicResultsLink);
                  setDidCopyResultsLink(true);
                  window.setTimeout(() => setDidCopyResultsLink(false), 1000);
                }}
              >
                {didCopyResultsLink ? <CheckIcon /> : <CopyIcon />}
                {didCopyResultsLink ? "Copied" : "Copy public results link"}
              </Button>
            ) : null}
            {poll.canManage ? (
              <a href={`/poll/${poll.id}/export/csv`} download>
                <Button className="flex items-center gap-2">
                  <DownloadIcon className="h-4 w-4" />
                  <Trans i18nKey="exportToCsv" defaults="Export to CSV" />
                </Button>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-w-0 max-w-full space-y-4">
        <div className="flex w-full min-w-0 items-center gap-2">
          <ResultsFilterInput value={filter} onChange={setFilter} />
          {!publicView && poll.canManage ? (
            <ResultsEditLockButton
              unlocked={editingUnlocked}
              onUnlockedChange={setEditingUnlocked}
            />
          ) : null}
        </div>
        <PollResultCards
          participants={participants}
          auxiliarySelection={poll.auxiliarySelection}
          options={resultOptions}
          filter={filter}
          showEmail={!publicView}
          editable={!publicView && poll.canManage && editingUnlocked}
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
      </div>
    </div>
  );
}
