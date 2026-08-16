import type {
  DateTimeOption,
  TimeOption,
} from "@/features/poll/components/forms/poll-options-form/types";
import { dayjs } from "@/lib/dayjs";

export function getBrowserTimeZone() {
  return dayjs.tz.guess();
}

export const encodeDateOption = (option: DateTimeOption) => {
  return option.type === "timeSlot"
    ? `${option.start}/${option.end}`
    : option.date;
};

export type OptionEditValues = {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

export const getOptionEditValues = (
  startTime: Date | string,
  duration: number,
  timeZone?: string | null,
): OptionEditValues => {
  const start = dayjs(startTime).tz(timeZone || "UTC");
  const end = start.add(duration, "minute");

  return {
    startDate: start.format("YYYY-MM-DD"),
    startTime: start.format("HH:mm"),
    endDate: end.format("YYYY-MM-DD"),
    endTime: end.format("HH:mm"),
  };
};

export const parseOptionEditValues = (
  values: OptionEditValues,
  timeZone?: string | null,
  isTimed = true,
) => {
  const zone = timeZone || "UTC";
  const start = dayjs.tz(
    `${values.startDate}T${isTimed ? values.startTime : "00:00"}`,
    zone,
  );
  const end = isTimed
    ? dayjs.tz(`${values.endDate}T${values.endTime}`, zone)
    : start;

  return {
    startTime: start.toISOString(),
    duration: isTimed ? end.diff(start, "minute") : 0,
  };
};

export interface ParsedDateOption {
  type: "date";
  optionId: string;
  day: string;
  dow: string;
  month: string;
  year: string;
  maxYes: number | null;
}

export interface ParsedTimeSlotOption {
  type: "timeSlot";
  optionId: string;
  day: string;
  dow: string;
  month: string;
  startTime: string;
  endTime: string;
  duration: string;
  year: string;
  maxYes: number | null;
}

export type ParsedDateTimeOpton = ParsedDateOption | ParsedTimeSlotOption;

export const getOptionDateTimeLabel = (option: ParsedDateTimeOpton) => {
  const date = `${option.dow} ${option.day} ${option.month} ${option.year}`;
  return option.type === "timeSlot"
    ? `${date}, ${option.startTime} – ${option.endTime}`
    : date;
};

export const removeAllOptionsForDay = (
  options: DateTimeOption[],
  date: Date,
) => {
  return options.filter((option) => {
    return !dayjs(date).isSame(
      option.type === "date" ? option.date : option.start,
      "day",
    );
  });
};

export const expectTimeOption = (d: DateTimeOption): TimeOption => {
  if (d.type === "date") {
    throw new Error("Expected timeSlot but got date instead");
  }
  return d;
};
