import "server-only";

import type { Prisma } from "@rallly/database";
import { prisma } from "@rallly/database";
import { nanoid } from "@rallly/utils/nanoid";
import { validateAuxiliaryVotes } from "@/features/poll/auxiliary-selection/mutations";
import { assertYesCapacity } from "@/features/poll/yes-capacity/mutations";
import type { AuthorizedSpaceId } from "@/features/space/types";

export type PollOption = {
  startTime: Date;
  duration: number;
};

export type CreatePollParams = {
  userId: string;
  title: string;
  description?: string;
  location?: string;
  timeZone?: string;
  requireParticipantEmail?: boolean;
  hideParticipants?: boolean;
  hideScores?: boolean;
  disableComments?: boolean;
  options: PollOption[];
  spaceId: AuthorizedSpaceId;
};

type PollRespondentUserClient = {
  user: Pick<Prisma.TransactionClient["user"], "upsert">;
};

export async function upsertPollRespondentUser({
  tx,
  name,
  email,
}: {
  tx: PollRespondentUserClient;
  name: string;
  email: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await tx.user.upsert({
    where: { email: normalizedEmail },
    create: {
      name,
      email: normalizedEmail,
      emailVerified: false,
      role: "user",
    },
    update: {},
    select: {
      id: true,
      banned: true,
      deletedAt: true,
      isAnonymous: true,
    },
  });

  if (user.banned || user.deletedAt || user.isAnonymous) {
    return { ok: false, reason: "user_unavailable" } as const;
  }

  return {
    ok: true,
    userId: user.id,
    email: normalizedEmail,
  } as const;
}

export async function resolvePollResponseUser({
  tx,
  sessionUser,
  name,
  email,
}: {
  tx: PollRespondentUserClient;
  sessionUser?: { id: string; isGuest?: boolean };
  name: string;
  email?: string;
}) {
  const normalizedEmail = email?.trim().toLowerCase() || null;

  if (normalizedEmail) {
    return upsertPollRespondentUser({
      tx,
      name,
      email: normalizedEmail,
    });
  }

  if (sessionUser) {
    return {
      ok: true,
      userId: sessionUser.id,
      email: null,
    } as const;
  }

  return { ok: false, reason: "user_unavailable" } as const;
}

export async function addUserAsPollParticipant({
  pollId,
  name,
  email,
}: {
  pollId: string;
  name: string;
  email: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();

  const existingParticipant = await prisma.participant.findFirst({
    where: {
      pollId,
      email: normalizedEmail,
      deleted: false,
    },
    select: { id: true },
  });

  if (existingParticipant) {
    return { ok: false, reason: "participant_exists" } as const;
  }

  return prisma.$transaction(async (tx) => {
    const user = await upsertPollRespondentUser({
      tx,
      name,
      email: normalizedEmail,
    });

    if (!user.ok) {
      return user;
    }

    const participant = await tx.participant.create({
      data: {
        pollId,
        name,
        email: normalizedEmail,
        userId: user.userId,
      },
      select: { id: true },
    });
    const auxiliaryVotes = await validateAuxiliaryVotes({
      tx,
      pollId,
      votes: [],
      enforceMinimum: false,
    });
    if (auxiliaryVotes.length > 0) {
      await tx.pollAuxiliaryVote.createMany({
        data: auxiliaryVotes.map(({ auxiliaryOptionId, type }) => ({
          participantId: participant.id,
          auxiliaryOptionId,
          pollId,
          type,
        })),
      });
    }

    return {
      ok: true,
      participantId: participant.id,
      userId: user.userId,
    } as const;
  });
}

export async function addUserAsPollGroupParticipant({
  pollIds,
  name,
  email,
}: {
  pollIds: string[];
  name: string;
  email?: string;
}) {
  const uniquePollIds = Array.from(new Set(pollIds));
  const normalizedEmail = email?.trim().toLowerCase() || null;

  return prisma.$transaction(async (tx) => {
    let userId: string | null = null;

    if (normalizedEmail) {
      const user = await upsertPollRespondentUser({
        tx,
        name,
        email: normalizedEmail,
      });

      if (!user.ok) {
        return user;
      }

      userId = user.userId;
    }

    const existingParticipants = await tx.participant.findMany({
      where: {
        pollId: { in: uniquePollIds },
        deleted: false,
        ...(normalizedEmail
          ? { email: { equals: normalizedEmail, mode: "insensitive" } }
          : { name, email: null }),
      },
      select: { id: true, pollId: true },
    });
    const existingPollIds = new Set(
      existingParticipants.map((participant) => participant.pollId),
    );

    if (normalizedEmail && existingParticipants.length > 0) {
      await tx.participant.updateMany({
        where: {
          id: { in: existingParticipants.map((participant) => participant.id) },
        },
        data: { name, email: normalizedEmail, userId },
      });
    }

    const participantIds = existingParticipants.map(
      (participant) => participant.id,
    );
    const createdParticipantIds: string[] = [];
    for (const pollId of uniquePollIds) {
      if (existingPollIds.has(pollId)) {
        continue;
      }

      const participant = await tx.participant.create({
        data: {
          pollId,
          name,
          email: normalizedEmail,
          userId,
        },
        select: { id: true },
      });
      participantIds.push(participant.id);
      createdParticipantIds.push(participant.id);

      const auxiliaryVotes = await validateAuxiliaryVotes({
        tx,
        pollId,
        votes: [],
        enforceMinimum: false,
      });
      if (auxiliaryVotes.length > 0) {
        await tx.pollAuxiliaryVote.createMany({
          data: auxiliaryVotes.map(({ auxiliaryOptionId, type }) => ({
            participantId: participant.id,
            auxiliaryOptionId,
            pollId,
            type,
          })),
        });
      }
    }

    return {
      ok: true,
      participantIds,
      createdParticipantIds,
      userId,
    } as const;
  });
}

export async function removePollParticipantsFromResults({
  participantIds,
  pollIds,
}: {
  participantIds: string[];
  pollIds: string[];
}) {
  return prisma.participant.updateMany({
    where: {
      id: { in: participantIds },
      pollId: { in: pollIds },
      deleted: false,
    },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  });
}

export async function markUserYesForPoll({
  groupId,
  pollId,
  qrCodeToken,
  spaceId,
}: {
  groupId?: string;
  pollId: string;
  qrCodeToken: string;
  spaceId?: AuthorizedSpaceId;
}) {
  const [poll, user] = await Promise.all([
    prisma.poll.findFirst({
      where: {
        id: pollId,
        ...(groupId ? { pollGroupId: groupId } : {}),
        ...(spaceId ? { spaceId } : {}),
        deleted: false,
      },
      select: { id: true, options: { select: { id: true } } },
    }),
    prisma.user.findUnique({
      where: { qrCodeToken },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        banned: true,
        deletedAt: true,
        isAnonymous: true,
      },
    }),
  ]);

  if (!poll) {
    return { ok: false, reason: "poll_not_found" } as const;
  }

  if (poll.options.length === 0) {
    return { ok: false, reason: "poll_has_no_options" } as const;
  }

  if (!user || user.banned || user.deletedAt || user.isAnonymous) {
    return { ok: false, reason: "invalid_qr_code" } as const;
  }

  let participant = await prisma.participant.findFirst({
    where: { pollId, userId: user.id, deleted: false },
    select: {
      id: true,
      votes: { select: { optionId: true, type: true } },
    },
  });

  participant ??= await prisma.participant.findFirst({
    where: { pollId, email: user.email, deleted: false },
    select: {
      id: true,
      votes: { select: { optionId: true, type: true } },
    },
  });

  const votesByOption = new Map(
    participant?.votes.map((vote) => [vote.optionId, vote.type]),
  );
  const alreadyYes = poll.options.every(
    (option) => votesByOption.get(option.id) === "yes",
  );

  const participantId = await prisma.$transaction(async (tx) => {
    await assertYesCapacity({
      tx,
      pollId,
      participantId: participant?.id,
      optionIds: poll.options.map((option) => option.id),
    });

    const savedParticipant = participant
      ? await tx.participant.update({
          where: { id: participant.id },
          data: {
            name: user.name,
            email: user.email,
            userId: user.id,
          },
          select: { id: true },
        })
      : await tx.participant.create({
          data: {
            name: user.name,
            email: user.email,
            userId: user.id,
            pollId,
          },
          select: { id: true },
        });

    const auxiliaryVotes = await validateAuxiliaryVotes({
      tx,
      pollId,
      votes: [],
      participantId: savedParticipant.id,
      enforceMinimum: false,
    });
    await Promise.all(
      auxiliaryVotes.map((vote) =>
        tx.pollAuxiliaryVote.upsert({
          where: {
            participantId_auxiliaryOptionId: {
              participantId: savedParticipant.id,
              auxiliaryOptionId: vote.auxiliaryOptionId,
            },
          },
          create: {
            participantId: savedParticipant.id,
            auxiliaryOptionId: vote.auxiliaryOptionId,
            pollId,
            type: vote.type,
          },
          update: {},
        }),
      ),
    );

    await Promise.all(
      poll.options.map((option) =>
        tx.vote.upsert({
          where: {
            participantId_optionId: {
              participantId: savedParticipant.id,
              optionId: option.id,
            },
          },
          create: {
            participantId: savedParticipant.id,
            optionId: option.id,
            pollId,
            type: "yes",
          },
          update: { type: "yes" },
        }),
      ),
    );

    return savedParticipant.id;
  });

  return {
    ok: true,
    alreadyYes,
    voter: {
      id: participantId,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? undefined,
    },
  } as const;
}

export const createPoll = async ({
  userId,
  title,
  description,
  location,
  timeZone,
  requireParticipantEmail,
  hideParticipants,
  hideScores,
  disableComments,
  options,
  spaceId,
}: CreatePollParams) => {
  const kind = options.some((o) => o.duration > 0) ? "time" : "date";

  const poll = await prisma.poll.create({
    data: {
      id: nanoid(),
      title,
      description,
      location,
      timeZone,
      requireParticipantEmail,
      hideParticipants,
      hideScores,
      disableComments,
      userId,
      spaceId,
      kind,
      options: { createMany: { data: options } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      timeZone: true,
      status: true,
      createdAt: true,
      disableComments: true,
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      options: {
        select: {
          id: true,
          startTime: true,
          duration: true,
        },
        orderBy: {
          startTime: "asc",
        },
      },
    },
  });

  return poll;
};

const pollResponseSelect = {
  id: true,
  title: true,
  description: true,
  location: true,
  timeZone: true,
  status: true,
  createdAt: true,
  user: {
    select: {
      name: true,
      image: true,
    },
  },
  options: {
    select: {
      id: true,
      startTime: true,
      duration: true,
    },
    orderBy: {
      startTime: "asc",
    },
  },
} satisfies Prisma.PollSelect;

/**
 * Closes a poll manually. Idempotent: closing an already-closed poll returns
 * the poll unchanged without altering its `closedReason` (so a poll auto-closed
 * by the cron job keeps `closedReason: "auto"`). Returns `null` when the poll
 * does not exist in the space, letting the caller surface a 404.
 */
export const closePoll = async ({
  pollId,
  spaceId,
}: {
  pollId: string;
  spaceId: AuthorizedSpaceId;
}) => {
  const poll = await prisma.poll.findFirst({
    where: {
      id: pollId,
      spaceId,
      deletedAt: null,
    },
    select: pollResponseSelect,
  });

  if (!poll) {
    return null;
  }

  if (poll.status === "closed") {
    return poll;
  }

  return prisma.poll.update({
    where: { id: pollId },
    data: { status: "closed", closedReason: "manual" },
    select: pollResponseSelect,
  });
};

/**
 * Muting is a per-owner notification preference, so the scope is the owner's
 * userId rather than a space.
 */
export const setPollMuted = async ({
  pollId,
  userId,
  muted,
}: {
  pollId: string;
  userId: string;
  muted: boolean;
}) => {
  const { count } = await prisma.poll.updateMany({
    where: {
      id: pollId,
      userId,
      deletedAt: null,
    },
    data: { muted },
  });

  if (count === 0) {
    return { ok: false as const, reason: "notFound" as const };
  }

  return { ok: true as const };
};

export const setPollGroupMuted = async ({
  groupId,
  spaceId,
  muted,
}: {
  groupId: string;
  spaceId: AuthorizedSpaceId;
  muted: boolean;
}) => {
  const { count } = await prisma.poll.updateMany({
    where: {
      pollGroupId: groupId,
      spaceId,
      deleted: false,
    },
    data: { muted },
  });

  return { ok: true as const, updatedPolls: count };
};

export const deletePoll = async (
  pollId: string,
  spaceId: AuthorizedSpaceId,
) => {
  const poll = await prisma.poll.findFirst({
    where: {
      id: pollId,
      spaceId,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (!poll) {
    return null;
  }

  await prisma.poll.update({
    where: { id: pollId },
    data: { deleted: true, deletedAt: new Date() },
  });

  return { id: pollId };
};

/**
 * Assigns a user's space-less polls to the given space. Guest linking can
 * migrate polls before the user has a space (the linking runs ahead of
 * space provisioning on sign-up, and an existing account may have lost all
 * its spaces), so every place that creates a user's space adopts them.
 */
export async function adoptOrphanedPolls({
  userId,
  spaceId,
}: {
  userId: string;
  spaceId: string;
}) {
  await prisma.poll.updateMany({
    where: {
      userId,
      spaceId: null,
    },
    data: {
      spaceId,
    },
  });
}

/**
 * Marks inactive polls as deleted. A poll is inactive when every date has
 * passed at least 30 days ago and there has been no activity (poll edits,
 * participant responses, new comments) in the last 30 days. This guarantees
 * polls are kept for at least 30 days after their final date, and activity
 * extends that.
 * Only marks polls as deleted if they belong to spaces without an active
 * subscription or if they don't have a space associated with them.
 */
export async function deleteInactivePolls() {
  // Define the 30-day threshold once
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Mark inactive polls as deleted in a single query
  const { count: markedDeleted } = await prisma.poll.updateMany({
    where: {
      deleted: false,
      // All poll dates passed at least 30 days ago
      options: {
        none: {
          startTime: { gt: thirtyDaysAgo },
        },
      },
      // We don't delete polls that belong to a space with an active subscription
      OR: [
        { spaceId: null },
        {
          space: {
            tier: {
              not: "pro",
            },
          },
        },
      ],
      // Poll is inactive: not edited, and no participant activity (new or
      // updated responses) or new comments in the last 30 days
      updatedAt: { lt: thirtyDaysAgo },
      participants: {
        none: { updatedAt: { gte: thirtyDaysAgo } },
      },
      comments: {
        none: { createdAt: { gte: thirtyDaysAgo } },
      },
    },
    data: {
      deleted: true,
      deletedAt: new Date(),
    },
  });

  return markedDeleted;
}

/**
 * Closes polls whose options have all ended — i.e. no option ends in the
 * future, where an option ends at start_time + duration (all-day options, with
 * duration 0, are treated as ending 24h after their start). Closing is
 * non-destructive: the poll becomes read-only but is preserved.
 *
 * Raw SQL because the option-end comparison (start_time + duration) can't be
 * expressed in a Prisma `where`. It also deliberately does not touch
 * `updated_at`, so closing a poll doesn't reset the inactivity clock that
 * delete-inactive-polls keys off.
 */
export async function autoClosePolls() {
  const closed = await prisma.$executeRaw`
    UPDATE polls p
    SET status = 'closed', closed_reason = 'auto'
    WHERE p.status = 'open'
      AND p.deleted = false
      AND EXISTS (SELECT 1 FROM options o WHERE o.poll_id = p.id)
      AND NOT EXISTS (
        SELECT 1 FROM options o
        WHERE o.poll_id = p.id
          AND o.start_time + (CASE WHEN o.duration_minutes = 0
                THEN interval '24 hours'
                ELSE make_interval(mins => o.duration_minutes) END) > (now() AT TIME ZONE 'UTC')
      )
  `;

  return closed;
}

const REMOVE_DELETED_POLLS_BATCH_SIZE = 100;

/**
 * Remove polls and corresponding data that have been marked deleted for more than 7 days.
 */
export async function removeDeletedPolls() {
  // First get the ids of all the polls that have been marked as deleted for at least 7 days
  let totalDeletedPolls = 0;
  let hasMore = true;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  while (hasMore) {
    const batch = await prisma.poll.findMany({
      where: {
        deleted: true,
        deletedAt: {
          lt: sevenDaysAgo,
        },
      },
      select: { id: true },
      take: REMOVE_DELETED_POLLS_BATCH_SIZE,
    });

    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    const deleted = await prisma.poll.deleteMany({
      where: {
        id: { in: batch.map((poll) => poll.id) },
      },
    });

    totalDeletedPolls += deleted.count;
  }

  return totalDeletedPolls;
}
