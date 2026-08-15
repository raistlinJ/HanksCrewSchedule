import { dayjs } from "@/lib/dayjs";
import type { TimeOption } from "./types";

export const SELECTABLE_TIME_INTERVAL_MINUTES = 15;

export const formatDateWithoutTz = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DDTHH:mm:ss");
};

export const formatDateWithoutTime = (date: Date): string => {
  return dayjs(date).format("YYYY-MM-DD");
};

function roundDownToSelectableTime(date: Date): Date {
  const rounded = new Date(date);
  rounded.setMinutes(
    Math.floor(rounded.getMinutes() / SELECTABLE_TIME_INTERVAL_MINUTES) *
      SELECTABLE_TIME_INTERVAL_MINUTES,
    0,
    0,
  );
  return rounded;
}

function roundUpToSelectableTime(date: Date): Date {
  const rounded = new Date(date);
  const remainder = rounded.getMinutes() % SELECTABLE_TIME_INTERVAL_MINUTES;
  const hasPartialMinute =
    rounded.getSeconds() !== 0 || rounded.getMilliseconds() !== 0;
  const minutesToAdd =
    remainder === 0 && !hasPartialMinute
      ? 0
      : SELECTABLE_TIME_INTERVAL_MINUTES - remainder;

  rounded.setMinutes(rounded.getMinutes() + minutesToAdd, 0, 0);
  return rounded;
}

export function roundTimeOptionToSelectableTimes(
  option: TimeOption,
): TimeOption {
  return {
    ...option,
    start: formatDateWithoutTz(
      roundDownToSelectableTime(new Date(option.start)),
    ),
    end: formatDateWithoutTz(roundUpToSelectableTime(new Date(option.end))),
  };
}

export function createDefaultTimeOption(now = new Date()): TimeOption {
  return {
    type: "timeSlot",
    start: formatDateWithoutTz(roundDownToSelectableTime(now)),
    end: formatDateWithoutTz(
      roundUpToSelectableTime(dayjs(now).add(1, "hour").toDate()),
    ),
  };
}
