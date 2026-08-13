"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@rallly/ui/card";
import { Trans } from "@/i18n/client";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { usePoll } from "@/features/poll/components/poll-context";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { buttonVariants } from "@rallly/ui";
import Link from "next/link";

export function PollResultsPage() {
  const { participants } = useParticipants();
  const poll = usePoll();
  
  return (
    <div className="mx-auto max-w-4xl px-3 pb-8 lg:pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          <Trans i18nKey="results" defaults="Results" />: {poll.title}
        </h1>
        <Link 
          href={`/poll/${poll.id}`} 
          className={buttonVariants({ variant: "ghost" })}
        >
          <Trans i18nKey="backToPoll" defaults="Back to Poll" />
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            <Trans i18nKey="participants" defaults="Participants" /> ({participants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
