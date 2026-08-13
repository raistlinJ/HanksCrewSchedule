"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@rallly/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@rallly/ui/dialog";

export default function VotingClient({ group, userEmail }: { group: any; userEmail: string | null }) {
  type VoteState = "no" | "ifNeedBe" | "yes";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, VoteState>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [viewingParticipants, setViewingParticipants] = useState<{ optionId: string, type: string, names: string[] } | null>(null);
  
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const utils = trpc.useUtils();

  // Initialize selectedOptions if empty and user has past votes (via email match or participant)
  // This is a simple implementation; ideally we'd look up past votes from group.polls
  
  const submitVotesMutation = trpc.pollGroups.submitGroupVotes.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  
  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError("");
    setIsLookingUp(true);
    try {
      const participants = await utils.pollGroups.getParticipantByEmail.fetch({ groupId: group.id, email: lookupEmail });
      if (participants && participants.length > 0) {
        setName(participants[0].name || "");
        setEmail(participants[0].email || "");
        setNote(participants[0].note || "");
        
        const newSelectedOptions: Record<string, Record<string, VoteState>> = {};
        for (const p of participants) {
          newSelectedOptions[p.pollId] = {};
          for (const v of p.votes) {
            newSelectedOptions[p.pollId][v.optionId] = v.type as VoteState;
          }
        }
        setSelectedOptions(newSelectedOptions);
        setShowLookupModal(false);
      } else {
        setLookupError("No previous submission found for that email.");
      }
    } catch (err: any) {
      setLookupError(err.message || "An error occurred");
    } finally {
      setIsLookingUp(false);
    }
  };


  const cycleOption = (pollId: string, optionId: string) => {
    setSelectedOptions((prev) => {
      const pollVotes = prev[pollId] || {};
      const current = pollVotes[optionId] || "no";
      let nextState: VoteState = "no";
      if (current === "no") nextState = "yes";
      else if (current === "yes") nextState = "ifNeedBe";
      else if (current === "ifNeedBe") nextState = "no";

      return {
        ...prev,
        [pollId]: {
          ...pollVotes,
          [optionId]: nextState,
        },
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const votes = Object.entries(selectedOptions).map(([pollId, pollVotes]) => {
      const options = Object.entries(pollVotes)
        .filter(([, type]) => type !== "no")
        .map(([optionId, type]) => ({ optionId, type }));
      return {
        pollId,
        options,
      };
    });

    const combinedNote = [phone ? `Phone: ${phone}` : "", note].filter(Boolean).join("\n");

    submitVotesMutation.mutate({
      groupId: group.id,
      name,
      email,
      note: combinedNote || undefined,
      votes,
    });
  };

  if (isSubmitted) {
    return (
      <div className="text-center py-16 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background shadow-lg relative overflow-hidden animate-in fade-in zoom-in duration-500">
        <div className="absolute inset-0 bg-primary/10 blur-3xl -z-10 rounded-full scale-150 animate-pulse"></div>
        <h2 className="text-4xl font-black tracking-tight text-foreground">Thank You!</h2>
        <p className="mt-3 text-lg font-medium text-muted-foreground">Your responses have been recorded.</p>
        <Button onClick={() => setIsSubmitted(false)} size="lg" className="mt-8 rounded-full px-8 font-semibold shadow-md hover:scale-105 transition-transform">
          Edit Responses
        </Button>
      </div>
    );
  }

  return (
    <>
      {group.requireEmailVerification === false && (
        <div className="mb-4 text-center">
          <Button variant="outline" size="sm" onClick={() => setShowLookupModal(true)}>
            Already voted? Pull up your submission
          </Button>
        </div>
      )}

      {showLookupModal && (
        <Dialog open={showLookupModal} onOpenChange={setShowLookupModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Find your previous votes</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLookup} className="space-y-4 pt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  className="w-full border rounded px-3 py-2 text-sm"
                />
              </div>
              {lookupError && <p className="text-red-500 text-sm">{lookupError}</p>}
              <Button type="submit" disabled={isLookingUp}>
                {isLookingUp ? "Looking up..." : "Pull up submission"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {group.polls.map((poll: any) => (
        <div key={poll.id} className="rounded-xl border bg-card p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{poll.title}</h2>
          </div>

          
          {poll.options.length === 0 ? (
            <p className="text-muted-foreground italic text-sm">No options available for this poll.</p>
          ) : (
            <div className="grid gap-4 grid-cols-1">
              {poll.options.map((option: any) => {
                const pollVotes = selectedOptions[poll.id] || {};
                const voteState = pollVotes[option.id] || "no";
                
                const acceptedParticipants = poll.participants?.filter((p: any) => p.votes.some((v: any) => v.optionId === option.id && v.type === 'yes')) || [];
                const ifNeedBeParticipants = poll.participants?.filter((p: any) => p.votes.some((v: any) => v.optionId === option.id && v.type === 'ifNeedBe')) || [];
                const acceptedCount = acceptedParticipants.length;
                const ifNeedBeCount = ifNeedBeParticipants.length;
                
                return (
                  <div key={option.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cycleOption(poll.id, option.id)}
                      className={`flex-1 flex flex-col items-center justify-center rounded-lg border-2 p-3 transition-all ${
                        voteState === "yes"
                          ? "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400"
                          : voteState === "ifNeedBe"
                          ? "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                          : "border-border hover:border-gray-400 hover:bg-muted opacity-70"
                      }`}
                    >
                      <span className="font-semibold text-sm">
                        {new Date(option.startTime).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {poll.kind === 'time' && (
                        <span className="text-xs opacity-75 mt-1">
                          {new Date(option.startTime).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-90">
                        {voteState === "yes" ? "YES" : voteState === "ifNeedBe" ? "IF NEEDED" : "NO"}
                      </span>
                    </button>
                    {(acceptedCount > 0 || ifNeedBeCount > 0) && (
                      <div className="text-[10px] leading-tight font-mono text-muted-foreground w-1/3">
                        {acceptedCount > 0 && (
                          <div 
                            className="cursor-pointer hover:text-foreground hover:underline"
                            onClick={() => setViewingParticipants({ optionId: option.id, type: "YES", names: acceptedParticipants.map((p: any) => p.name || "Anonymous") })}
                          >
                            {acceptedCount} replied YES
                          </div>
                        )}
                        {ifNeedBeCount > 0 && (
                          <div 
                            className="cursor-pointer hover:text-foreground hover:underline mt-1"
                            onClick={() => setViewingParticipants({ optionId: option.id, type: "IF NEEDED", names: ifNeedBeParticipants.map((p: any) => p.name || "Anonymous") })}
                          >
                            {ifNeedBeCount} replied IF NEEDED
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <h3 className="text-xl font-bold mb-4">Your Details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email * (Required to edit later)</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Phone Number"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Note (Optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Add a comment..."
          />
        </div>
      </div>

      <div className="flex justify-end pb-12">
        <Button
          type="submit"
          size="lg"
          disabled={submitVotesMutation.isPending || !name.trim() || !email.trim()}
          className="w-full md:w-auto"
        >
          {submitVotesMutation.isPending ? "Submitting..." : "Submit All Responses"}
        </Button>
      </div>
      
      {viewingParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewingParticipants(null)}>
          <div className="bg-background rounded-xl p-6 shadow-xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg capitalize">{viewingParticipants.type}</h3>
              <button onClick={() => setViewingParticipants(null)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {viewingParticipants.names.map((n, i) => (
                <li key={i} className="text-sm font-medium border-b pb-1 last:border-0">{n}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </form>
    </>
  );
}
