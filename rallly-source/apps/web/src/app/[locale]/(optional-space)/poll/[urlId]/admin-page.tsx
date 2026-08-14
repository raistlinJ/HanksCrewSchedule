"use client";
import { Button } from "@rallly/ui/button";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { MobileLandscapeHint } from "@/components/mobile-landscape-hint";
import { CommentsSheet } from "@/features/poll/components/comments-sheet";
import { EventCard } from "@/features/poll/components/event-card";
import { usePoll } from "@/features/poll/components/poll-context";
import { PollFooter } from "@/features/poll/components/poll-footer";
import { SinglePollMatrix } from "@/features/poll/components/single-poll-matrix";
import { Trans } from "@/i18n/client";
import { GuestPollAlert } from "./guest-poll-alert";

function GroupPollNavigation() {
  const { poll } = usePoll();
  const navigation = poll.groupNavigation;

  if (!navigation || navigation.total < 2) {
    return null;
  }

  return (
    <div className="space-y-1">
      <Button
        variant="link"
        size="sm"
        className="h-auto px-0"
        render={<Link href={`/groups#poll-group-${navigation.groupId}`} />}
      >
        <ArrowLeftIcon className="size-4" />
        <Trans i18nKey="backToPollGroup" defaults="Back to poll group" />
      </Button>

      <nav
        aria-label="Poll group navigation"
        className="flex items-center justify-between gap-2 rounded-lg border bg-white p-2 shadow-xs dark:bg-gray-800"
      >
        {navigation.previous ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/poll/${navigation.previous.id}`} />}
            aria-label={`Previous poll: ${navigation.previous.title}`}
            title={navigation.previous.title}
          >
            <ChevronLeftIcon className="size-4" />
            <span className="hidden sm:inline">
              <Trans i18nKey="previousPoll" defaults="Previous poll" />
            </span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <ChevronLeftIcon className="size-4" />
            <span className="hidden sm:inline">
              <Trans i18nKey="previousPoll" defaults="Previous poll" />
            </span>
          </Button>
        )}

        <div className="min-w-0 text-center">
          <div className="truncate text-sm font-medium">
            {navigation.groupTitle}
          </div>
          <div className="text-muted-foreground text-xs">
            <Trans
              i18nKey="pollPositionInGroup"
              defaults="Poll {position} of {total}"
              values={{
                position: navigation.position,
                total: navigation.total,
              }}
            />
          </div>
        </div>

        {navigation.next ? (
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/poll/${navigation.next.id}`} />}
            aria-label={`Next poll: ${navigation.next.title}`}
            title={navigation.next.title}
          >
            <span className="hidden sm:inline">
              <Trans i18nKey="nextPoll" defaults="Next poll" />
            </span>
            <ChevronRightIcon className="size-4" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" disabled>
            <span className="hidden sm:inline">
              <Trans i18nKey="nextPoll" defaults="Next poll" />
            </span>
            <ChevronRightIcon className="size-4" />
          </Button>
        )}
      </nav>
    </div>
  );
}

export function AdminPage() {
  const { poll } = usePoll();
  return (
    <div className="space-y-3 lg:space-y-4">
      <GuestPollAlert />
      <EventCard />
      <GroupPollNavigation />

      <MobileLandscapeHint />
      <SinglePollMatrix poll={poll} />

      <div className="fixed right-4 bottom-4 z-40 lg:right-6 lg:bottom-6">
        <CommentsSheet className="rounded-full shadow-lg" />
      </div>
      <PollFooter />
      <div className="h-12 lg:hidden" />
    </div>
  );
}
