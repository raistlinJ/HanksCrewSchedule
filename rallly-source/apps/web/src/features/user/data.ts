import "server-only";

import type { User } from "@rallly/database";
import { prisma } from "@rallly/database";
import type { UserDTO } from "@/features/user/schema";
import type { UserResponseExportRow } from "./utils";

export const createUserDTO = (user: User): UserDTO => ({
  id: user.id,
  name: user.name,
  image: user.image ?? undefined,
  email: user.email,
  role: user.role,
  banned: user.banned,
  timeZone: user.timeZone || undefined,
  timeFormat: user.timeFormat ?? undefined,
  locale: user.locale ?? undefined,
  weekStart: user.weekStart ?? undefined,
  customerId: user.customerId ?? undefined,
  isGuest: user.isAnonymous,
  deletedAt: user.deletedAt ?? undefined,
});

export const getUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return null;
  }

  return createUserDTO(user);
};

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
}

export function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      image: true,
    },
  });
}

export const getUserCount = async () => {
  return await prisma.user.count({
    where: {
      isAnonymous: false,
    },
  });
};

export async function getUserPollResponses(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    return null;
  }

  const participantResponses = await prisma.participant.findMany({
    where: {
      deleted: false,
      poll: { deleted: false },
      OR: [
        { userId },
        {
          userId: null,
          email: {
            equals: user.email,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      userId: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      votes: {
        select: {
          id: true,
          optionId: true,
          type: true,
        },
      },
      auxiliaryVotes: {
        select: {
          id: true,
          auxiliaryOptionId: true,
          type: true,
        },
      },
      poll: {
        select: {
          id: true,
          title: true,
          status: true,
          kind: true,
          timeZone: true,
          pollGroup: {
            select: {
              id: true,
              title: true,
            },
          },
          options: {
            select: {
              id: true,
              startTime: true,
              duration: true,
              maxYes: true,
            },
            orderBy: { startTime: "asc" },
          },
          auxiliarySelection: {
            select: {
              name: true,
              minYes: true,
              maxYesSelections: true,
              options: {
                select: {
                  id: true,
                  label: true,
                  maxYes: true,
                },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // A response may predate account linking and use the same email. If both
  // records exist for one poll, the explicitly linked response is canonical.
  const responsesByPollId = new Map<
    string,
    (typeof participantResponses)[number]
  >();

  for (const response of participantResponses) {
    const current = responsesByPollId.get(response.poll.id);
    if (!current || (!current.userId && response.userId === userId)) {
      responsesByPollId.set(response.poll.id, response);
    }
  }

  return {
    user,
    responses: Array.from(responsesByPollId.values()).sort(
      (a, b) =>
        (b.updatedAt ?? b.createdAt).getTime() -
        (a.updatedAt ?? a.createdAt).getTime(),
    ),
  };
}

export async function getUserResponseExportRows(
  userIds: string[],
): Promise<UserResponseExportRow[]> {
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isAnonymous: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (users.length === 0) {
    return [];
  }

  const usersById = new Map(users.map((user) => [user.id, user]));
  const userIdByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user.id]),
  );
  const responses = await prisma.participant.findMany({
    where: {
      deleted: false,
      poll: { deleted: false },
      OR: [
        { userId: { in: users.map((user) => user.id) } },
        {
          userId: null,
          email: { in: users.map((user) => user.email), mode: "insensitive" },
        },
      ],
    },
    select: {
      userId: true,
      email: true,
      note: true,
      createdAt: true,
      updatedAt: true,
      votes: {
        select: {
          optionId: true,
          type: true,
        },
      },
      auxiliaryVotes: {
        select: {
          auxiliaryOptionId: true,
          type: true,
        },
      },
      poll: {
        select: {
          id: true,
          title: true,
          status: true,
          pollGroup: { select: { title: true } },
          options: {
            select: {
              id: true,
              startTime: true,
              duration: true,
              maxYes: true,
            },
            orderBy: { startTime: "asc" },
          },
          auxiliarySelection: {
            select: {
              name: true,
              minYes: true,
              maxYesSelections: true,
              options: {
                select: { id: true, label: true, maxYes: true },
                orderBy: { position: "asc" },
              },
            },
          },
        },
      },
    },
  });

  const canonicalResponses = new Map<
    string,
    { userId: string; response: (typeof responses)[number] }
  >();

  for (const response of responses) {
    const userId =
      (response.userId && usersById.has(response.userId)
        ? response.userId
        : null) ??
      (response.email
        ? userIdByEmail.get(response.email.toLowerCase())
        : undefined);

    if (!userId) {
      continue;
    }

    const key = `${userId}:${response.poll.id}`;
    const current = canonicalResponses.get(key);
    if (!current || (!current.response.userId && response.userId === userId)) {
      canonicalResponses.set(key, { userId, response });
    }
  }

  const rows: UserResponseExportRow[] = [];
  for (const { userId, response } of canonicalResponses.values()) {
    const user = usersById.get(userId);
    if (!user) {
      continue;
    }

    const votesByOptionId = new Map(
      response.votes.map((vote) => [vote.optionId, vote.type]),
    );
    const auxiliaryVotesByOptionId = new Map(
      response.auxiliaryVotes.map((vote) => [
        vote.auxiliaryOptionId,
        vote.type,
      ]),
    );
    const hasPrimaryYes = response.votes.some((vote) => vote.type === "yes");
    const common = {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      pollGroup: response.poll.pollGroup?.title ?? "",
      pollId: response.poll.id,
      pollTitle: response.poll.title,
      pollStatus: response.poll.status,
      note: response.note ?? "",
      responseUpdatedAt: (
        response.updatedAt ?? response.createdAt
      ).toISOString(),
      hasPrimaryYes: hasPrimaryYes ? "yes" : "no",
    };

    if (response.poll.options.length === 0) {
      rows.push({
        ...common,
        optionStart: "",
        durationMinutes: "",
        responseKind: "pollOption",
        response: "none",
      });
    } else {
      for (const option of response.poll.options) {
        rows.push({
          ...common,
          optionStart: option.startTime.toISOString(),
          durationMinutes: option.duration,
          optionMaxYes: option.maxYes ?? "",
          responseKind: "pollOption",
          response: votesByOptionId.get(option.id) ?? "none",
        });
      }
    }

    if (response.poll.auxiliarySelection) {
      for (const option of response.poll.auxiliarySelection.options) {
        rows.push({
          ...common,
          responseKind: "auxiliary",
          optionStart: "",
          durationMinutes: "",
          auxiliarySelection: response.poll.auxiliarySelection.name,
          auxiliaryMinYes: response.poll.auxiliarySelection.minYes,
          auxiliaryMaxYesSelections:
            response.poll.auxiliarySelection.maxYesSelections ?? "",
          auxiliaryOption: option.label,
          auxiliaryOptionMaxYes: option.maxYes ?? "",
          response: auxiliaryVotesByOptionId.get(option.id) ?? "ifNeedBe",
        });
      }
    }
  }

  return rows.sort(
    (a, b) =>
      a.userName.localeCompare(b.userName) ||
      a.pollTitle.localeCompare(b.pollTitle) ||
      a.optionStart.localeCompare(b.optionStart),
  );
}

export async function getUserDeletionDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      customerId: true,
      _count: {
        select: { subscriptions: { where: { active: true } } },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    email: user.email,
    customerId: user.customerId,
    hasActiveSubscription: user._count.subscriptions > 0,
  };
}

export const getUserHasPassword = async (userId: string) => {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "credential",
    },
  });
  return !!account;
};

export const getUserHasNoAccounts = async (userId: string) => {
  const accountCount = await prisma.account.count({
    where: {
      userId,
    },
  });
  return accountCount === 0;
};
