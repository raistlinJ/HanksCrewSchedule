"use client";

import VoteIcon from "@/features/poll/components/vote-icon";
import { useDateTime } from "@/lib/datetime/client";

type PublicResultsGroup = {
  polls: Array<{
    id: string;
    title: string;
    kind: string;
    timeZone: string | null;
    options: Array<{
      id: string;
      startTime: Date;
      duration: number;
    }>;
    participants: Array<{
      name: string;
      userId: string | null;
      votes: Array<{
        optionId: string;
        type: "yes" | "no" | "ifNeedBe";
      }>;
    }>;
  }>;
};

export function PublicResultsMatrix({ group }: { group: PublicResultsGroup }) {
  const { formatDateTime, formatDateTimeRange } = useDateTime();
  const options = group.polls.flatMap((poll) =>
    poll.options.map((option) => ({
      ...option,
      pollId: poll.id,
      pollTitle: poll.title,
      pollKind: poll.kind,
      pollTimeZone: poll.timeZone,
    })),
  );
  const participantGroups = new Map<
    string,
    {
      key: string;
      name: string;
      votes: Map<string, "yes" | "no" | "ifNeedBe">;
    }
  >();

  for (const poll of group.polls) {
    for (const participant of poll.participants) {
      const key = participant.userId ?? participant.name.toLowerCase();
      const row = participantGroups.get(key) ?? {
        key,
        name: participant.name,
        votes: new Map(),
      };
      for (const vote of participant.votes) {
        row.votes.set(vote.optionId, vote.type);
      }
      participantGroups.set(key, row);
    }
  }

  const formatOption = (option: (typeof options)[number]) => {
    const start = new Date(option.startTime);
    const timeZone = option.pollTimeZone || "UTC";
    const date = formatDateTime(start, "weekdayMonthDay", { timeZone });

    if (option.pollKind === "time" || option.duration > 0) {
      const end = new Date(start.getTime() + option.duration * 60_000);
      return (
        <span className="flex flex-col items-center">
          <span>{date}</span>
          <span className="whitespace-nowrap font-normal text-muted-foreground text-xs">
            {formatDateTimeRange(start, end, "time", { timeZone })}
          </span>
        </span>
      );
    }

    return date;
  };

  const rows = Array.from(participantGroups.values());

  return (
    <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
      <table className="w-full min-w-[800px] border-collapse text-left">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-48 border-r border-b bg-card p-3" />
            {group.polls.map((poll) =>
              poll.options.length > 0 ? (
                <th
                  key={poll.id}
                  colSpan={poll.options.length}
                  className="border-b border-l bg-muted/20 p-3 text-center font-semibold"
                >
                  {poll.title}
                </th>
              ) : null,
            )}
          </tr>
          <tr>
            <th className="sticky left-0 z-10 w-48 border-r border-b bg-card p-3 font-semibold">
              Participant
            </th>
            {options.map((option) => (
              <th
                key={option.id}
                className="min-w-[100px] border-b border-l bg-muted/10 p-3 text-center font-semibold"
              >
                {formatOption(option)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={options.length + 1}
                className="p-8 text-center text-muted-foreground text-sm"
              >
                No responses yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.key} className="border-b last:border-0">
                <td className="sticky left-0 z-10 border-r bg-card p-3">
                  <div className="font-medium text-sm">{row.name}</div>
                </td>
                {options.map((option) => {
                  const vote = row.votes.get(option.id) ?? "no";
                  return (
                    <td key={option.id} className="border-l p-3 text-center">
                      <VoteIcon type={vote} className="mx-auto size-6" />
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
        {rows.length > 0 ? (
          <tfoot>
            <tr className="bg-muted/10 font-semibold">
              <td className="sticky left-0 z-10 border-t border-r bg-card p-3">
                Total Yes
              </td>
              {options.map((option) => (
                <td
                  key={option.id}
                  className="border-t border-l p-3 text-center"
                >
                  {rows.reduce(
                    (total, row) =>
                      total + (row.votes.get(option.id) === "yes" ? 1 : 0),
                    0,
                  )}
                </td>
              ))}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}
