"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@rallly/ui/button";
import { Input } from "@rallly/ui/input";
import { useSearchParams } from "next/navigation";

export default function VotingClient({ group, userEmail }: { group: any; userEmail: string | null }) {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email");
  const editToken = searchParams.get("token");
  const requiresEmailVerification = group.requireEmailVerification ?? false;

  type VoteState = "no" | "ifNeedBe" | "yes";
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail || urlEmail || "");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, VoteState>>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [viewingParticipants, setViewingParticipants] = useState<{ optionId: string, type: string, names: string[] } | null>(null);
  
  const [hasPassedGatekeeper, setHasPassedGatekeeper] = useState(
    requiresEmailVerification || !!(userEmail || urlEmail),
  );
  const [gatekeeperEmail, setGatekeeperEmail] = useState(userEmail || urlEmail || "");
  const [gatekeeperError, setGatekeeperError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isEditingViaLink, setIsEditingViaLink] = useState(false);
  
  const utils = trpc.useUtils();

  const submitVotesMutation = trpc.pollGroups.submitGroupVotes.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const applyParticipants = (participants: any[], fallbackEmail = "") => {
    if (participants.length > 0) {
        setName(participants[0].name || "");
        setEmail(participants[0].email || fallbackEmail);
        setNote(participants[0].note || "");
        
        const newSelectedOptions: Record<string, Record<string, VoteState>> = {};
        for (const p of participants) {
          newSelectedOptions[p.pollId] = {};
          for (const v of p.votes) {
            newSelectedOptions[p.pollId][v.optionId] = v.type as VoteState;
          }
        }
        setSelectedOptions(newSelectedOptions);
    } else if (fallbackEmail) {
      setEmail(fallbackEmail);
    }
  };

  const performLookup = async (targetEmail: string) => {
    setGatekeeperError("");
    setIsLookingUp(true);
    try {
      const participants = await utils.pollGroups.getParticipantByEmail.fetch({ groupId: group.id, email: targetEmail });
      applyParticipants(participants, targetEmail);
      setHasPassedGatekeeper(true);
    } catch (err: any) {
      setGatekeeperError(err.message || "An error occurred");
    } finally {
      setIsLookingUp(false);
    }
  };

  const performEditTokenLookup = async (token: string) => {
    setGatekeeperError("");
    setIsLookingUp(true);
    try {
      const participants = await utils.pollGroups.getParticipantByEditToken.fetch({
        groupId: group.id,
        token,
      });
      if (participants.length === 0) {
        throw new Error("No response was found for this edit link.");
      }
      applyParticipants(participants);
      setIsEditingViaLink(true);
    } catch (err: any) {
      setGatekeeperError(err.message || "This edit link is invalid.");
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    if (requiresEmailVerification && editToken) {
      performEditTokenLookup(editToken);
    } else if (!requiresEmailVerification && (userEmail || urlEmail)) {
      performLookup(userEmail || urlEmail || "");
    }
  }, [editToken, requiresEmailVerification, userEmail, urlEmail]);

  const handleGatekeeperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatekeeperEmail.includes("@")) {
      setGatekeeperError("Please enter a valid email address");
      return;
    }
    await performLookup(gatekeeperEmail);
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

    const votes = group.polls.map((poll: any) => {
      const pollVotes = selectedOptions[poll.id] || {};
      const options = Object.entries(pollVotes)
        .filter(([, type]) => type !== "no")
        .map(([optionId, type]) => ({ optionId, type }));
      return {
        pollId: poll.id,
        options,
      };
    });

    const combinedNote = [phone ? `Phone: ${phone}` : "", note].filter(Boolean).join("\n");

    submitVotesMutation.mutate({
      groupId: group.id,
      name,
      email,
      token: editToken || undefined,
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
        {requiresEmailVerification && !isEditingViaLink ? (
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
            Check your email for your secure link to review or update your responses.
          </p>
        ) : (
          <Button onClick={() => setIsSubmitted(false)} size="lg" className="mt-8 rounded-full px-8 font-semibold shadow-md hover:scale-105 transition-transform">
            Edit Responses
          </Button>
        )}
      </div>
    );
  }

  if (!hasPassedGatekeeper) {
    return (
      <div className="bg-card border rounded-lg p-6 shadow-sm mx-auto max-w-md mt-8">
        <h2 className="text-xl font-semibold mb-2">Welcome! Please enter your email</h2>
        <p className="text-muted-foreground mb-4 text-sm">
          Enter your email to view this poll group. If you've already voted, we'll load your previous responses.
        </p>
        
        <form onSubmit={handleGatekeeperSubmit} className="flex flex-col gap-3">
          <div>
            <Input
              type="email"
              placeholder="name@example.com"
              value={gatekeeperEmail}
              onChange={(e) => setGatekeeperEmail(e.target.value)}
              required
              autoFocus
              disabled={isLookingUp}
              className="w-full"
            />
            {gatekeeperError && <p className="text-red-500 text-sm mt-1">{gatekeeperError}</p>}
          </div>
          <Button type="submit" variant="primary" loading={isLookingUp}>
            Continue
          </Button>
        </form>
      </div>
    );
  }

  return (
    <>

      <form onSubmit={handleSubmit} className="space-y-12">
      {requiresEmailVerification && gatekeeperError && (
        <p className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          {gatekeeperError}
        </p>
      )}
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
              disabled={isEditingViaLink}
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
