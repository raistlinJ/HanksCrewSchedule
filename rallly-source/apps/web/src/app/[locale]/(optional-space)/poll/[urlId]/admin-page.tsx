"use client";
import { MobileLandscapeHint } from "@/components/mobile-landscape-hint";
import { CommentsSheet } from "@/features/poll/components/comments-sheet";
import { EventCard } from "@/features/poll/components/event-card";
import { usePoll } from "@/features/poll/components/poll-context";
import { PollFooter } from "@/features/poll/components/poll-footer";
import { SinglePollMatrix } from "@/features/poll/components/single-poll-matrix";
import { GuestPollAlert } from "./guest-poll-alert";

export function AdminPage() {
  const { poll } = usePoll();
  return (
    <div className="space-y-3 lg:space-y-4">
      <GuestPollAlert />
      <EventCard />

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
