import type { VoteType } from "@rallly/database";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import * as React from "react";
import { usePollEmailAccess } from "@/features/poll/email-access/client";
import { isPublicPollResultsPath } from "@/features/poll/poll-results/utils";
import { useTranslation } from "@/i18n/client";
import { trpc } from "@/trpc/client";

export function filterParticipantsByVote<
  T extends { votes: { optionId: string; type: VoteType }[] },
>(participants: T[], optionId: string, voteType: VoteType): T[] {
  return participants.filter((participant) => {
    return participant.votes.some((vote) => {
      return vote.optionId === optionId && vote.type === voteType;
    });
  });
}

export const useParticipants = () => {
  const { t } = useTranslation();
  const urlId = useParams<{ urlId: string }>().urlId;
  const pathname = usePathname();
  const token = useSearchParams().get("token") ?? undefined;
  const { emailAccess } = usePollEmailAccess();
  const publicResultsView = isPublicPollResultsPath(pathname);
  const [rawParticipants] = trpc.polls.participants.list.useSuspenseQuery({
    pollId: urlId,
    token,
    accessEmail: emailAccess ?? undefined,
    ...(publicResultsView ? { publicResultsView: true } : {}),
  });

  const participants = React.useMemo(() => {
    return rawParticipants.map((participant, index) => {
      if (!participant.hidden) {
        return participant;
      }

      return {
        ...participant,
        name: t("hiddenParticipantName", {
          defaultValue: "Participant #{number}",
          number: rawParticipants.length - index,
        }),
      };
    });
  }, [rawParticipants, t]);

  return { participants };
};
