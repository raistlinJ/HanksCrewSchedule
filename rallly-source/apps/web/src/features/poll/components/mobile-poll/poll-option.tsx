"use client";
import type { VoteType } from "@rallly/database";
import { cn } from "@rallly/ui";
import { Button } from "@rallly/ui/button";
import { Icon } from "@rallly/ui/icon";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import * as React from "react";
import { useToggle } from "react-use";

import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import {
  filterParticipantsByVote,
  useParticipants,
} from "@/features/poll/components/participants-provider";
import { useTranslation } from "@/i18n/client";

import { IfScoresVisible } from "../visibility";
import VoteIcon from "../vote-icon";
import { VoteSelector } from "../vote-selector";

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
}) => {
  const showVotes = !!(selectedParticipantId || editable);
  const { participants } = useParticipants();
  const [isExpanded, toggle] = useToggle(false);
  const summaryId = React.useId();
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
        "relative space-y-4 bg-background p-4 transition-colors",
        editable && "active:bg-accent/50",
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
              onClick={() => toggle()}
              aria-expanded={isExpanded}
              aria-controls={summaryId}
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
              {maxYes !== null && !yesIsFull ? (
                <span className="rounded-full bg-green-500/10 px-1.5 py-0.5 text-[0.625rem] text-green-800 dark:text-green-200">
                  {yesScore}/{maxYes}
                </span>
              ) : null}
              <Icon>
                {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Icon>
            </Button>
          </IfScoresVisible>

          {yesIsFull ? (
            <span className="rounded-full bg-green-600 px-2 py-1 font-medium text-white text-xs">
              Yes full
            </span>
          ) : null}

          {showVotes ? (
            <div className="flex size-7 items-center justify-center">
              {editable ? (
                <VoteSelector
                  className="after:absolute after:inset-0"
                  optionLabel={optionLabel}
                  value={vote}
                  yesDisabled={yesIsFull && !participantHasExistingYes}
                  onChange={onChange}
                />
              ) : (
                <div
                  key={vote}
                  className="flex h-full items-center justify-center"
                >
                  <VoteIcon type={vote} />
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      {isExpanded ? (
        <IfScoresVisible>
          <div id={summaryId}>
            <PollOptionVoteSummary optionId={optionId} />
          </div>
        </IfScoresVisible>
      ) : null}
    </div>
  );
};

export default PollOption;
