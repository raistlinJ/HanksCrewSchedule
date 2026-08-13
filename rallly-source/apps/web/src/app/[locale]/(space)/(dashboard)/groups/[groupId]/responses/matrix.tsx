"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";

export function ResponsesMatrix({ group }: { group: any }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const updateVoteMutation = trpc.pollGroups.updateVoteToYes.useMutation();

  // 1. Consolidate options across all polls
  const allOptions: any[] = [];
  group.polls.forEach((poll: any) => {
    poll.options.forEach((opt: any) => {
      allOptions.push({ ...opt, pollTitle: poll.title, pollId: poll.id });
    });
  });

  // 2. Consolidate participants
  // We group them by email, or by name if email is null.
  const participantGroups = new Map<string, { name: string; email: string | null; votes: Map<string, any> }>();
  
  group.polls.forEach((poll: any) => {
    poll.participants.forEach((p: any) => {
      const key = p.email ? p.email.toLowerCase() : p.name.toLowerCase();
      if (!participantGroups.has(key)) {
        participantGroups.set(key, { name: p.name, email: p.email, votes: new Map() });
      }
      const pg = participantGroups.get(key)!;
      // Add votes to the map (keyed by optionId)
      p.votes.forEach((v: any) => {
        pg.votes.set(v.optionId, v);
      });
    });
  });

  const participantRows = Array.from(participantGroups.values());

  const formatOption = (opt: any) => {
    if (opt.type === "TEXT") return opt.title;
    if (opt.type === "DATE") {
      const d = new Date(opt.startTime);
      return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }
    return "Option"; // fallback
  };

  const handleUpdateVote = async (voteId: string) => {
    if (updateVoteMutation.isPending) return;
    try {
      await updateVoteMutation.mutateAsync({ voteId });
      utils.pollGroups.invalidate();
      router.refresh(); // refresh the server component data
    } catch (e) {
      console.error(e);
      alert("Failed to update vote.");
    }
  };

  if (allOptions.length === 0) {
    return <p className="text-muted-foreground">This group has no poll options yet.</p>;
  }

  if (participantRows.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No responses yet across any poll.</p>;
  }

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            {/* Poll Headers */}
            <tr>
              <th className="p-3 border-b font-semibold bg-muted/20 w-48 sticky left-0 bg-card z-10 border-r"></th>
              {group.polls.map((poll: any) => {
                const colSpan = poll.options.length;
                if (colSpan === 0) return null;
                return (
                  <th key={poll.id} colSpan={colSpan} className="p-3 border-b border-l font-semibold bg-muted/20 text-center">
                    {poll.title}
                  </th>
                );
              })}
            </tr>
            {/* Option Headers */}
            <tr>
              <th className="p-3 border-b font-semibold bg-muted/10 w-48 sticky left-0 bg-card z-10 border-r shadow-[1px_0_0_0_#e5e7eb]">Participant</th>
              {allOptions.map((opt) => (
                <th key={opt.id} className="p-3 border-b font-semibold bg-muted/10 text-center min-w-[100px] border-l">
                  {formatOption(opt)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participantRows.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                <td className="p-3 sticky left-0 bg-card z-10 border-r shadow-[1px_0_0_0_#e5e7eb]">
                  <div className="font-medium text-sm">{row.name}</div>
                  {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                </td>
                {allOptions.map((opt) => {
                  const vote = row.votes.get(opt.id);
                  const voteType = vote?.type || "no";
                  let voteDisplay = "❌";
                  let voteClass = "text-gray-300";
                  
                  if (voteType === "yes") {
                    voteDisplay = "✅";
                    voteClass = "text-green-600";
                  } else if (voteType === "ifNeedBe") {
                    voteDisplay = "⚠️";
                    voteClass = "text-yellow-600 cursor-pointer hover:scale-125 transition-transform";
                  }

                  return (
                    <td 
                      key={opt.id} 
                      className={`p-3 text-center border-l ${voteClass}`}
                      onClick={() => {
                        if (voteType === "ifNeedBe" && vote?.id) {
                          handleUpdateVote(vote.id);
                        }
                      }}
                      title={voteType === "ifNeedBe" ? "Click to change to Yes" : ""}
                    >
                      {updateVoteMutation.isPending && updateVoteMutation.variables?.voteId === vote?.id ? (
                        <span className="text-xs animate-pulse">⏳</span>
                      ) : (
                        voteDisplay
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/5 font-semibold">
              <td className="p-3 border-t sticky left-0 bg-card z-10 border-r shadow-[1px_0_0_0_#e5e7eb]">Total Yes</td>
              {allOptions.map((opt) => {
                const yesCount = participantRows.reduce((acc: number, row: any) => {
                  const v = row.votes.get(opt.id);
                  return acc + (v?.type === "yes" ? 1 : 0);
                }, 0);
                return (
                  <td key={opt.id} className="p-3 border-t text-center text-green-600 border-l">
                    {yesCount}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
