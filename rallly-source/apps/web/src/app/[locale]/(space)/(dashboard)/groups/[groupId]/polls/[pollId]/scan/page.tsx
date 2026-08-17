import { Button } from "@rallly/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  PageContainer,
  PageContent,
  PageHeader,
  PageHeaderActions,
  PageHeaderContent,
  PageTitle,
} from "@/components/page-layout";
import { PollQrVoteScanner } from "@/features/poll/components/poll-qr-vote-scanner";
import { loadPollForQrVoting } from "@/features/poll/loaders";
import { Trans } from "@/i18n/client";

export default async function PollQrVotingPage({
  params,
}: {
  params: Promise<{ groupId: string; pollId: string }>;
}) {
  const { groupId, pollId } = await params;
  const poll = await loadPollForQrVoting({ groupId, pollId });
  const initialVoters = Array.from(
    new Map(
      poll.participants.map((participant) => [
        participant.user?.id ??
          participant.email?.toLowerCase() ??
          participant.id,
        {
          id: participant.id,
          userId: participant.user?.id,
          name: participant.name,
          email: participant.email ?? "",
          image: participant.user?.image ?? undefined,
        },
      ]),
    ).values(),
  );

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader>
        <PageHeaderContent>
          <PageTitle>{poll.title}</PageTitle>
          <p className="text-muted-foreground text-sm">
            {poll.pollGroup?.title}
          </p>
        </PageHeaderContent>
        <PageHeaderActions>
          <Button variant="ghost" render={<Link href="/groups" />}>
            <ArrowLeftIcon />
            <Trans i18nKey="backToPollGroups" defaults="Back to poll groups" />
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <PageContent>
        <PollQrVoteScanner
          groupId={groupId}
          pollId={pollId}
          pollTitle={poll.title}
          initialVoters={initialVoters}
        />
      </PageContent>
    </PageContainer>
  );
}

export const metadata: Metadata = {
  title: "Poll QR voting",
};
