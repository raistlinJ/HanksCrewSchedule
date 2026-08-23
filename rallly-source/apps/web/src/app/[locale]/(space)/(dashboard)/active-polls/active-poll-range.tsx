"use client";

import { Button } from "@rallly/ui/button";
import { Input } from "@rallly/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@rallly/ui/popover";
import { RotateCcwIcon, SlidersHorizontalIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

function toLocalInputValue(isoValue: string) {
  const date = new Date(isoValue);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ActivePollRange({
  start,
  end,
  isCustom,
}: {
  start: string;
  end: string;
  isCustom: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [startValue, setStartValue] = React.useState("");
  const [endValue, setEndValue] = React.useState("");
  const [error, setError] = React.useState<string>();
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setStartValue(toLocalInputValue(start));
    setEndValue(toLocalInputValue(end));
  }, [start, end]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button />}>
        <SlidersHorizontalIcon />
        Advanced
        {isCustom ? (
          <span className="ml-1 size-2 rounded-full bg-primary" />
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            const startDate = new Date(startValue);
            const endDate = new Date(endValue);
            if (
              !startValue ||
              !endValue ||
              Number.isNaN(startDate.getTime()) ||
              Number.isNaN(endDate.getTime()) ||
              startDate >= endDate
            ) {
              setError("End date and time must be after the start.");
              return;
            }

            setError(undefined);
            const params = new URLSearchParams(searchParams);
            params.set("start", startDate.toISOString());
            params.set("end", endDate.toISOString());
            startTransition(() => {
              router.push(`/active-polls?${params.toString()}`);
              setOpen(false);
            });
          }}
        >
          <div>
            <h2 className="font-semibold">Advanced date range</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              Show polls whose scheduled time overlaps this exact range.
            </p>
          </div>
          <label
            className="grid gap-1.5 text-sm"
            htmlFor="active-polls-range-start"
          >
            <span className="font-medium">Start date and time</span>
            <Input
              id="active-polls-range-start"
              type="datetime-local"
              step={60}
              value={startValue}
              onChange={(event) => setStartValue(event.target.value)}
            />
          </label>
          <label
            className="grid gap-1.5 text-sm"
            htmlFor="active-polls-range-end"
          >
            <span className="font-medium">End date and time</span>
            <Input
              id="active-polls-range-end"
              type="datetime-local"
              step={60}
              value={endValue}
              onChange={(event) => setEndValue(event.target.value)}
            />
          </label>
          {error ? <p className="text-destructive text-sm">{error}</p> : null}
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              disabled={!isCustom || isPending}
              onClick={() => {
                startTransition(() => {
                  const params = new URLSearchParams(searchParams);
                  params.delete("start");
                  params.delete("end");
                  router.push(
                    `/active-polls${params.size ? `?${params.toString()}` : ""}`,
                  );
                  setOpen(false);
                });
              }}
            >
              <RotateCcwIcon />
              Reset
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Apply range
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
