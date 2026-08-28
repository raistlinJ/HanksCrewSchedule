import "server-only";

import { prisma } from "@rallly/database";
import { getTotalSeatsForSpace } from "@/features/space/data";

/**
 * Claims every invite an administrator marked for automatic acceptance.
 * Membership creation and invite deletion are atomic, and existing
 * memberships are treated as already claimed.
 */
export async function claimAutoAcceptedSpaceInvites({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  return prisma.$transaction(async (tx) => {
    const invites = await tx.spaceMemberInvite.findMany({
      where: {
        autoAccept: true,
        email: { equals: email, mode: "insensitive" },
      },
      select: {
        id: true,
        spaceId: true,
        role: true,
      },
    });

    if (invites.length === 0) {
      return 0;
    }

    const claimedInviteIds: string[] = [];

    for (const invite of invites) {
      const existingMember = await tx.spaceMember.findUnique({
        where: {
          spaceId_userId: { spaceId: invite.spaceId, userId },
        },
        select: { id: true },
      });

      if (existingMember) {
        claimedInviteIds.push(invite.id);
        continue;
      }

      const [usedSeats, totalSeats] = await Promise.all([
        tx.spaceMember.count({ where: { spaceId: invite.spaceId } }),
        getTotalSeatsForSpace(invite.spaceId),
      ]);

      // A seat was available when the override was created, but another
      // member may have joined since. Leave the invite pending in that race.
      if (usedSeats >= totalSeats) {
        continue;
      }

      await tx.spaceMember.upsert({
        where: {
          spaceId_userId: { spaceId: invite.spaceId, userId },
        },
        create: {
          spaceId: invite.spaceId,
          userId,
          role: invite.role,
        },
        update: {},
      });
      claimedInviteIds.push(invite.id);
    }

    if (claimedInviteIds.length > 0) {
      await tx.spaceMemberInvite.deleteMany({
        where: { id: { in: claimedInviteIds } },
      });
    }

    return claimedInviteIds.length;
  });
}
