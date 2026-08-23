"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { Input } from "@rallly/ui/input";
import { toast } from "@rallly/ui/sonner";
import { ChevronRightIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { AuxiliaryOptionToggle } from "@/features/poll/components/auxiliary-option-toggle";
import { VoteButtonGroup } from "@/features/poll/components/vote-button-group";
import VoteIcon from "@/features/poll/components/vote-icon";
import { useUnsubmittedResponseWarning } from "@/features/poll/hooks/unsubmitted-response-warning/utils";
import { isVoterIdentityComplete } from "@/features/poll/voter-identity/utils";
import { trpc } from "@/trpc/client";

type VoteState = "no" | "ifNeedBe" | "yes";

interface PublicGroupParticipant {
  name: string | null;
  votes: Array<{
    optionId: string;
    type: VoteState;
  }>;
  auxiliaryVotes: Array<{
    auxiliaryOptionId: string;
    type: VoteState;
  }>;
}

const createDefaultAuxiliaryVotes = (group: any) =>
  Object.fromEntries(
    group.polls.map((poll: any) => [
      poll.id,
      Object.fromEntries(
        (poll.auxiliarySelection?.options ?? []).map((option: any) => [
          option.id,
          "no" as const,
        ]),
      ),
    ]),
  ) as Record<string, Record<string, VoteState>>;

export default function VotingClient({
  group,
  manualAdd = false,
  userEmail,
}: {
  group: any;
  manualAdd?: boolean;
  userEmail: string | null;
}) {
  const searchParams = useSearchParams();
  const urlEmail = searchParams.get("email");
  const editToken = searchParams.get("token");
  const requiresEmailVerification = group.requireEmailVerification ?? false;

  const [name, setName] = useState("");
  const [email, setEmail] = useState(
    manualAdd ? "" : userEmail || urlEmail || "",
  );
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, VoteState>>>({});
  const [selectedAuxiliaryOptions, setSelectedAuxiliaryOptions] = useState<
    Record<string, Record<string, VoteState>>
  >(() => createDefaultAuxiliaryVotes(group));
  const [savedYesOptions, setSavedYesOptions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [savedYesAuxiliaryOptions, setSavedYesAuxiliaryOptions] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [viewingParticipants, setViewingParticipants] = useState<{
    optionId: string;
    type: "yes" | "ifNeedBe" | "no";
    label: string;
    names: string[];
  } | null>(null);
  
  const [hasPassedGatekeeper, setHasPassedGatekeeper] = useState(
    manualAdd || requiresEmailVerification || !!(userEmail || urlEmail),
  );
  const [gatekeeperEmail, setGatekeeperEmail] = useState(
    manualAdd ? "" : userEmail || urlEmail || "",
  );
  const [gatekeeperError, setGatekeeperError] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isEditingViaLink, setIsEditingViaLink] = useState(false);
  const identityReady = isVoterIdentityComplete({ name, email });
  useUnsubmittedResponseWarning(!isSubmitted);
  
  const utils = trpc.useUtils();

  const submitVotesMutation = trpc.pollGroups.submitGroupVotes.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const applyParticipants = (participants: any[], fallbackEmail = "") => {
    if (participants.length > 0) {
        setName(participants[0].name || "");
        setEmail(participants[0].email || fallbackEmail);
        setNote(participants[0].note || "");
        
        const newSelectedOptions: Record<string, Record<string, VoteState>> = {};
        const newSelectedAuxiliaryOptions = createDefaultAuxiliaryVotes(group);
        const newSavedYesOptions: Record<string, Record<string, boolean>> = {};
        const newSavedYesAuxiliaryOptions: Record<
          string,
          Record<string, boolean>
        > = {};
        for (const p of participants) {
          newSelectedOptions[p.pollId] = {};
          newSavedYesOptions[p.pollId] = {};
          newSavedYesAuxiliaryOptions[p.pollId] = {};
          for (const v of p.votes) {
            newSelectedOptions[p.pollId][v.optionId] = v.type as VoteState;
            if (v.type === "yes") {
              newSavedYesOptions[p.pollId][v.optionId] = true;
            }
          }
          for (const v of p.auxiliaryVotes ?? []) {
            newSelectedAuxiliaryOptions[p.pollId] ??= {};
            newSelectedAuxiliaryOptions[p.pollId][v.auxiliaryOptionId] =
              v.type === "yes" ? "yes" : "no";
            if (v.type === "yes") {
              newSavedYesAuxiliaryOptions[p.pollId][v.auxiliaryOptionId] = true;
            }
          }
        }
        setSelectedOptions(newSelectedOptions);
        setSelectedAuxiliaryOptions(newSelectedAuxiliaryOptions);
        setSavedYesOptions(newSavedYesOptions);
        setSavedYesAuxiliaryOptions(newSavedYesAuxiliaryOptions);
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
    if (manualAdd) {
      return;
    }
    if (requiresEmailVerification && editToken) {
      performEditTokenLookup(editToken);
    } else if (!requiresEmailVerification && (userEmail || urlEmail)) {
      performLookup(userEmail || urlEmail || "");
    }
  }, [editToken, manualAdd, requiresEmailVerification, userEmail, urlEmail]);

  const handleGatekeeperSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatekeeperEmail.includes("@")) {
      setGatekeeperError("Please enter a valid email address");
      return;
    }
    await performLookup(gatekeeperEmail);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identityReady) return;

    for (const poll of group.polls) {
      if (!poll.auxiliarySelection) continue;
      const hasPrimaryYes = Object.values(
        selectedOptions[poll.id] ?? {},
      ).some((type) => type === "yes");
      if (!hasPrimaryYes) continue;
      const yesCount = poll.auxiliarySelection.options.filter(
        (option: any) =>
          selectedAuxiliaryOptions[poll.id]?.[option.id] === "yes",
      ).length;
      if (yesCount < poll.auxiliarySelection.minYes) {
        toast.error(
          `Select at least ${poll.auxiliarySelection.minYes} ${poll.auxiliarySelection.name} choices in ${poll.title}.`,
        );
        return;
      }
      if (
        poll.auxiliarySelection.maxYesSelections != null &&
        yesCount > poll.auxiliarySelection.maxYesSelections
      ) {
        toast.error(
          `Select no more than ${poll.auxiliarySelection.maxYesSelections} ${poll.auxiliarySelection.name} choices in ${poll.title}.`,
        );
        return;
      }
    }

    const votes = group.polls.map((poll: any) => {
      const pollVotes = selectedOptions[poll.id] || {};
      const hasPrimaryYes = Object.values(pollVotes).some(
        (type) => type === "yes",
      );
      const options = Object.entries(pollVotes)
        .filter(([, type]) => type !== "no")
        .map(([optionId, type]) => ({ optionId, type }));
      const auxiliaryOptions = (poll.auxiliarySelection?.options ?? []).map(
        (option: any) => ({
          auxiliaryOptionId: option.id,
          type: hasPrimaryYes
            ? (selectedAuxiliaryOptions[poll.id]?.[option.id] ?? "no")
            : "no",
        }),
      );
      return {
        pollId: poll.id,
        options,
        auxiliaryOptions,
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
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-6">
        <div>
          <h3 className="font-bold text-xl">Your details</h3>
          <p className="mt-1 text-muted-foreground text-sm">
            Enter your name and email before selecting your responses.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block font-medium text-sm">Name *</label>
            <input
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Name"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-sm">Email *</label>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              disabled={isEditingViaLink}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Email"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-sm">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Your Phone Number"
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-sm">
              Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Add a comment..."
            />
          </div>
        </div>
        {!identityReady ? (
          <p className="text-muted-foreground text-sm">
            Voting will be enabled after both required fields are complete.
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {group.polls.map((poll: any) => {
        const hasPrimaryYes = Object.values(
          selectedOptions[poll.id] ?? {},
        ).some((type) => type === "yes");
        const auxiliaryYesCount = (
          poll.auxiliarySelection?.options ?? []
        ).filter(
          (option: any) =>
            selectedAuxiliaryOptions[poll.id]?.[option.id] === "yes",
        ).length;

        return (
        <div key={poll.id} className="rounded-xl border bg-card p-4 shadow-sm flex flex-col sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-xl sm:text-2xl">{poll.title}</h2>
          </div>

          
          {poll.options.length === 0 ? (
            <p className="text-muted-foreground italic text-sm">No options available for this poll.</p>
          ) : (
            <div className="grid gap-4 grid-cols-1">
              {poll.options.map((option: any) => {
                const pollVotes = selectedOptions[poll.id] || {};
                const voteState = pollVotes[option.id] || "no";
                
                const pollParticipants = (poll.participants ??
                  []) as PublicGroupParticipant[];
                const acceptedParticipants = pollParticipants.filter(
                  (participant) =>
                    participant.votes.some(
                      (vote) =>
                        vote.optionId === option.id && vote.type === "yes",
                    ),
                );
                const ifNeedBeParticipants = pollParticipants.filter(
                  (participant) =>
                    participant.votes.some(
                      (vote) =>
                        vote.optionId === option.id &&
                        vote.type === "ifNeedBe",
                    ),
                );
                const noParticipants = pollParticipants.filter(
                  (participant) => {
                    const savedVote = participant.votes.find(
                      (vote) => vote.optionId === option.id,
                    );
                    return !savedVote || savedVote.type === "no";
                  },
                );
                const acceptedCount = acceptedParticipants.length;
                const ifNeedBeCount = ifNeedBeParticipants.length;
                const noCount = noParticipants.length;
                const maxYes = option.maxYes as number | null | undefined;
                const yesIsFull = maxYes != null && acceptedCount >= maxYes;
                
                return (
                  <div key={option.id} className="rounded-xl border bg-background p-2 shadow-xs">
                    <div className="flex min-h-16 w-full flex-col items-center justify-center rounded-lg border bg-muted/30 p-3">
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
                      {maxYes != null ? (
                        <span
                          className={`mt-2 rounded-full px-2 py-1 font-semibold text-[10px] ${
                            yesIsFull
                              ? "bg-green-600 text-white"
                              : "bg-green-500/10 text-green-800 dark:text-green-200"
                          }`}
                        >
                          {acceptedCount}/{maxYes}
                        </span>
                      ) : null}
                    </div>
                    <VoteButtonGroup
                      className="mt-2"
                      value={voteState}
                      optionLabel={`${poll.title}, ${new Date(option.startTime).toLocaleString()}`}
                      disabled={!identityReady}
                      yesDisabled={
                        yesIsFull &&
                        !savedYesOptions[poll.id]?.[option.id]
                      }
                      onChange={(type) =>
                        setSelectedOptions((previous) => ({
                          ...previous,
                          [poll.id]: {
                            ...(previous[poll.id] ?? {}),
                            [option.id]: type,
                          },
                        }))
                      }
                    />
                    {(acceptedCount > 0 ||
                      ifNeedBeCount > 0 ||
                      noCount > 0) && (
                      <div className="pt-3">
                        <p className="mb-2 px-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
                          Other responses
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {acceptedCount > 0 && (
                            <button
                              type="button"
                              className="flex min-h-14 items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-left transition-colors hover:bg-green-500/15"
                              onClick={() =>
                                setViewingParticipants({
                                  optionId: option.id,
                                  type: "yes",
                                  label: "Yes",
                                  names: acceptedParticipants.map(
                                    (participant) =>
                                      participant.name || "Anonymous",
                                  ),
                                })
                              }
                            >
                              <VoteIcon type="yes" />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-green-800 text-sm dark:text-green-200">
                                  {acceptedCount} Yes
                                </span>
                                <span className="block truncate text-muted-foreground text-xs">
                                  {acceptedParticipants
                                    .slice(0, 3)
                                    .map(
                                      (participant) =>
                                        participant.name || "Anonymous",
                                    )
                                    .join(", ")}
                                  {acceptedCount > 3
                                    ? ` and ${acceptedCount - 3} more`
                                    : ""}
                                </span>
                              </span>
                              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          )}
                          {ifNeedBeCount > 0 && (
                            <button
                              type="button"
                              className="flex min-h-14 items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-left transition-colors hover:bg-amber-500/15"
                              onClick={() =>
                                setViewingParticipants({
                                  optionId: option.id,
                                  type: "ifNeedBe",
                                  label: "If needed",
                                  names: ifNeedBeParticipants.map(
                                    (participant) =>
                                      participant.name || "Anonymous",
                                  ),
                                })
                              }
                            >
                              <VoteIcon type="ifNeedBe" />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-amber-800 text-sm dark:text-amber-200">
                                  {ifNeedBeCount} if needed
                                </span>
                                <span className="block truncate text-muted-foreground text-xs">
                                  {ifNeedBeParticipants
                                    .slice(0, 3)
                                    .map(
                                      (participant) =>
                                        participant.name || "Anonymous",
                                    )
                                    .join(", ")}
                                  {ifNeedBeCount > 3
                                    ? ` and ${ifNeedBeCount - 3} more`
                                    : ""}
                                </span>
                              </span>
                              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          )}
                          {noCount > 0 && (
                            <button
                              type="button"
                              className="flex min-h-14 items-center gap-3 rounded-lg border bg-muted/60 px-3 py-2 text-left transition-colors hover:bg-muted"
                              onClick={() =>
                                setViewingParticipants({
                                  optionId: option.id,
                                  type: "no",
                                  label: "No",
                                  names: noParticipants.map(
                                    (participant) =>
                                      participant.name || "Anonymous",
                                  ),
                                })
                              }
                            >
                              <VoteIcon type="no" />
                              <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-sm">
                                  {noCount} No
                                </span>
                                <span className="block truncate text-muted-foreground text-xs">
                                  {noParticipants
                                    .slice(0, 3)
                                    .map(
                                      (participant) =>
                                        participant.name || "Anonymous",
                                    )
                                    .join(", ")}
                                  {noCount > 3
                                    ? ` and ${noCount - 3} more`
                                    : ""}
                                </span>
                              </span>
                              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {poll.auxiliarySelection && hasPrimaryYes ? (
            <section className="mt-5 border-t pt-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">
                    {poll.auxiliarySelection.name}
                  </h3>
                  <p className="text-muted-foreground text-xs">
                    {poll.auxiliarySelection.minYes > 0 &&
                    poll.auxiliarySelection.maxYesSelections != null
                      ? `Select ${poll.auxiliarySelection.minYes} to ${poll.auxiliarySelection.maxYesSelections}.`
                      : poll.auxiliarySelection.minYes > 0
                        ? `Select at least ${poll.auxiliarySelection.minYes}.`
                        : poll.auxiliarySelection.maxYesSelections != null
                          ? `Select up to ${poll.auxiliarySelection.maxYesSelections}.`
                          : "Optional"}
                  </p>
                </div>
                {poll.auxiliarySelection.minYes > 0 ||
                poll.auxiliarySelection.maxYesSelections != null ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-1 font-medium text-xs">
                    {auxiliaryYesCount} selected
                    {poll.auxiliarySelection.minYes > 0
                      ? ` · min ${poll.auxiliarySelection.minYes}`
                      : ""}
                    {poll.auxiliarySelection.maxYesSelections != null
                      ? ` · max ${poll.auxiliarySelection.maxYesSelections}`
                      : ""}
                  </span>
                ) : null}
              </div>
              <div className="space-y-2">
                {poll.auxiliarySelection.options.map((option: any) => {
                  const voteState =
                    selectedAuxiliaryOptions[poll.id]?.[option.id] ??
                    "no";
                  const pollParticipants = (poll.participants ??
                    []) as PublicGroupParticipant[];
                  const yesParticipants = pollParticipants.filter(
                    (participant) =>
                      participant.auxiliaryVotes.some(
                        (vote) =>
                          vote.auxiliaryOptionId === option.id &&
                          vote.type === "yes",
                      ),
                  );
                  const yesIsFull =
                    option.maxYes != null &&
                    yesParticipants.length >= option.maxYes;
                  const participantLimitReached =
                    poll.auxiliarySelection.maxYesSelections != null &&
                    auxiliaryYesCount >=
                      poll.auxiliarySelection.maxYesSelections &&
                    voteState !== "yes";

                  return (
                    <div key={option.id} className="space-y-2">
                      <div className="flex min-h-12 w-full items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-left">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium text-sm">
                            {option.label}
                          </span>
                        </span>
                        {option.maxYes != null ? (
                          <span
                            className={`rounded-full px-2 py-1 font-semibold text-[10px] ${
                              yesIsFull
                                ? "bg-green-600 text-white"
                                : "bg-green-500/10 text-green-800 dark:text-green-200"
                            }`}
                          >
                            {yesParticipants.length}/{option.maxYes}
                          </span>
                        ) : null}
                      <AuxiliaryOptionToggle
                        optionLabel={option.label}
                        selected={voteState === "yes"}
                        disabled={
                          !identityReady ||
                          ((yesIsFull &&
                            !savedYesAuxiliaryOptions[poll.id]?.[option.id]) ||
                            participantLimitReached)
                        }
                        onChange={(selected) =>
                          setSelectedAuxiliaryOptions((previous) => ({
                            ...previous,
                            [poll.id]: {
                              ...(previous[poll.id] ?? {}),
                              [option.id]: selected ? "yes" : "no",
                            },
                          }))
                        }
                      />
                      </div>
                    {yesParticipants.length > 0 ? (
                      <button
                        type="button"
                        className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-left transition-colors hover:bg-green-500/15"
                        onClick={() =>
                          setViewingParticipants({
                            optionId: option.id,
                            type: "yes",
                            label: `${option.label} · Signed up`,
                            names: yesParticipants.map(
                              (participant) =>
                                participant.name || "Anonymous",
                            ),
                          })
                        }
                      >
                        <VoteIcon type="yes" />
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-green-800 text-sm dark:text-green-200">
                            {yesParticipants.length} signed up
                          </span>
                          <span className="block truncate text-muted-foreground text-xs">
                            {yesParticipants
                              .slice(0, 3)
                              .map(
                                (participant) =>
                                  participant.name || "Anonymous",
                              )
                              .join(", ")}
                            {yesParticipants.length > 3
                              ? ` and ${yesParticipants.length - 3} more`
                              : ""}
                          </span>
                        </span>
                        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                      </button>
                    ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>
        );
      })}
      </div>

      <div className="flex justify-end pb-12">
        <Button
          type="submit"
          size="lg"
          disabled={submitVotesMutation.isPending || !identityReady}
          className="w-full md:w-auto"
        >
          {submitVotesMutation.isPending ? "Submitting..." : "Submit All Responses"}
        </Button>
      </div>
      
      <Dialog
        open={viewingParticipants !== null}
        onOpenChange={(open) => {
          if (!open) setViewingParticipants(null);
        }}
      >
        <DialogContent className="max-h-[min(80vh,36rem)] overflow-hidden p-0">
          {viewingParticipants ? (
            <>
              <DialogHeader className="border-b p-4 pr-12">
                <DialogTitle className="flex items-center gap-2">
                  <VoteIcon type={viewingParticipants.type} />
                  {viewingParticipants.label}
                </DialogTitle>
                <DialogDescription>
                  {viewingParticipants.names.length}{" "}
                  {viewingParticipants.names.length === 1 ? "person" : "people"}
                </DialogDescription>
              </DialogHeader>
              <ul className="max-h-[60vh] space-y-1 overflow-y-auto p-3">
                {viewingParticipants.names.map((participantName, index) => (
                  <li
                    // Names are not guaranteed to be unique in a poll.
                    // biome-ignore lint/suspicious/noArrayIndexKey: stable read-only dialog list
                    key={index}
                    className="flex min-h-12 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-muted"
                  >
                    <OptimizedAvatarImage size="sm" name={participantName} />
                    <span className="min-w-0 truncate font-medium text-sm">
                      {participantName}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </form>
    </>
  );
}
