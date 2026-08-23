"use client";

import { Badge } from "@rallly/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@rallly/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rallly/ui/select";
import { toast } from "@rallly/ui/sonner";
import { ExternalLinkIcon, ListChecksIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  EmptyState,
  EmptyStateDescription,
  EmptyStateIcon,
  EmptyStateTitle,
} from "@/components/empty-state";
import { AuxiliaryOptionToggle } from "@/features/poll/components/auxiliary-option-toggle";
import VoteIcon from "@/features/poll/components/vote-icon";
import type { loadUserPollResponses } from "@/features/user/loaders";
import { Trans, useTranslation } from "@/i18n/client";
import { Time, TimeRange } from "@/lib/datetime/time";
import { useSafeAction } from "@/lib/safe-action/client";
import {
  updateUserPollAuxiliaryResponseAction,
  updateUserPollResponseAction,
} from "../../actions";

type ResponseData = NonNullable<
  Awaited<ReturnType<typeof loadUserPollResponses>>
>["responses"][number];

type VoteType = "yes" | "no" | "ifNeedBe";
type ResponseValue = VoteType | "none";

function OptionDate({
  startTime,
  duration,
  kind,
  timeZone,
}: {
  startTime: Date;
  duration: number;
  kind: "date" | "time";
  timeZone: string | null;
}) {
  const displayTimeZone = kind === "date" ? "UTC" : (timeZone ?? undefined);

  if (kind === "date" || duration === 0) {
    return (
      <Time
        value={startTime}
        preset="weekdayMonthDay"
        timeZone={displayTimeZone}
      />
    );
  }

  const endTime = new Date(startTime.getTime() + duration * 60_000);

  return (
    <div className="flex flex-col">
      <Time
        value={startTime}
        preset="weekdayMonthDay"
        timeZone={displayTimeZone}
      />
      <TimeRange
        start={startTime}
        end={endTime}
        timeZone={displayTimeZone}
        className="text-muted-foreground text-xs"
      />
    </div>
  );
}

function ResponseSelect({
  userId,
  participantId,
  pollId,
  optionId,
  initialType,
}: {
  userId: string;
  participantId: string;
  pollId: string;
  optionId: string;
  initialType?: VoteType;
}) {
  const { t } = useTranslation();
  const initialValue = initialType ?? "none";
  const [value, setValue] = useState<ResponseValue>(initialValue);
  const updateResponse = useSafeAction(updateUserPollResponseAction, {
    onError: () => setValue(initialValue),
  });

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const labels = {
    none: t("noResponse", { defaultValue: "No response" }),
    yes: t("yes", { defaultValue: "Yes" }),
    ifNeedBe: t("ifNeedBe", { defaultValue: "If need be" }),
    no: t("no", { defaultValue: "No" }),
  };

  const updateValue = async (newValue: ResponseValue) => {
    setValue(newValue);
    const result = await updateResponse.executeAsync({
      userId,
      participantId,
      pollId,
      optionId,
      type: newValue === "none" ? null : newValue,
    });
    if (!result?.serverError && !result?.validationErrors) {
      toast.success(t("saved", { defaultValue: "Saved" }));
    }
  };

  return (
    <Select
      items={labels}
      value={value}
      onValueChange={(newValue) => {
        if (newValue) {
          void updateValue(newValue as ResponseValue);
        }
      }}
      disabled={updateResponse.isPending}
    >
      <SelectTrigger
        aria-label={t("editResponse", { defaultValue: "Edit response" })}
        className="w-40"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">
          <span className="flex items-center gap-2">
            <VoteIcon />
            {labels.none}
          </span>
        </SelectItem>
        <SelectItem value="yes">
          <span className="flex items-center gap-2">
            <VoteIcon type="yes" />
            {labels.yes}
          </span>
        </SelectItem>
        <SelectItem value="ifNeedBe">
          <span className="flex items-center gap-2">
            <VoteIcon type="ifNeedBe" />
            {labels.ifNeedBe}
          </span>
        </SelectItem>
        <SelectItem value="no">
          <span className="flex items-center gap-2">
            <VoteIcon type="no" />
            {labels.no}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

function PollResponse({
  userId,
  response,
}: {
  userId: string;
  response: ResponseData;
}) {
  const votesByOptionId = new Map(
    response.votes.map((vote) => [vote.optionId, vote.type]),
  );
  const auxiliaryVotesByOptionId = new Map(
    response.auxiliaryVotes.map((vote) => [vote.auxiliaryOptionId, vote.type]),
  );

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 border-b">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate">{response.poll.title}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {response.poll.status}
            </Badge>
            {response.poll.pollGroup ? (
              <Badge>{response.poll.pollGroup.title}</Badge>
            ) : null}
          </div>
        </div>
        <Link
          href={`/poll/${response.poll.id}`}
          aria-label={`Open ${response.poll.title}`}
          title="Open poll"
          className="shrink-0 text-muted-foreground transition-colors hover:text-primary"
        >
          <ExternalLinkIcon className="size-4" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {response.poll.options.length > 0 ? (
          <div className="divide-y">
            {response.poll.options.map((option) => (
              <div
                key={option.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <OptionDate
                    startTime={option.startTime}
                    duration={option.duration}
                    kind={response.poll.kind}
                    timeZone={response.poll.timeZone}
                  />
                  {option.maxYes !== null ? (
                    <p className="text-muted-foreground text-xs">
                      Limit: {option.maxYes} Yes
                    </p>
                  ) : null}
                </div>
                <ResponseSelect
                  userId={userId}
                  participantId={response.id}
                  pollId={response.poll.id}
                  optionId={option.id}
                  initialType={votesByOptionId.get(option.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="p-4 text-muted-foreground text-sm">
            <Trans
              i18nKey="pollHasNoOptions"
              defaults="This poll has no options."
            />
          </p>
        )}
        {response.poll.auxiliarySelection ? (
          <div className="border-t">
            <div className="bg-muted/40 px-4 py-3">
              <p className="font-medium text-sm">
                {response.poll.auxiliarySelection.name}
              </p>
              <p className="text-muted-foreground text-xs">
                {response.poll.auxiliarySelection.minYes > 0
                  ? `At least ${response.poll.auxiliarySelection.minYes} required`
                  : "Optional"}
                {response.poll.auxiliarySelection.maxYesSelections !== null
                  ? ` · Maximum ${response.poll.auxiliarySelection.maxYesSelections} per participant`
                  : ""}
                {" · Available when a main option is Yes"}
              </p>
            </div>
            <div className="divide-y">
              {response.poll.auxiliarySelection.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-sm">{option.label}</p>
                    {option.maxYes ? (
                      <p className="text-muted-foreground text-xs">
                        Limit: {option.maxYes}
                      </p>
                    ) : null}
                  </div>
                  <AuxiliaryResponseSelect
                    userId={userId}
                    participantId={response.id}
                    pollId={response.poll.id}
                    auxiliaryOptionId={option.id}
                    optionLabel={option.label}
                    initialType={
                      auxiliaryVotesByOptionId.get(option.id) ?? "no"
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AuxiliaryResponseSelect({
  userId,
  participantId,
  pollId,
  auxiliaryOptionId,
  optionLabel,
  initialType,
}: {
  userId: string;
  participantId: string;
  pollId: string;
  auxiliaryOptionId: string;
  optionLabel: string;
  initialType: VoteType;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(initialType === "yes");
  const updateResponse = useSafeAction(updateUserPollAuxiliaryResponseAction, {
    onError: () => setSelected(initialType === "yes"),
  });

  useEffect(() => {
    setSelected(initialType === "yes");
  }, [initialType]);

  const updateValue = async (newSelected: boolean) => {
    setSelected(newSelected);
    const result = await updateResponse.executeAsync({
      userId,
      participantId,
      pollId,
      auxiliaryOptionId,
      type: newSelected ? "yes" : "no",
    });
    if (!result?.serverError && !result?.validationErrors) {
      toast.success(t("saved", { defaultValue: "Saved" }));
    }
  };

  return (
    <AuxiliaryOptionToggle
      optionLabel={optionLabel}
      selected={selected}
      disabled={updateResponse.isPending}
      onChange={(newSelected) => void updateValue(newSelected)}
    />
  );
}

export function UserResponsesEditor({
  userId,
  responses,
}: {
  userId: string;
  responses: ResponseData[];
}) {
  if (responses.length === 0) {
    return (
      <EmptyState className="py-16">
        <EmptyStateIcon>
          <ListChecksIcon />
        </EmptyStateIcon>
        <EmptyStateTitle>
          <Trans i18nKey="noUserResponses" defaults="No responses found" />
        </EmptyStateTitle>
        <EmptyStateDescription>
          <Trans
            i18nKey="noUserResponsesDescription"
            defaults="This user has not responded to any polls yet."
          />
        </EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {responses.map((response) => (
        <PollResponse key={response.id} userId={userId} response={response} />
      ))}
    </div>
  );
}
