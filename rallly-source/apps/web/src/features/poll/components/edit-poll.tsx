"use client";
import { buttonVariants } from "@rallly/ui";
import { Button } from "@rallly/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@rallly/ui/card";
import { Form } from "@rallly/ui/form";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";
import { useModalContext } from "@/components/modal/modal-provider";
import { PollDetailsForm } from "@/features/poll/components/forms/poll-details-form";
import PollOptionsForm from "@/features/poll/components/forms/poll-options-form/poll-options-form";
import { PollSettingsForm } from "@/features/poll/components/forms/poll-settings";
import { useUpdatePollMutation } from "@/features/poll/components/mutations";
import {
  filterParticipantsByVote,
  useParticipants,
} from "@/features/poll/components/participants-provider";
import { usePoll } from "@/features/poll/components/poll-context";
import { Trans, useTranslation } from "@/i18n/client";
import { dayjs } from "@/lib/dayjs";
import {
  encodeDateOption,
  getBrowserTimeZone,
} from "@/lib/utils/date-time-utils";

const required = <T,>(v: T | undefined): T => {
  if (!v) {
    throw new Error("Required value is missing");
  }
  return v;
};

const convertOptionToString = (
  option: { startTime: Date; duration: number },
  timeZone: string | null,
) => {
  let start = dayjs(option.startTime);
  if (timeZone) {
    start = start.tz(timeZone);
  } else {
    start = start.utc();
  }
  return option.duration === 0
    ? start.format("YYYY-MM-DD")
    : `${start.format("YYYY-MM-DDTHH:mm:ss")}/${start
        .add(option.duration, "minute")
        .format("YYYY-MM-DDTHH:mm:ss")}`;
};

export const EditPoll = ({ nav }: { nav?: React.ReactNode }) => {
  const { poll } = usePoll();
  const { participants } = useParticipants();
  const hasVotes = participants.some(
    (participant) => participant.votes.length > 0,
  );
  const { mutate: updatePollMutation, isPending: isUpdating } = useUpdatePollMutation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const modalContext = useModalContext();

  const pollLink = `/poll/${poll.id}`;
  const returnTo = searchParams.get("returnTo") || pollLink;

  const redirectBackToPoll = () => {
    router.push(returnTo);
    router.refresh();
  };

  let firstDate = dayjs(poll.options[0]?.startTime);
  if (poll.timeZone) {
    firstDate = firstDate.tz(poll.timeZone);
  } else {
    firstDate = firstDate.utc();
  }

  const form = useForm({
    defaultValues: {
      title: poll.title,
      description: poll.description ?? "",
      location: poll.location ?? "",
      navigationDate: firstDate.format("YYYY-MM-DD"),
      view: "month" as const,
      options: poll.options.map((option) => {
        let start = dayjs(option.startTime);
        if (poll.timeZone) {
          start = start.tz(poll.timeZone);
        } else {
          start = start.utc();
        }
        return option.duration > 0
          ? {
              type: "timeSlot" as const,
              start: start.format("YYYY-MM-DDTHH:mm:ss"),
              duration: option.duration,
              end: start
                .add(option.duration, "minute")
                .format("YYYY-MM-DDTHH:mm:ss"),
            }
          : {
              type: "date" as const,
              date: start.format("YYYY-MM-DD"),
            };
      }),
      timeZone: poll.timeZone ?? "",
      lockTimeZone:
        !poll.timeZone && poll.options.some((option) => option.duration > 0),
      allDay:
        poll.options.length > 0 &&
        poll.options.every((option) => option.duration === 0),
      duration: poll.options[0]?.duration || 60,
      hideScores: poll.hideScores ?? false,
      hideParticipants: poll.hideParticipants ?? false,
      enableComments: !poll.disableComments,
      requireParticipantEmail: poll.requireParticipantEmail ?? false,
    },
  });

  return (
    <Form {...form}>
      <header className="sticky top-0 z-20 bg-gray-100/90 p-3 backdrop-blur-md xl:bg-transparent xl:backdrop-blur-none dark:bg-gray-900/90 dark:xl:bg-transparent">
        <div className="flex items-center justify-between gap-x-4">
          <div className="flex min-w-0 flex-1 items-center">{nav}</div>
          <div className="flex shrink-0 items-center gap-x-4">
            <Link href={returnTo} className={buttonVariants({ variant: "ghost" })}>
              <Trans i18nKey="cancel" defaults="Cancel" />
            </Link>
            <Button
              form="edit-poll"
              loading={isUpdating}
              type="submit"
              variant="primary"
            >
              <Trans i18nKey="save" defaults="Save" />
            </Button>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-4xl px-3 pb-8 lg:pt-6"
      >
        <form
          id="edit-poll"
          onSubmit={form.handleSubmit((data) => {
            const title = required(data?.title?.trim());
            const submittedTimeZone =
              !data.lockTimeZone && !data.allDay
                ? data.timeZone || getBrowserTimeZone()
                : null;

            const encodedOptions = data.options.map(encodeDateOption);
            const frameChanged = submittedTimeZone !== poll.timeZone;

            const optionsToDelete = frameChanged
              ? poll.options
              : poll.options.filter(
                  (option) =>
                    !encodedOptions.includes(
                      convertOptionToString(option, poll.timeZone),
                    ),
                );

            const optionsToAdd = frameChanged
              ? encodedOptions
              : encodedOptions.filter(
                  (encodedOption) =>
                    !poll.options.find(
                      (o) =>
                        convertOptionToString(o, poll.timeZone) === encodedOption,
                    ),
                );

            const payload = {
              pollId: poll.id,
              title,
              location: data.location?.trim(),
              description: data.description?.trim(),
              timeZone: submittedTimeZone,
              hideParticipants: data.hideParticipants,
              disableComments: !data.enableComments,
              hideScores: data.hideScores,
              requireParticipantEmail: data.requireParticipantEmail,
              optionsToDelete: optionsToDelete.map(({ id }) => id),
              optionsToAdd,
            };

            const onOk = () => {
              updatePollMutation(payload, {
                onSuccess: (res) => {
                  if (res.ok) {
                    redirectBackToPoll();
                  }
                },
              });
            };

            const optionsToDeleteThatHaveVotes = optionsToDelete.filter(
              (option) =>
                filterParticipantsByVote(participants, option.id, "yes").length >
                0,
            );

            if (optionsToDeleteThatHaveVotes.length > 0) {
              modalContext.render({
                title: t("areYouSure", { defaultValue: "Are you sure?" }),
                content: (
                  <Trans
                    i18nKey="deletingOptionsWarning"
                    defaults="You are deleting options that participants have voted for. Their votes will also be deleted."
                    components={{ b: <strong /> }}
                  />
                ),
                onOk,
                okButtonProps: {
                  variant: "destructive",
                },
                okText: t("delete"),
                cancelText: t("cancel"),
              });
            } else {
              onOk();
            }
          })}
        >
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <Trans i18nKey="event" defaults="Event" />
                </CardTitle>
                <CardDescription>
                  <Trans
                    i18nKey="describeYourEvent"
                    defaults="Describe what your event is about"
                  />
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <PollDetailsForm />
              </CardContent>
            </Card>

            <PollOptionsForm disableTimeZoneChange={hasVotes} />

            <PollSettingsForm />
          </div>
        </form>
      </main>
    </Form>
  );
};
