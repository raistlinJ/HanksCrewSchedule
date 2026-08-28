import "server-only";

import { prisma } from "@rallly/database";
import { effectiveSpaceMemberWhere } from "@/features/space/member/utils";

export async function getInvite(inviteId: string) {
  return prisma.spaceMemberInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      spaceId: true,
      email: true,
      role: true,
    },
  });
}

export async function listPendingSpaceInvites(email: string) {
  return prisma.spaceMemberInvite.findMany({
    where: {
      email: { equals: email, mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      spaceId: true,
    },
  });
}

export async function getAvailableSpaceMembership({
  userId,
  spaceId,
}: {
  userId: string;
  spaceId: string;
}) {
  return prisma.spaceMember.findFirst({
    where: {
      spaceId,
      ...effectiveSpaceMemberWhere({ userId }),
    },
    select: { id: true },
  });
}
