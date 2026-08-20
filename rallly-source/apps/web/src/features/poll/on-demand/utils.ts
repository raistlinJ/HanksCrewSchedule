import type { TimeOption } from "@/features/poll/components/forms/poll-options-form/types";
import { formatDateWithoutTz } from "@/features/poll/components/forms/poll-options-form/utils";

export function createDefaultOnDemandTimeOption(now = new Date()): TimeOption {
  const start = new Date(now);
  start.setMinutes(Math.floor(start.getMinutes() / 30) * 30, 0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 90);

  return {
    type: "timeSlot",
    start: formatDateWithoutTz(start),
    end: formatDateWithoutTz(end),
  };
}

export function getOnDemandPollTitle(
  start: string,
  existingTitles: readonly string[] = [],
) {
  const [date = "date", timeWithSeconds = "time"] = start.split("T");
  const time = timeWithSeconds.slice(0, 5);
  const baseTitle = `${date}/${time}`;

  if (!existingTitles.includes(baseTitle)) {
    return baseTitle;
  }

  let suffix = 2;
  while (existingTitles.includes(`${baseTitle}-(${suffix})`)) {
    suffix += 1;
  }

  return `${baseTitle}-(${suffix})`;
}
