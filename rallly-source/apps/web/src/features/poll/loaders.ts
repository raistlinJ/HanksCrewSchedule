import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getOnDemandPollTitles,
  getPollQrVotingData,
  getPollStatusCounts,
  getPublicPollGroupResults,
  getPublicPollMetadata,
  hasPollAdminAccess,
} from "@/features/poll/data";
import { getActiveSpace } from "@/features/space/loaders";
import { requireUser } from "@/features/user/loaders";

export const loadPollStatusCounts = cache(async () => {
  const space = await getActiveSpace();
  return getPollStatusCounts({ spaceId: space.id, isOnDemand: false });
});

export const loadOnDemandPollStatusCounts = cache(async () => {
  const space = await getActiveSpace();
  return getPollStatusCounts({ spaceId: space.id, isOnDemand: true });
});

export async function loadOnDemandPollTitles(input: {
  spaceId?: string;
  userId?: string;
}) {
  return getOnDemandPollTitles(input);
}

export const loadPublicPollMetadata = cache(async (urlId: string) => {
  const poll = await getPublicPollMetadata(urlId);

  if (!poll || poll.deleted || poll.user?.banned) {
    notFound();
  }

  return poll;
});

export const loadPublicPollResults = cache(async (urlId: string) => {
  const poll = await loadPublicPollMetadata(urlId);

  if (!poll.publicResults) {
    notFound();
  }

  return poll;
});

export const loadPublicPollGroupResults = cache(async (groupId: string) => {
  const group = await getPublicPollGroupResults(groupId);

  if (!group?.publicResults) {
    notFound();
  }

  group.polls.sort((a, b) => {
    const aIndex = group.pollOrder.indexOf(a.id);
    const bIndex = group.pollOrder.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return group;
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
