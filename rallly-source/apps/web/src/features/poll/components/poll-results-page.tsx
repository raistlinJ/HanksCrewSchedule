"use client";

import { Trans } from "@/i18n/client";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { usePoll } from "@/features/poll/client";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Button } from "@rallly/ui/button";
import { useRouter } from "next/navigation";

export function PollResultsPage() {
  const { participants } = useParticipants();
  const poll = usePoll();
  const router = useRouter();
  
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <button 
          onClick={() => router.back()} 
          className="text-primary hover:underline flex items-center text-sm font-medium"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          <Trans i18nKey="backToPoll" defaults="Back to Poll" />
        </button>
      </div>

      <div className="mb-8 border-b pb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {poll.title} - <Trans i18nKey="results" defaults="Results" />
          </h1>
          {poll.description && (
            <p className="text-md text-muted-foreground whitespace-pre-wrap">
              {poll.description}
            </p>
          )}
        </div>
        <a href={`/poll/${poll.id}/export/csv`} download>
          <Button variant="outline" className="flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            <Trans i18nKey="exportCsv" defaults="Export CSV" />
          </Button>
        </a>
      </div>

      <div className="space-y-12">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="name" defaults="Name" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="email" defaults="Email" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="joinedOn" defaults="Joined On" />
                </th>
                <th className="px-4 py-3 font-medium">
                  <Trans i18nKey="yesVotes" defaults="Yes Votes" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {participants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    <Trans i18nKey="noParticipantsYet" defaults="No participants yet." />
                  </td>
                </tr>
              ) : (
                participants.map((p) => {
                  const yesVotesCount = p.votes.filter(v => v.type === "yes").length;
                  return (
                    <tr key={p.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-x-2">
                          <OptimizedAvatarImage
                            size="sm"
                            name={p.name}
                            src={p.image ?? undefined}
                          />
                          <span className="font-medium">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {p.email ? p.email : <span className="italic">N/A</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {yesVotesCount}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
