export type ActivePollOverviewSource = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  isOnDemand: boolean;
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
  range: ActivePollRange,
) {
  if (options.length === 0) return null;

  let firstStart: Date | null = null;
  let lastEnd: Date | null = null;
  let firstStartInRange: Date | null = null;

  for (const option of options) {
    const durationMs =
      option.duration > 0 ? option.duration * 60 * 1000 : ALL_DAY_DURATION_MS;
    const optionEnd = new Date(option.startTime.getTime() + durationMs);
    if (!firstStart || option.startTime < firstStart) {
      firstStart = option.startTime;
    }
    if (!lastEnd || optionEnd > lastEnd) {
      lastEnd = optionEnd;
    }
    if (
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

export function buildActivePollOverview(
  polls: ActivePollOverviewSource[],
  range: ActivePollRange,
  referenceTime = new Date(),
): ActivePollOverviewItem[] {
  const items = new Map<string, ActivePollOverviewItem>();
  const groupYesRespondents = new Map<string, Set<string>>();

  for (const poll of polls) {
    const timing = getPollTiming(poll.options, range);
    if (
      !timing ||
      timing.lastEnd < range.start ||
      timing.firstStart > range.end
    ) {
      continue;
    }
    const nextStart = timing.displayStart;

    if (!poll.pollGroup) {
      // Never fall back to a standalone card when the poll has group
      // membership but its group details are unavailable.
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
      continue;
    }

    const key = `group:${poll.pollGroup.id}`;
    const existing = items.get(key);
    const yesRespondents = groupYesRespondents.get(key) ?? new Set<string>();
    for (const respondentId of poll.yesRespondentIds) {
      yesRespondents.add(respondentId);
    }
    groupYesRespondents.set(key, yesRespondents);
    const groupPoll = {
      id: poll.id,
      title: poll.title,
      yesResponseCount: new Set(poll.yesRespondentIds).size,
      status: poll.status,
      nextStart,
      scanHref: `/groups/${poll.pollGroup.id}/polls/${poll.id}/scan`,
    };

    if (existing) {
      existing.polls.push(groupPoll);
      existing.yesResponseCount = yesRespondents.size;
      existing.isOnDemand = existing.isOnDemand || poll.isOnDemand;
      if (
        poll.status === "open" ||
        (poll.status === "scheduled" && existing.status === "closed")
      ) {
        existing.status = poll.status;
      }
      if (
        nextStart &&
        (!existing.nextStart || nextStart < existing.nextStart)
      ) {
        existing.nextStart = nextStart;
      }
      if (poll.createdAt > existing.createdAt) {
        existing.createdAt = poll.createdAt;
      }
      continue;
    }

    items.set(key, {
      kind: "group",
      id: poll.pollGroup.id,
      title: poll.pollGroup.title,
      description: poll.pollGroup.description,
      location: null,
      isOnDemand: poll.isOnDemand,
      status: poll.status,
      yesResponseCount: yesRespondents.size,
      nextStart,
      createdAt: poll.createdAt,
      scanHref: `/groups/${poll.pollGroup.id}/scan`,
      manualAddHref: `/g/${poll.pollGroup.id}?manualAdd=1`,
      resultsHref: `/groups/${poll.pollGroup.id}/responses`,
      publicHref: `/g/${poll.pollGroup.id}`,
      polls: [groupPoll],
    });
  }

  for (const item of items.values()) {
    if (item.kind !== "group") {
      continue;
    }
    const group = polls.find(
      (poll) => poll.pollGroup?.id === item.id,
    )?.pollGroup;
    if (!group) {
      continue;
    }
    item.polls.sort((a, b) => {
      const aIndex = group.pollOrder.indexOf(a.id);
      const bIndex = group.pollOrder.indexOf(b.id);
      if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
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
