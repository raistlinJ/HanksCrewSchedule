import { Button } from "@rallly/ui/button";
import { SidebarTrigger } from "@rallly/ui/sidebar";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { PollGroupResultCards } from "@/features/poll/components/poll-group-result-cards";
import { loadPollGroupResults } from "@/features/poll/loaders";

export default async function PollGroupResponsesPage({
  params,
}: {
  params: Promise<{ groupId: string; locale: string }>;
}) {
  const { groupId } = await params;
  const group = await loadPollGroupResults(groupId);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/groups"
          className="flex items-center font-medium text-primary text-sm hover:underline"
        >
          <ArrowLeftIcon className="mr-1 h-4 w-4" />
          Back to Groups
        </Link>
      </div>

      <div className="mb-8 flex flex-col items-start justify-between gap-4 border-b pb-8 md:flex-row">
        <div className="flex min-w-0 items-start gap-3">
          <SidebarTrigger className="mt-0.5 shrink-0 md:hidden" />
          <div className="min-w-0">
            <h1 className="mb-2 font-bold text-3xl tracking-tight">
              {group.title} - Responses
            </h1>
            {group.description && (
              <p className="whitespace-pre-wrap text-md text-muted-foreground">
                {group.description}
              </p>
            )}
          </div>
        </div>
        <a href={`/groups/${group.id}/export/csv`} download>
          <Button className="flex items-center gap-2">
            <DownloadIcon className="h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>

      <PollGroupResultCards group={group} showEmail canEdit />
    </div>
  );
}
