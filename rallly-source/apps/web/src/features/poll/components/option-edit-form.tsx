"use client";

import { useState } from "react";
import { useDateTimeConfig } from "@/lib/datetime/client";
import { formatDateTime } from "@/lib/datetime/format";
import {
  getOptionEditValues,
  parseOptionEditValues,
} from "@/lib/utils/date-time-utils";

type OptionEditFormProps = {
  startTime: Date | string;
  duration: number;
  timeZone?: string | null;
  isTimed: boolean;
  isSaving: boolean;
  onSave: (values: { startTime: string; duration: number }) => Promise<void>;
  onCancel: () => void;
};

const fieldClassName =
  "w-full rounded border bg-background px-1 py-1 font-normal text-xs";

const halfHourTimes = Array.from({ length: 48 }, (_, index) => {
  const hours = Math.floor(index / 2);
  const minutes = index % 2 === 0 ? "00" : "30";
  return `${String(hours).padStart(2, "0")}:${minutes}`;
});

export function OptionEditForm({
  startTime,
  duration,
  timeZone,
  isTimed,
  isSaving,
  onSave,
  onCancel,
}: OptionEditFormProps) {
  const { locale, timeFormat } = useDateTimeConfig();
  const initialValues = getOptionEditValues(startTime, duration, timeZone);
  const [startDate, setStartDate] = useState(initialValues.startDate);
  const [startTimeValue, setStartTimeValue] = useState(initialValues.startTime);
  const [endDate, setEndDate] = useState(initialValues.endDate);
  const [endTime, setEndTime] = useState(initialValues.endTime);
  const [error, setError] = useState("");
  const startTimeOptions = halfHourTimes.includes(startTimeValue)
    ? halfHourTimes
    : [...halfHourTimes, startTimeValue].sort();
  const endTimeOptions = halfHourTimes.includes(endTime)
    ? halfHourTimes
    : [...halfHourTimes, endTime].sort();

  const formatTimeLabel = (value: string) => {
    const [hours, minutes] = value.split(":").map(Number);
    return formatDateTime(new Date(2000, 0, 1, hours, minutes), {
      preset: "time",
      locale,
      timeFormat,
    });
  };

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (isSaving) return;

        setError("");
        const values = parseOptionEditValues(
          {
            startDate,
            startTime: startTimeValue,
            endDate,
            endTime,
          },
          timeZone,
          isTimed,
        );

        if (isTimed && values.duration <= 0) {
          setError("End date and time must be after the start.");
          return;
        }

        try {
          await onSave(values);
        } catch {
          setError("Failed to update option.");
        }
      }}
      className="flex flex-col items-stretch gap-2 font-normal"
    >
      <label className="space-y-1 text-left">
        <span className="block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
          Start date
        </span>
        <input
          type="date"
          className={fieldClassName}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
      </label>

      {isTimed && (
        <>
          <label className="space-y-1 text-left">
            <span className="block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              Start time
            </span>
            <select
              className={fieldClassName}
              value={startTimeValue}
              onChange={(event) => setStartTimeValue(event.target.value)}
              required
            >
              {startTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-left">
            <span className="block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              End date
            </span>
            <input
              type="date"
              className={fieldClassName}
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
          <label className="space-y-1 text-left">
            <span className="block font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
              End time
            </span>
            <select
              className={fieldClassName}
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
              required
            >
              {endTimeOptions.map((time) => (
                <option key={time} value={time}>
                  {formatTimeLabel(time)}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {error && (
        <p className="text-left text-[10px] text-destructive">{error}</p>
      )}

      <div className="mt-1 flex w-full gap-1">
        <button
          type="submit"
          className="flex-1 rounded bg-primary px-2 py-2 font-medium text-primary-foreground text-xs disabled:opacity-50"
          disabled={isSaving}
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded bg-muted px-2 py-2 font-medium text-xs disabled:opacity-50"
          disabled={isSaving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
