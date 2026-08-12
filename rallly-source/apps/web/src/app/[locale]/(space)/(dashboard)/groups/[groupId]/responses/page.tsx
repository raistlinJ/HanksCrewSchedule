import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslation } from "@/i18n/server";
import { prisma } from "@rallly/database";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Button } from "@rallly/ui/button";

export default async function PollGroupResponsesPage({
  params,
}: {
  params: Promise<{ groupId: string; locale: string }>;
}) {
  const { groupId, locale } = await params;
  const session = await getSession();

  let group;
  try {
    group = await prisma.pollGroup.findUnique({
      where: { id: groupId },
      include: {
        polls: {
          where: { deleted: false },
          include: {
            options: {
              orderBy: { startTime: "asc" },
            },
            participants: {
              where: { deleted: false },
              include: { votes: true },
            },
          },
        },
      },
    });
  } catch (error) {
    return notFound();
  }

  if (!group) {
    return notFound();
  }

  // Sort polls according to the pollOrder array from the database
  if (group.pollOrder && group.pollOrder.length > 0) {
    group.polls.sort((a, b) => {
      const indexA = group.pollOrder.indexOf(a.id);
      const indexB = group.pollOrder.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1; // Unordered items go to the end
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  }

  // Define formatDate inline for simple display if date/time type
  const formatOption = (opt: any) => {
    if (opt.type === "TEXT") return opt.title;
    if (opt.type === "DATE") {
      const d = new Date(opt.startTime);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return "Option"; // fallback
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <Link href="/groups" className="text-primary hover:underline flex items-center text-sm font-medium">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Groups
        </Link>
      </div>

      <div className="mb-8 border-b pb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {group.title} - Responses
          </h1>
          {group.description && (
            <p className="text-md text-muted-foreground whitespace-pre-wrap">
              {group.description}
            </p>
          )}
        </div>
        <a href={`/groups/${group.id}/export/csv`} download>
          <Button variant="outline" className="flex items-center gap-2">
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </Button>
        </a>
      </div>

      <div className="space-y-12">
        {group.polls.length === 0 ? (
          <p className="text-muted-foreground">This group has no polls.</p>
        ) : (
          group.polls.map((poll) => {
            const hasVotes = poll.participants.length > 0;
            return (
              <div key={poll.id} className="bg-card border rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/30">
                  <h2 className="text-xl font-semibold">{poll.title}</h2>
                  {poll.description && (
                    <p className="text-sm text-muted-foreground mt-1">{poll.description}</p>
                  )}
                </div>
                
                <div className="p-6 overflow-x-auto">
                  {!hasVotes ? (
                    <p className="text-sm text-muted-foreground italic">No responses yet.</p>
                  ) : (
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr>
                          <th className="p-3 border-b font-semibold bg-muted/10 w-48">Participant</th>
                          {poll.options.map((opt) => (
                            <th key={opt.id} className="p-3 border-b font-semibold bg-muted/10 text-center min-w-[100px]">
                              {formatOption(opt)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {poll.participants.map((participant) => (
                          <tr key={participant.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                            <td className="p-3">
                              <div className="font-medium text-sm">{participant.name}</div>
                              {participant.email && <div className="text-xs text-muted-foreground">{participant.email}</div>}
                            </td>
                            {poll.options.map((opt) => {
                              const vote = participant.votes.find((v: any) => v.optionId === opt.id);
                              const voteType = vote?.type || "no";
                              let voteDisplay = "❌";
                              let voteClass = "text-gray-300";
                              
                              if (voteType === "yes") {
                                voteDisplay = "✅";
                                voteClass = "text-green-600";
                              } else if (voteType === "ifNeedBe") {
                                voteDisplay = "⚠️";
                                voteClass = "text-yellow-600";
                              }

                              return (
                                <td key={opt.id} className={`p-3 text-center ${voteClass}`}>
                                  {voteDisplay}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/5 font-semibold">
                          <td className="p-3 border-t">Total Yes</td>
                          {poll.options.map((opt) => {
                            const yesCount = poll.participants.reduce((acc: number, p: any) => {
                              const v = p.votes.find((v: any) => v.optionId === opt.id);
                              return acc + (v?.type === "yes" ? 1 : 0);
                            }, 0);
                            return (
                              <td key={opt.id} className="p-3 border-t text-center text-green-600">
                                {yesCount}
                              </td>
                            );
                          })}
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
