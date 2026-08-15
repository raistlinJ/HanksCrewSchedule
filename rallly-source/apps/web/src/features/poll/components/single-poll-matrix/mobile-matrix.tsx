"use client";

import { Button } from "@rallly/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@rallly/ui/card";
import { Icon } from "@rallly/ui/icon";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  QrCodeIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { dayjs } from "@/lib/dayjs";
import { useLocale } from "@/lib/locale/client";
import VoteIcon from "../vote-icon";

interface Option {
  id: string;
  startTime: string;
  duration?: number;
}

interface Vote {
  optionId: string;
  type: "yes" | "no" | "ifNeedBe";
  id?: string;
}

interface Participant {
  id: string;
  name: string;
  email?: string;
  votes: Vote[];
}

interface MobilePollMatrixProps {
  options: Option[];
  participants: Participant[];
  poll: any;
  onVoteChange: (voteId: string | undefined, currentType: string, participantId: string, optionId: string) => void;
  onAddParticipant: (
    name: string,
    email: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
  onDeleteParticipant: (participantId: string) => void;
  onEditParticipant: (participantId: string, name: string, email: string) => void;
}

const MobilePollMatrix: React.FC<MobilePollMatrixProps> = ({
  options,
  participants,
  poll,
  onVoteChange,
  onAddParticipant,
  onDeleteParticipant,
  onEditParticipant,
}) => {
  const [currentOptionIndex, setCurrentOptionIndex] = useState(0);
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState("");
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const { locale } = useLocale();

  if (options.length === 0) {
    return <p className="text-muted-foreground text-center py-8">This poll has no options yet.</p>;
  }

  const currentOption = options[currentOptionIndex];

  const formatOption = (opt: Option) => {
    const d = new Date(opt.startTime);
    const timeZone = poll.timeZone || "UTC";
    const dateStr = new Intl.DateTimeFormat(locale, {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone,
    }).format(d);

    if (poll.kind === "time" || (opt.duration && opt.duration > 0)) {
      const timeFormatter = new Intl.DateTimeFormat(locale, {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      });
      const startStr = timeFormatter.format(d);

      if (opt.duration && opt.duration > 0) {
        const endDate = new Date(d.getTime() + opt.duration * 60000);
        const endStr = timeFormatter.format(endDate);
        const hours = opt.duration / 60;
        const hoursStr = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
        return {
          date: dateStr,
          time: `${startStr} - ${endStr}`,
          duration: `${hoursStr}h`,
        };
      }

      return {
        date: dateStr,
        time: startStr,
        duration: null,
      };
    }

    return {
      date: dateStr,
      time: null,
      duration: null,
    };
  };

  const optionDisplay = formatOption(currentOption);
  const yesCount = participants.reduce((sum, p) => {
    const vote = p.votes.find((v) => v.optionId === currentOption.id);
    return sum + (vote?.type === "yes" ? 1 : 0);
  }, 0);
  const ifNeedBeCount = participants.reduce((sum, p) => {
    const vote = p.votes.find((v) => v.optionId === currentOption.id);
    return sum + (vote?.type === "ifNeedBe" ? 1 : 0);
  }, 0);
  const noCount = participants.reduce((sum, p) => {
    const vote = p.votes.find((v) => v.optionId === currentOption.id);
    return sum + (vote?.type === "no" ? 1 : 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Option Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentOptionIndex(Math.max(0, currentOptionIndex - 1))}
              disabled={currentOptionIndex === 0}
            >
              <Icon>
                <ChevronLeftIcon />
              </Icon>
            </Button>

            <div className="flex-1 text-center">
              <div className="text-sm text-muted-foreground">
                Option {currentOptionIndex + 1} of {options.length}
              </div>
              <div className="font-semibold">{optionDisplay.date}</div>
              {optionDisplay.time && <div className="text-sm text-muted-foreground">{optionDisplay.time}</div>}
              {optionDisplay.duration && <div className="text-xs text-muted-foreground">{optionDisplay.duration}</div>}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentOptionIndex(Math.min(options.length - 1, currentOptionIndex + 1))}
              disabled={currentOptionIndex === options.length - 1}
            >
              <Icon>
                <ChevronRightIcon />
              </Icon>
            </Button>
          </div>
        </CardHeader>

        {/* Vote Summary */}
        <CardContent className="pt-0">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-green-50 dark:bg-green-950 p-2">
              <div className="text-2xl">✅</div>
              <div className="text-sm font-semibold text-green-700 dark:text-green-300">{yesCount}</div>
              <div className="text-xs text-muted-foreground">Yes</div>
            </div>
            <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-2">
              <VoteIcon type="ifNeedBe" className="mx-auto size-7" />
              <div className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">{ifNeedBeCount}</div>
              <div className="text-xs text-muted-foreground">If Need Be</div>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-2">
              <div className="text-2xl">❌</div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">{noCount}</div>
              <div className="text-xs text-muted-foreground">No</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span>Participants</span>
            {poll.groupNavigation ? (
              <Link
                href={`/groups/${poll.groupNavigation.groupId}/polls/${poll.id}/scan`}
                aria-label="Scan user QR code"
                title="Scan user QR code"
                className="inline-flex text-muted-foreground transition-colors hover:text-primary"
              >
                <QrCodeIcon className="size-4" />
              </Link>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {participants.map((participant) => {
              const vote = participant.votes.find((v) => v.optionId === currentOption.id);
              const voteType = vote?.type || "no";

              let voteDisplay: React.ReactNode = "❌";
              let voteBgColor = "bg-gray-100 dark:bg-gray-800";
              let voteTextColor = "text-gray-600 dark:text-gray-400";

              if (voteType === "yes") {
                voteDisplay = "✅";
                voteBgColor = "bg-green-100 dark:bg-green-900";
                voteTextColor = "text-green-700 dark:text-green-300";
              } else if (voteType === "ifNeedBe") {
                voteDisplay = (
                  <VoteIcon type="ifNeedBe" className="mx-auto size-6" />
                );
                voteBgColor = "bg-yellow-100 dark:bg-yellow-900";
                voteTextColor = "text-yellow-700 dark:text-yellow-300";
              }

              return (
                <div key={participant.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{participant.name}</div>
                    {participant.email && (
                      <div className="text-xs text-muted-foreground truncate">{participant.email}</div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const votes = participant.votes.find((v) => v.optionId === currentOption.id);
                      onVoteChange(votes?.id, voteType, participant.id, currentOption.id);
                    }}
                    className={`flex-shrink-0 px-3 py-2 rounded-lg font-semibold text-lg cursor-pointer transition-transform hover:scale-110 ${voteBgColor} ${voteTextColor}`}
                    title={`Click to change vote (current: ${voteType})`}
                  >
                    {voteDisplay}
                  </button>
                </div>
              );
            })}

            {/* Add Participant */}
            {!showAddParticipant && participants.length > 0 && (
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setShowAddParticipant(true)}
              >
                <Icon>
                  <PlusIcon />
                </Icon>
                Add Participant
              </Button>
            )}

            {(showAddParticipant || participants.length === 0) && (
              <form
                className="mt-4 space-y-2 border-t pt-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setAddError("");
                  const result = await onAddParticipant(
                    newParticipantName,
                    newParticipantEmail,
                  );
                  if (result.ok) {
                    setNewParticipantName("");
                    setNewParticipantEmail("");
                    setShowAddParticipant(false);
                  } else {
                    setAddError(result.message);
                  }
                }}
              >
                <input
                  type="text"
                  placeholder="Participant name"
                  required
                  className="w-full px-3 py-2 border rounded text-sm bg-background"
                  value={newParticipantName}
                  onChange={(e) => {
                    setNewParticipantName(e.target.value);
                    if (addError) setAddError("");
                  }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2 border rounded text-sm bg-background"
                  value={newParticipantEmail}
                  onChange={(e) => {
                    setNewParticipantEmail(e.target.value);
                    if (addError) setAddError("");
                  }}
                />
                {addError && <div className="text-xs text-red-600">{addError}</div>}
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1"
                    disabled={
                      !newParticipantName.trim() ||
                      !newParticipantEmail.trim()
                    }
                  >
                    Add
                  </Button>
                  {participants.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowAddParticipant(false);
                        setNewParticipantName("");
                        setNewParticipantEmail("");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </form>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobilePollMatrix;
