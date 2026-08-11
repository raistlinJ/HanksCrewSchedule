"use client";
import { posthog } from "@rallly/posthog/client";
import Link from "next/link";
import { useBranding } from "@/features/branding/client";
import { usePoll } from "@/features/poll/client";
import { Trans } from "@/i18n/client";

export function PollFooter() {
  const { hideAttribution } = useBranding();
  const poll = usePoll();

  if (hideAttribution || poll.space?.hideAttribution) {
    return null;
  }

  return (
    <div className="py-6 text-center text-muted-foreground text-sm">
      <span>An app by Acosta3d based on Rallly</span>
    </div>
  );
}
