"use client";
import { Card, CardContent } from "@rallly/ui/card";
import { MapPinIcon } from "lucide-react";
import { RandomGradientBar } from "@/components/random-gradient-bar";
import { usePoll } from "@/features/poll/client";
import {
  EventMetaDescription,
  EventMetaItem,
  EventMetaList,
  EventMetaTitle,
} from "@/features/poll/components/event-meta";
import TruncatedLinkify from "@/features/poll/components/truncated-linkify";

export function EventCard() {
  const poll = usePoll();
  return (
    <Card>
      <RandomGradientBar />
      <CardContent>
        <div>
          <EventMetaTitle>{poll.title}</EventMetaTitle>
          <EventMetaDescription className="mt-2" content={poll.description} />
        </div>
        {poll.location ? (
          <EventMetaList className="mt-4">
            <EventMetaItem>
              <MapPinIcon />
              <TruncatedLinkify>{poll.location}</TruncatedLinkify>
            </EventMetaItem>
          </EventMetaList>
        ) : null}
      </CardContent>
    </Card>
  );
}
