import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getPollQrVotingData,
  getPollStatusCounts,
  getPublicPollMetadata,
  hasPollAdminAccess,
} from "@/features/poll/data";
import { getActiveSpace } from "@/features/space/loaders";
import { requireUser } from "@/features/user/loaders";

export const loadPollStatusCounts = cache(async () => {
  const space = await getActiveSpace();
  return getPollStatusCounts({ spaceId: space.id });
});

export const loadPublicPollMetadata = cache(async (urlId: string) => {
  const poll = await getPublicPollMetadata(urlId);

  if (!poll || poll.deleted || poll.user?.banned) {
    notFound();
  }

  return poll;
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

export async function loadManagedPollForQrVoting({
  pollId,
}: {
  pollId: string;
}) {
  const user = await requireUser();

  if (!(await hasPollAdminAccess(pollId, user.id))) {
    notFound();
  }

  const poll = await getPollQrVotingData({ pollId });

  if (!poll) {
    notFound();
  }

  return poll;
}
