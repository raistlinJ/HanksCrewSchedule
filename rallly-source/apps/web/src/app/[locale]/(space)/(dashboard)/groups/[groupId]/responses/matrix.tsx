"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/locale/client";
import { dayjs } from "@/lib/dayjs";

export function ResponsesMatrix({ group }: { group: any }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const updateVoteMutation = trpc.pollGroups.cycleVote.useMutation();
  const { locale } = useLocale();

  // Track original vote types before they are changed in this session
  // Key: `${participantId}-${optionId}`
  const [originalVotes, setOriginalVotes] = useState<Map<string, string>>(new Map());

  // 1. Consolidate options across all polls
  const allOptions: any[] = [];
  group.polls.forEach((poll: any) => {
    poll.options.forEach((opt: any) => {
      allOptions.push({ 
        ...opt, 
        pollTitle: poll.title, 
        pollId: poll.id,
        pollKind: poll.kind,
        pollTimeZone: poll.timeZone
      });
    });
  });

  // 2. Consolidate participants
  // We group them by email, or by name if email is null.
  const participantGroups = new Map<string, { 
    name: string; 
    email: string | null; 
    votes: Map<string, any>;
    participantIds: Map<string, string>;
  }>();
  
  group.polls.forEach((poll: any) => {
    poll.participants.forEach((p: any) => {
      const key = p.email ? p.email.toLowerCase() : p.name.toLowerCase();
      if (!participantGroups.has(key)) {
        participantGroups.set(key, { 
          name: p.name, 
          email: p.email, 
          votes: new Map(),
          participantIds: new Map()
        });
      }
      const pg = participantGroups.get(key)!;
      pg.participantIds.set(poll.id, p.id);
      // Add votes to the map (keyed by optionId)
      p.votes.forEach((v: any) => {
        pg.votes.set(v.optionId, v);
      });
    });
  });

  const participantRows = Array.from(participantGroups.values());

  const formatOption = (opt: any) => {
    const d = new Date(opt.startTime);
    const timeZone = opt.pollTimeZone || 'UTC';
    const dateStr = new Intl.DateTimeFormat(locale, { 
      weekday: 'short', month: 'short', day: 'numeric', timeZone
    }).format(d);

    if (opt.pollKind === "time" || opt.duration > 0) {
      const timeFormatter = new Intl.DateTimeFormat(locale, {
        hour: 'numeric', minute: '2-digit', timeZone
      });
      const startStr = timeFormatter.format(d);
      
      if (opt.duration > 0) {
        const endDate = new Date(d.getTime() + opt.duration * 60000);
        const endStr = timeFormatter.format(endDate);
        const hours = opt.duration / 60;
        const hoursStr = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
        return (
          <div className="flex flex-col items-center">
            <span>{dateStr}</span>
            <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">{startStr} - {endStr}</span>
            <span className="text-xs font-normal text-muted-foreground">({hoursStr}h)</span>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center">
          <span>{dateStr}</span>
          <span className="text-xs font-normal text-muted-foreground">{startStr}</span>
        </div>
      );
    }
    
    return <span>{dateStr}</span>;
  };

  const addParticipantMutation = trpc.pollGroups.addGroupParticipant.useMutation();
  const deleteParticipantMutation = trpc.pollGroups.deleteGroupParticipant.useMutation();
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [addError, setAddError] = useState("");

  const updateParticipantMutation = trpc.pollGroups.updateGroupParticipant.useMutation();
  
  const [editingParticipantKey, setEditingParticipantKey] = useState<string | null>(null);
  const [editParticipantName, setEditParticipantName] = useState("");
  const [editParticipantEmail, setEditParticipantEmail] = useState("");

  const updateOptionMutation = trpc.pollGroups.updateOption.useMutation();
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editOptionDate, setEditOptionDate] = useState("");
  const [editOptionTime, setEditOptionTime] = useState("");
  const [editOptionDuration, setEditOptionDuration] = useState("");

  const handleEditOption = (opt: any) => {
    setEditingOptionId(opt.id);
    const tz = opt.pollTimeZone || 'UTC';
    const d = dayjs(opt.startTime).tz(tz);
    setEditOptionDate(d.format("YYYY-MM-DD"));
    setEditOptionTime(d.format("HH:mm"));
    setEditOptionDuration((opt.duration / 60).toString());
  };

  const handleUpdateVote = async (
    voteId: string | undefined, 
    currentType: string,
    participantId: string,
    optionId: string,
    pollId: string
  ) => {
    if (updateVoteMutation.isPending) return;

    const cellKey = `${participantId}-${optionId}`;
    if (!originalVotes.has(cellKey)) {
      setOriginalVotes((prev) => {
        const next = new Map(prev);
        next.set(cellKey, currentType);
        return next;
      });
    }

    try {
      await updateVoteMutation.mutateAsync({ voteId, participantId, optionId, pollId });
      utils.pollGroups.invalidate();
      router.refresh(); // refresh the server component data
    } catch (e) {
      console.error(e);
      alert("Failed to update vote.");
    }
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParticipantName.trim() || addParticipantMutation.isPending) return;
    
    setAddError("");
    const emailStr = newParticipantEmail.trim().toLowerCase();
    const nameStr = newParticipantName.trim().toLowerCase();
    
    const exists = participantRows.some(r => {
      if (emailStr) return r.email?.toLowerCase() === emailStr;
      return !r.email && r.name.toLowerCase() === nameStr;
    });

    if (exists) {
      setAddError("User already exists");
      return;
    }

    try {
      await addParticipantMutation.mutateAsync({
        groupId: group.id,
        name: newParticipantName.trim(),
        email: newParticipantEmail.trim() || undefined
      });
      setNewParticipantName("");
      setNewParticipantEmail("");
      utils.pollGroups.invalidate();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to add participant.");
    }
  };

  const handleDeleteParticipant = async (participantIds: string[]) => {
    if (deleteParticipantMutation.isPending) return;
    try {
      await deleteParticipantMutation.mutateAsync({
        groupId: group.id,
        participantIds
      });
      utils.pollGroups.invalidate();
      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Failed to delete participant.");
    }
  };

  if (allOptions.length === 0) {
    return <p className="text-muted-foreground">This group has no poll options yet.</p>;
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
                <th key={opt.id} className="group p-3 border-b font-semibold bg-muted/10 text-center min-w-[100px] border-l relative">
                  {editingOptionId === opt.id ? (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (updateOptionMutation.isPending) return;
                        
                        try {
                          const tz = opt.pollTimeZone || 'UTC';
                          let dateStr = editOptionDate;
                          if (opt.pollKind === 'time' || editOptionTime) {
                            dateStr += `T${editOptionTime || "00:00"}`;
                          }
                          const isoStr = dayjs.tz(dateStr, tz).toISOString();
                          const durMinutes = parseFloat(editOptionDuration || "0") * 60;

                          await updateOptionMutation.mutateAsync({
                            groupId: group.id,
                            optionId: opt.id,
                            startTime: isoStr,
                            duration: durMinutes
                          });
                          
                          setEditingOptionId(null);
                          utils.pollGroups.invalidate();
                          router.refresh();
                        } catch (err) {
                          alert("Failed to update option");
                        }
                      }}
                      className="flex flex-col gap-1 items-center font-normal"
                    >
                      <input 
                        type="date"
                        className="text-xs border rounded px-1 w-full bg-background font-normal"
                        value={editOptionDate}
                        onChange={(e) => setEditOptionDate(e.target.value)}
                        required
                        autoFocus
                      />
                      {(opt.pollKind === 'time' || opt.duration > 0) && (
                        <>
                          <input 
                            type="time"
                            className="text-xs border rounded px-1 w-full bg-background font-normal"
                            value={editOptionTime}
                            onChange={(e) => setEditOptionTime(e.target.value)}
                          />
                          <input 
                            type="number"
                            step="0.5"
                            min="0"
                            placeholder="Hours"
                            className="text-xs border rounded px-1 w-full bg-background font-normal"
                            value={editOptionDuration}
                            onChange={(e) => setEditOptionDuration(e.target.value)}
                          />
                        </>
                      )}
                      <div className="flex gap-1 mt-1 w-full">
                        <button type="submit" className="flex-1 text-[10px] bg-primary text-primary-foreground px-1 py-1 rounded disabled:opacity-50" disabled={updateOptionMutation.isPending}>Save</button>
                        <button type="button" onClick={() => setEditingOptionId(null)} className="flex-1 text-[10px] bg-muted px-1 py-1 rounded disabled:opacity-50" disabled={updateOptionMutation.isPending}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {formatOption(opt)}
                      <button
                        onClick={() => handleEditOption(opt)}
                        title="Edit Option"
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700 p-1 bg-card rounded shadow-sm border"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                      </button>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participantRows.length === 0 && (
              <tr>
                <td colSpan={allOptions.length + 1} className="p-3 text-sm text-muted-foreground italic text-center">
                  No responses yet. Add a participant below to get started!
                </td>
              </tr>
            )}
            {participantRows.map((row, idx) => {
              const pKey = `${row.name}-${row.email}`;
              return (
              <tr key={idx} className="group border-b last:border-0 hover:bg-muted/5 transition-colors">
                <td className="p-3 sticky left-0 bg-card z-10 border-r shadow-[1px_0_0_0_#e5e7eb]">
                  {editingParticipantKey === pKey ? (
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editParticipantName.trim() || updateParticipantMutation.isPending) return;
                        try {
                          await updateParticipantMutation.mutateAsync({
                            groupId: group.id,
                            participantIds: Array.from(row.participantIds.values()),
                            name: editParticipantName.trim(),
                            email: editParticipantEmail.trim() || undefined
                          });
                          setEditingParticipantKey(null);
                          utils.pollGroups.invalidate();
                          router.refresh();
                        } catch(err) {
                          alert("Failed to update participant");
                        }
                      }}
                      className="flex flex-col gap-1 w-full min-w-[150px]"
                    >
                      <input 
                        type="text" 
                        className="text-sm border rounded px-2 py-1 w-full bg-background"
                        value={editParticipantName}
                        onChange={(e) => setEditParticipantName(e.target.value)}
                        autoFocus
                      />
                      <div className="flex items-center gap-1 mt-1">
                        <input 
                          type="email" 
                          placeholder="Email (optional)"
                          className="text-xs border rounded px-2 py-1 w-full bg-background"
                          value={editParticipantEmail}
                          onChange={(e) => setEditParticipantEmail(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button type="submit" disabled={updateParticipantMutation.isPending} className="flex-1 text-[10px] bg-primary text-primary-foreground px-2 py-1 rounded font-medium disabled:opacity-50">Save</button>
                        <button type="button" disabled={updateParticipantMutation.isPending} onClick={() => setEditingParticipantKey(null)} className="flex-1 text-[10px] bg-muted px-2 py-1 rounded disabled:opacity-50">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{row.name}</div>
                        {row.email && <div className="text-xs text-muted-foreground">{row.email}</div>}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingParticipantKey(pKey);
                            setEditParticipantName(row.name);
                            setEditParticipantEmail(row.email || "");
                          }}
                          title="Edit Participant"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm("Are you sure you want to delete this participant? This will remove their responses across all polls in this group.")) {
                              handleDeleteParticipant(Array.from(row.participantIds.values()));
                            }
                          }}
                          title="Delete Participant"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 disabled:opacity-50"
                          disabled={deleteParticipantMutation.isPending}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </td>
                {allOptions.map((opt) => {
                  const vote = row.votes.get(opt.id);
                  const voteType = vote?.type || "no";
                  const participantId = row.participantIds.get(opt.pollId);
                  
                  let voteDisplay = "❌";
                  let voteClass = "text-gray-300 cursor-pointer";
                  let titleAttr = "Click to change to If Need Be";
                  
                  if (voteType === "yes") {
                    voteDisplay = "✅";
                    voteClass = "text-green-600 cursor-pointer";
                    titleAttr = "Click to change to No";
                  } else if (voteType === "ifNeedBe") {
                    voteDisplay = "⚠️";
                    voteClass = "text-yellow-600 cursor-pointer";
                    titleAttr = "Click to change to Yes";
                  }

                  const cellKey = participantId ? `${participantId}-${opt.id}` : "";
                  const originalVoteType = cellKey ? originalVotes.get(cellKey) : undefined;
                  const isChanged = originalVoteType && originalVoteType !== voteType;
                  let originalDisplay = "";
                  if (isChanged) {
                    originalDisplay = originalVoteType === "yes" ? "✅" : originalVoteType === "ifNeedBe" ? "⚠️" : "❌";
                  }
                  
                  const isPending = updateVoteMutation.isPending && 
                    updateVoteMutation.variables?.optionId === opt.id &&
                    updateVoteMutation.variables?.participantId === participantId;

                  return (
                    <td 
                      key={opt.id} 
                      className={`p-3 text-center border-l relative ${voteClass}`}
                      onClick={() => {
                        if (participantId) {
                          handleUpdateVote(vote?.id, voteType, participantId, opt.id, opt.pollId);
                        }
                      }}
                      title={participantId ? titleAttr : "Cannot edit (participant not in this poll)"}
                    >
                      {isPending ? (
                        <span className="text-xs animate-pulse">⏳</span>
                      ) : (
                        <>
                          <div className={participantId ? "inline-block hover:scale-125 transition-transform" : "inline-block opacity-50"}>
                            {voteDisplay}
                          </div>
                          {isChanged && (
                            <span 
                              className="absolute top-1 right-1 text-[10px] opacity-60 bg-card rounded-full px-1 shadow-sm border cursor-help" 
                              title={`Original: ${originalVoteType === "yes" ? "Yes" : originalVoteType === "ifNeedBe" ? "If Need Be" : "No"}`}
                            >
                              ({originalDisplay})
                            </span>
                          )}
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
            {/* Add New Participant Row */}
            <tr className="border-b last:border-0 hover:bg-muted/5 transition-colors">
              <td className="p-3 sticky left-0 bg-card z-10 border-r shadow-[1px_0_0_0_#e5e7eb]">
                <form onSubmit={handleAddParticipant} className="flex flex-col gap-1 w-full min-w-[150px]">
                  <input 
                    type="text" 
                    placeholder="+ Add Participant..." 
                    className="text-sm border rounded px-2 py-1 w-full bg-background"
                    value={newParticipantName}
                    onChange={(e) => {
                      setNewParticipantName(e.target.value);
                      if (addError) setAddError("");
                    }}
                  />
                  {newParticipantName && (
                    <div className="flex items-center gap-1 mt-1">
                      <input 
                        type="email" 
                        placeholder="Email (optional)" 
                        className="text-xs border rounded px-2 py-1 w-full bg-background"
                        value={newParticipantEmail}
                        onChange={(e) => {
                          setNewParticipantEmail(e.target.value);
                          if (addError) setAddError("");
                        }}
                      />
                      <button 
                        type="submit" 
                        className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded disabled:opacity-50 font-medium" 
                        disabled={addParticipantMutation.isPending || !newParticipantName.trim()}
                      >
                        {addParticipantMutation.isPending ? "..." : "Add"}
                      </button>
                    </div>
                  )}
                  {addError && <span className="text-xs text-red-500 font-medium mt-1">{addError}</span>}
                </form>
              </td>
              {allOptions.map((opt) => (
                <td key={opt.id} className="p-3 text-center border-l bg-muted/5 text-muted-foreground/30 text-xs">
                  -
                </td>
              ))}
            </tr>
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
