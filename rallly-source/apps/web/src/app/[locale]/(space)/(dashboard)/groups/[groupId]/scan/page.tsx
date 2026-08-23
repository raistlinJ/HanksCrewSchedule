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
import { PollGroupQrScanner } from "@/features/poll/components/poll-group-qr-scanner";
import { loadPollGroupForQrVoting } from "@/features/poll/loaders";

export default async function PollGroupQrVotingPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const group = await loadPollGroupForQrVoting({ groupId });

  return (
    <PageContainer className="max-w-5xl">
      <PageHeader className="flex-col md:flex-row">
        <PageHeaderContent>
          <PageTitle>{group.title}</PageTitle>
          <p className="text-muted-foreground text-sm">
            Scan someone&apos;s QR code to open their group voting page.
          </p>
        </PageHeaderContent>
        <PageHeaderActions className="w-full md:w-auto">
          <Button variant="ghost" render={<Link href="/active-polls" />}>
            <ArrowLeftIcon />
            Back to upcoming &amp; active polls
          </Button>
        </PageHeaderActions>
      </PageHeader>
      <PageContent>
        <PollGroupQrScanner groupId={group.id} />
      </PageContent>
    </PageContainer>
  );
}

export const metadata: Metadata = {
  title: "Poll group QR scanner",
};
