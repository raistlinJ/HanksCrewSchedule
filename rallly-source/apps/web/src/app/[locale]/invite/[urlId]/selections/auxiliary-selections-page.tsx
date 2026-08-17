"use client";

import { cn } from "@rallly/ui";
import { Card } from "@rallly/ui/card";
import { ArrowLeftIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { HanksThemeLogo } from "@/components/hanks-theme-logo";
import { OptimizedAvatarImage } from "@/components/optimized-avatar-image";
import { usePoll } from "@/features/poll/client";
import {
  useVisibility,
  useVisibleParticipants,
} from "@/features/poll/components/visibility";

export function AuxiliarySelectionsPage() {
  const poll = usePoll();
  const participants = useVisibleParticipants();
  const { canSeeScores } = useVisibility();
  const searchParams = useSearchParams();
  const selection = poll.auxiliarySelection;
  const queryString = searchParams.toString();
  const pollHref = `/invite/${poll.id}${queryString ? `?${queryString}` : ""}`;

  return (
    <div className="page-bg-gray-100 min-h-dvh p-3 lg:p-6 dark:bg-gray-900">
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl space-y-3"
      >
        <div className="flex justify-center py-2">
          <HanksThemeLogo className="w-24 sm:w-28" preload />
        </div>
        <Link
          href={pollHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 font-medium text-primary text-sm transition-colors hover:bg-primary/10"
        >
          <ArrowLeftIcon className="size-4" />
          Back to poll
        </Link>
        <Card className="border-2 bg-card shadow-md">
          <header className="border-b px-4 py-4 sm:px-5">
            <h1 className="font-bold text-xl">
              See everyone&apos;s selections
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              {selection?.name ?? poll.title}
            </p>
          </header>
          {!selection ? (
            <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-muted-foreground text-sm">
              This poll does not have any additional selections.
            </div>
          ) : !canSeeScores ? (
            <div className="flex min-h-32 items-center justify-center px-4 py-8 text-center text-muted-foreground text-sm">
              Submit your response to see everyone&apos;s selections.
            </div>
          ) : (
            <div className="divide-y">
              {selection.options.map((option) => {
                const yesParticipants = participants.filter((participant) =>
                  participant.auxiliaryVotes.some(
                    (vote) =>
                      vote.auxiliaryOptionId === option.id &&
                      vote.type === "yes",
                  ),
                );
                const yesIsFull =
                  option.maxYes !== null &&
                  yesParticipants.length >= option.maxYes;

                return (
                  <section
                    id={`selection-${option.id}`}
                    key={option.id}
                    className="scroll-mt-3 px-4 py-4 sm:px-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="font-semibold text-base">
                          {option.label}
                        </h2>
                        <p className="mt-0.5 text-muted-foreground text-xs">
                          {yesParticipants.length}{" "}
                          {yesParticipants.length === 1
                            ? "person selected this"
                            : "people selected this"}
                        </p>
                      </div>
                      {option.maxYes !== null ? (
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-1 font-medium text-xs tabular-nums",
                            yesIsFull
                              ? "bg-green-600 text-white"
                              : "bg-green-500/10 text-green-800 dark:text-green-200",
                          )}
                        >
                          {yesParticipants.length}/{option.maxYes}
                        </span>
                      ) : null}
                    </div>
                    {yesParticipants.length > 0 ? (
                      <ul className="mt-3 grid gap-1 sm:grid-cols-2">
                        {yesParticipants.map((participant) => (
                          <li
                            key={participant.id}
                            className="flex min-h-11 items-center gap-3 rounded-lg bg-muted/60 px-3 py-2"
                          >
                            <OptimizedAvatarImage
                              size="sm"
                              name={participant.name}
                              src={participant.image ?? undefined}
                            />
                            <span className="min-w-0 truncate font-medium text-sm">
                              {participant.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="mt-3 flex min-h-11 items-center gap-3 rounded-lg border border-dashed px-3 py-2 text-muted-foreground text-sm">
                        <UsersIcon className="size-4" />
                        No selections yet
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
