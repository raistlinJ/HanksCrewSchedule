export type ActivePollOverviewSource = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isOnDemand: boolean;
  publicResults: boolean;
  status: "open" | "scheduled" | "closed";
  createdAt: Date;
  options: { startTime: Date; duration: number }[];
  yesRespondentIds: string[];
  pollGroupId: string | null;
  pollGroup: {
    id: string;
    title: string;
    description: string | null;
    pollOrder: string[];
    publicResults: boolean;
  } | null;
};

export type ActivePollOverviewItem = {
  kind: "group" | "poll";
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isOnDemand: boolean;
  status: "open" | "scheduled" | "closed";
  yesResponseCount: number;
  nextStart: Date | null;
  createdAt: Date;
  scanHref: string;
  manualAddHref: string;
  resultsHref: string;
  publicHref: string;
  publicResultsHref: string | null;
  polls: {
    id: string;
    title: string;
    yesResponseCount: number;
    status: "open" | "scheduled" | "closed";
    nextStart: Date | null;
    scanHref: string;
  }[];
};

export type ActivePollRange = { start: Date; end: Date };

const ALL_DAY_DURATION_MS = 24 * 60 * 60 * 1000;

function getPollTiming(
  options: { startTime: Date; duration: number }[],
  range?: ActivePollRange,
) {
  if (options.length === 0) return null;

  let firstStart: Date | null = null;
  let lastEnd: Date | null = null;
  let firstStartInRange: Date | null = null;

  for (const option of options) {
    const durationMs =
      option.duration > 0 ? option.duration * 60 * 1000 : ALL_DAY_DURATION_MS;
    const optionEnd = new Date(option.startTime.getTime() + durationMs);

    // Options are separate choices, not one continuous interval from the
    // poll's earliest start to its latest end. Ignore an option unless that
    // specific interval overlaps the requested window.
    if (range && (optionEnd <= range.start || option.startTime > range.end)) {
      continue;
    }

    if (!firstStart || option.startTime < firstStart) {
      firstStart = option.startTime;
    }
    if (!lastEnd || optionEnd > lastEnd) {
      lastEnd = optionEnd;
    }
    if (
      range &&
      option.startTime >= range.start &&
      option.startTime <= range.end &&
      (!firstStartInRange || option.startTime < firstStartInRange)
    ) {
      firstStartInRange = option.startTime;
    }
  }

  if (!firstStart || !lastEnd) return null;

  return {
    firstStart,
    lastEnd,
    displayStart: firstStartInRange ?? firstStart,
  };
}

function timingOverlapsRange(
  timing: NonNullable<ReturnType<typeof getPollTiming>>,
  range: ActivePollRange,
) {
  return timing.lastEnd > range.start && timing.firstStart <= range.end;
}

function getGroupStatus(
  timing: NonNullable<ReturnType<typeof getPollTiming>>,
  referenceTime: Date,
): ActivePollOverviewItem["status"] {
  if (referenceTime < timing.firstStart) return "scheduled";
  if (referenceTime < timing.lastEnd) return "open";
  return "closed";
}

export function buildActivePollOverview(
  polls: ActivePollOverviewSource[],
  range: ActivePollRange,
  referenceTime = new Date(),
): ActivePollOverviewItem[] {
  const items = new Map<string, ActivePollOverviewItem>();
  const groupedPolls = new Map<
    string,
    {
      group: NonNullable<ActivePollOverviewSource["pollGroup"]>;
      polls: [ActivePollOverviewSource, ...ActivePollOverviewSource[]];
    }
  >();

  for (const poll of polls) {
    if (poll.pollGroup) {
      const grouped = groupedPolls.get(poll.pollGroup.id);
      if (grouped) {
        grouped.polls.push(poll);
      } else {
        groupedPolls.set(poll.pollGroup.id, {
          group: poll.pollGroup,
          polls: [poll],
        });
      }
      continue;
    }

    const timing = getPollTiming(poll.options, range);
    if (!timing) {
      continue;
    }
    const nextStart = timing.displayStart;

    // Never fall back to a standalone card when the poll has group membership
    // but its group details are unavailable.
    if (poll.pollGroupId) {
      continue;
    }

    items.set(`poll:${poll.id}`, {
      kind: "poll",
      id: poll.id,
      title: poll.title,
      description: poll.description,
      location: poll.location,
      isOnDemand: poll.isOnDemand,
      status: poll.status,
      yesResponseCount: new Set(poll.yesRespondentIds).size,
      nextStart,
      createdAt: poll.createdAt,
      scanHref: `/poll/${poll.id}/scan`,
      manualAddHref: `/poll/${poll.id}?manualAdd=1`,
      resultsHref: `/poll/${poll.id}/results`,
      publicHref: `/invite/${poll.id}`,
      publicResultsHref: poll.publicResults
        ? `/invite/${poll.id}/results`
        : null,
      polls: [
        {
          id: poll.id,
          title: poll.title,
          yesResponseCount: new Set(poll.yesRespondentIds).size,
          status: poll.status,
          nextStart,
          scanHref: `/poll/${poll.id}/scan`,
        },
      ],
    });
  }

  for (const { group, polls: groupSourcePolls } of groupedPolls.values()) {
    // A poll group is one continuous active/upcoming window from the earliest
    // option in any child poll through the latest option end in any child poll.
    const groupTiming = getPollTiming(
      groupSourcePolls.flatMap((poll) => poll.options),
    );
    if (!groupTiming || !timingOverlapsRange(groupTiming, range)) {
      continue;
    }

    const yesRespondents = new Set(
      groupSourcePolls.flatMap((poll) => poll.yesRespondentIds),
    );
    const visiblePolls = groupSourcePolls.flatMap((poll) => {
      const timing = getPollTiming(poll.options, range);
      if (!timing) return [];

      return [
        {
          id: poll.id,
          title: poll.title,
          yesResponseCount: new Set(poll.yesRespondentIds).size,
          status: poll.status,
          nextStart: timing.displayStart,
          scanHref: `/groups/${group.id}/polls/${poll.id}/scan`,
        },
      ];
    });

    visiblePolls.sort((a, b) => {
      const aIndex = group.pollOrder.indexOf(a.id);
      const bIndex = group.pollOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    const createdAt = groupSourcePolls.reduce(
      (latest, poll) => (poll.createdAt > latest ? poll.createdAt : latest),
      groupSourcePolls[0].createdAt,
    );
    const nextStart = visiblePolls.reduce<Date | null>(
      (earliest, poll) =>
        poll.nextStart && (!earliest || poll.nextStart < earliest)
          ? poll.nextStart
          : earliest,
      null,
    );

    items.set(`group:${group.id}`, {
      kind: "group",
      id: group.id,
      title: group.title,
      description: group.description,
      location: null,
      isOnDemand: groupSourcePolls.some((poll) => poll.isOnDemand),
      status: getGroupStatus(groupTiming, referenceTime),
      yesResponseCount: yesRespondents.size,
      nextStart,
      createdAt,
      scanHref: `/groups/${group.id}/scan`,
      manualAddHref: `/g/${group.id}?manualAdd=1`,
      resultsHref: `/groups/${group.id}/responses`,
      publicHref: `/g/${group.id}`,
      publicResultsHref: group.publicResults ? `/g/${group.id}/results` : null,
      polls: visiblePolls,
    });
  }

  return Array.from(items.values()).sort((a, b) => {
    const aDistance = a.nextStart
      ? Math.abs(a.nextStart.getTime() - referenceTime.getTime())
      : Number.POSITIVE_INFINITY;
    const bDistance = b.nextStart
      ? Math.abs(b.nextStart.getTime() - referenceTime.getTime())
      : Number.POSITIVE_INFINITY;

    if (aDistance !== bDistance) {
      return aDistance - bDistance;
    }
    if (a.nextStart && b.nextStart) {
      return a.nextStart.getTime() - b.nextStart.getTime();
    }
    if (a.nextStart) return -1;
    if (b.nextStart) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
