"use client";
import type { VoteType } from "@rallly/database";
import { cn } from "@rallly/ui";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { ChevronRightIcon } from "lucide-react";
import * as React from "react";

import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import {
  filterParticipantsByVote,
  useParticipants,
} from "@/features/poll/components/participants-provider";
import { useTranslation } from "@/i18n/client";

import { IfScoresVisible } from "../visibility";
import { VoteButtonGroup } from "../vote-button-group";
import VoteIcon from "../vote-icon";

export interface PollOptionProps {
  children?: React.ReactNode;
  yesScore: number;
  ifNeedBeScore: number;
  editable?: boolean;
  vote?: VoteType;
  onChange: (vote: VoteType) => void;
  selectedParticipantId?: string;
  optionId: string;
  optionLabel: string;
  maxYes: number | null;
  disabled?: boolean;
}

const PollOptionVoteSummary: React.FunctionComponent<{ optionId: string }> = ({
  optionId,
}) => {
  const { t } = useTranslation();
  const { participants } = useParticipants();
  const participantsWhoVotedYes = filterParticipantsByVote(
    participants,
    optionId,
    "yes",
  );
  const participantsWhoVotedIfNeedBe = filterParticipantsByVote(
    participants,
    optionId,
    "ifNeedBe",
  );
  const participantsWhoVotedNo = filterParticipantsByVote(
    participants,
    optionId,
    "no",
  );
  const noVotes =
    participantsWhoVotedYes.length +
      participantsWhoVotedIfNeedBe.length +
      participantsWhoVotedNo.length ===
    0;

  const groups = [
    {
      type: "yes" as const,
      label: t("yes", { defaultValue: "Yes" }),
      participants: participantsWhoVotedYes,
      className: "border-green-500/20 bg-green-500/10 dark:border-green-400/20",
    },
    {
      type: "ifNeedBe" as const,
      label: t("ifNeedBe", { defaultValue: "If need be" }),
      participants: participantsWhoVotedIfNeedBe,
      className: "border-amber-500/20 bg-amber-500/10 dark:border-amber-400/20",
    },
    {
      type: "no" as const,
      label: t("no", { defaultValue: "No" }),
      participants: participantsWhoVotedNo,
      className: "border-border bg-muted/60",
    },
  ];

  return (
    <div>
      {noVotes ? (
        <p className="rounded-lg bg-muted p-2 text-center text-muted-foreground text-sm">
          {t("noVotes", {
            defaultValue: "No one has voted for this option",
          })}
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) =>
            group.participants.length > 0 ? (
              <section
                key={group.type}
                className={cn("rounded-xl border p-3", group.className)}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <VoteIcon type={group.type} size="sm" />
                  <span>{group.label}</span>
                  <span className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-xs tabular-nums">
                    {group.participants.length}
                  </span>
                </div>
                <ul className="mt-2.5 flex flex-wrap gap-2">
                  {group.participants.map(({ id, name, image }) => (
                    <li
                      key={id}
                      className="flex min-w-0 max-w-full items-center gap-2 rounded-full bg-background/80 py-1 pr-3 pl-1 shadow-xs"
                    >
                      <OptimizedAvatarImage
                        size="sm"
                        name={name}
                        src={image ?? undefined}
                      />
                      <span className="truncate text-sm">{name}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
};

const PollOption: React.FunctionComponent<PollOptionProps> = ({
  children,
  selectedParticipantId,
  vote,
  onChange,
  editable = false,
  optionId,
  optionLabel,
  yesScore,
  ifNeedBeScore,
  maxYes,
  disabled = false,
}) => {
  const showVotes = !!(selectedParticipantId || editable);
  const { participants } = useParticipants();
  const [isSummaryOpen, setIsSummaryOpen] = React.useState(false);
  const yesIsFull = maxYes !== null && yesScore >= maxYes;
  const participantHasExistingYes = participants.some(
    (participant) =>
      participant.id === selectedParticipantId &&
      participant.votes.some(
        (savedVote) =>
          savedVote.optionId === optionId && savedVote.type === "yes",
      ),
  );
  return (
    <div
      className={cn(
        "relative space-y-4 rounded-xl border bg-background p-4 shadow-sm transition-colors",
        editable && "border-border hover:border-primary/40",
      )}
      data-testid="poll-option"
    >
      <div className="flex min-h-10 items-center justify-between gap-x-4">
        <div className="shrink-0">{children}</div>
        <div className="flex items-center gap-x-4">
          <IfScoresVisible>
            <Button
              size="sm"
              variant="ghost"
              className="relative z-10 min-h-10 rounded-full px-3"
              onClick={() => setIsSummaryOpen(true)}
              aria-haspopup="dialog"
              aria-label={`View responses for ${optionLabel}`}
            >
              <span className="flex items-center gap-1 text-green-700 text-xs tabular-nums dark:text-green-300">
                <VoteIcon type="yes" size="sm" />
                {yesScore}
              </span>
              {ifNeedBeScore > 0 ? (
                <span className="flex items-center gap-1 text-amber-700 text-xs tabular-nums dark:text-amber-300">
                  <VoteIcon type="ifNeedBe" size="sm" />
                  {ifNeedBeScore}
                </span>
              ) : null}
              {maxYes !== null ? (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[0.625rem]",
                    yesIsFull
                      ? "bg-green-600 text-white"
                      : "bg-green-500/10 text-green-800 dark:text-green-200",
                  )}
                >
                  {yesScore}/{maxYes}
                </span>
              ) : null}
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </Button>
          </IfScoresVisible>

          {showVotes && !editable ? (
            <div className="flex size-7 items-center justify-center">
              <div
                key={vote}
                className="flex h-full items-center justify-center"
              >
                <VoteIcon type={vote} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {editable ? (
        <VoteButtonGroup
          value={vote}
          optionLabel={optionLabel}
          disabled={disabled}
          yesDisabled={yesIsFull && !participantHasExistingYes}
          onChange={onChange}
        />
      ) : null}
      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="max-h-[min(80vh,36rem)] overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="border-b p-4 pr-12">
            <DialogTitle>Responses</DialogTitle>
            <DialogDescription>{optionLabel}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto p-3">
            <PollOptionVoteSummary optionId={optionId} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PollOption;
