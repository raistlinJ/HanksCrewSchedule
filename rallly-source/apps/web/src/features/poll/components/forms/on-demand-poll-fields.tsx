import { Button } from "@rallly/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallly/ui/card";
import { FormField, FormItem, FormLabel, FormMessage } from "@rallly/ui/form";
import { Input } from "@rallly/ui/input";
import { ListPlusIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Trans } from "@/i18n/client";
import type { NewEventData } from "./types";

function getTimeInputValue(value: string) {
  return value.split("T")[1]?.slice(0, 5) ?? "";
}

function replaceTime(value: string, time: string) {
  const date = value.split("T")[0];
  return `${date}T${time}:00`;
}

function getDurationMinutes(start: string, end: string) {
  const duration = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
  );
  return Number.isFinite(duration) && duration > 0 ? duration : 60;
}

export function OnDemandPollFields({
  onViewAllOptions,
}: {
  onViewAllOptions: () => void;
}) {
  const form = useFormContext<NewEventData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trans i18nKey="onDemandPollTimes" defaults="Start and end time" />
        </CardTitle>
        <CardDescription>
          <Trans
            i18nKey="onDemandPollTimesDescription"
            defaults="Adjust the times here. Use View all options to edit dates and other settings."
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormField
          control={form.control}
          name="options"
          rules={{
            validate: (options) => {
              const option = options[0];
              if (!option || option.type !== "timeSlot") {
                return "An on-demand poll needs a start and end time.";
              }

              return new Date(option.end) > new Date(option.start)
                ? true
                : "End time must be after start time.";
            },
          }}
          render={({ field }) => {
            const option = field.value[0];
            if (!option || option.type !== "timeSlot") {
              return (
                <FormItem>
                  <FormMessage />
                </FormItem>
              );
            }

            return (
              <FormItem>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <FormLabel htmlFor="on-demand-start">
                      <Trans i18nKey="startTime" defaults="Start time" />
                    </FormLabel>
                    <Input
                      id="on-demand-start"
                      type="time"
                      step={1800}
                      required
                      value={getTimeInputValue(option.start)}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const start = replaceTime(
                          option.start,
                          event.target.value,
                        );
                        const next = [...field.value];
                        next[0] = { ...option, start };
                        field.onChange(next);
                        form.setValue("navigationDate", start);
                        form.setValue(
                          "duration",
                          getDurationMinutes(start, option.end),
                        );
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <FormLabel htmlFor="on-demand-end">
                      <Trans i18nKey="endTime" defaults="End time" />
                    </FormLabel>
                    <Input
                      id="on-demand-end"
                      type="time"
                      step={1800}
                      required
                      value={getTimeInputValue(option.end)}
                      onChange={(event) => {
                        if (!event.target.value) return;
                        const end = replaceTime(option.end, event.target.value);
                        const next = [...field.value];
                        next[0] = { ...option, end };
                        field.onChange(next);
                        form.setValue(
                          "duration",
                          getDurationMinutes(option.start, end),
                        );
                      }}
                    />
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <Button type="button" onClick={onViewAllOptions}>
          <ListPlusIcon data-icon="inline-start" />
          <Trans i18nKey="viewAllOptions" defaults="View all options" />
        </Button>
      </CardContent>
    </Card>
  );
}
