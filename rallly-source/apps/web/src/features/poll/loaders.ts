import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import { getPollQrVotingData, getPollStatusCounts } from "@/features/poll/data";
import { getActiveSpace } from "@/features/space/loaders";

export const loadPollStatusCounts = cache(async () => {
  const space = await getActiveSpace();
  return getPollStatusCounts({ spaceId: space.id });
});

export async function loadPollForQrVoting({
  groupId,
  pollId,
}: {
  groupId: string;
  pollId: string;
}) {
  const space = await getActiveSpace();
  const poll = await getPollQrVotingData({
    groupId,
    pollId,
    spaceId: space.id,
  });

  if (!poll || !poll.pollGroup) {
    notFound();
  }

  return poll;
}
