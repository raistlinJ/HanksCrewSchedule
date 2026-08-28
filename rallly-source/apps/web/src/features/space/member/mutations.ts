import "server-only";

import { prisma } from "@rallly/database";
import { sendSpaceInviteEmail } from "@rallly/emails/templates/space-invite";
import { createLogger } from "@rallly/logger";
import { absoluteUrl } from "@rallly/utils/absolute-url";
import { getInstanceBranding } from "@/emails/branding";
import { getTotalSeatsForSpace } from "@/features/space/data";
import type { MemberRole } from "@/features/space/schema";
import { toDBRole } from "@/features/space/utils";
import { setActiveSpace } from "@/features/user/mutations";

const logger = createLogger("space/member/mutations");

export async function inviteMember({
  spaceId,
  spaceName,
  email,
  role,
  inviter,
}: {
  spaceId: string;
  spaceName: string;
  email: string;
  role: MemberRole;
  inviter: { id: string; name: string; locale?: string };
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberOf: {
        where: { spaceId },
      },
    },
  });

  if (existingUser?.memberOf && existingUser.memberOf.length > 0) {
    return { ok: false as const, reason: "ALREADY_MEMBER" as const };
  }

  const existingInvite = await prisma.spaceMemberInvite.findUnique({
    where: {
      spaceId_email: { spaceId, email },
    },
  });

  if (existingInvite) {
    if (existingInvite.role !== toDBRole(role)) {
      await prisma.spaceMemberInvite.update({
        where: { id: existingInvite.id },
        data: { role: toDBRole(role) },
      });

      return { ok: true as const, code: "INVITE_UPDATED" as const };
    }

    return { ok: false as const, reason: "INVITE_PENDING" as const };
  }

  // Seat availability only gates new invites
  const [usedSeats, totalSeats] = await Promise.all([
    prisma.spaceMember.count({ where: { spaceId } }),
    getTotalSeatsForSpace(spaceId),
  ]);

  if (usedSeats >= totalSeats) {
    return { ok: false as const, reason: "NOT_ENOUGH_SEATS" as const };
  }

  const invite = await prisma.spaceMemberInvite.create({
    data: {
      spaceId,
      email,
      role: toDBRole(role),
      inviterId: inviter.id,
    },
  });

  let delivery: Awaited<ReturnType<typeof sendSpaceInviteEmail>>;
  try {
    delivery = await sendSpaceInviteEmail({
      to: email,
      locale: existingUser?.locale ?? inviter.locale,
      branding: await getInstanceBranding(),
      props: {
        spaceName,
        inviterName: inviter.name,
        spaceRole: role,
        inviteUrl: absoluteUrl(`/accept-invite/${invite.id}`),
      },
    });
  } catch (error) {
    logger.error(
      { error, inviteId: invite.id },
      "Failed to render space invitation email",
    );
    await prisma.spaceMemberInvite.delete({ where: { id: invite.id } });
    return { ok: false as const, reason: "INVITE_FAILED" as const };
  }

  if (!delivery.ok) {
    logger.warn(
      { inviteId: invite.id, reason: delivery.reason },
      "Space invitation email was not delivered",
    );
    await prisma.spaceMemberInvite.delete({ where: { id: invite.id } });
    return { ok: false as const, reason: "INVITE_FAILED" as const };
  }

  return { ok: true as const, code: "INVITE_SENT" as const };
}

/**
 * Adds an existing account directly to a space, or marks an invitation for
 * automatic acceptance when the account is created. In either case the user
 * can use the normal login page without opening an invitation link.
 */
export async function overrideAcceptInvite({
  spaceId,
  email,
  role,
  inviterId,
}: {
  spaceId: string;
  email: string;
  role: MemberRole;
  inviterId: string;
}) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  const result = await prisma.$transaction(async (tx) => {
    if (user) {
      const existingMember = await tx.spaceMember.findUnique({
        where: {
          spaceId_userId: { spaceId, userId: user.id },
        },
        select: { id: true },
      });

      if (existingMember) {
        return { ok: false as const, reason: "ALREADY_MEMBER" as const };
      }
    }

    const [usedSeats, totalSeats] = await Promise.all([
      tx.spaceMember.count({ where: { spaceId } }),
      getTotalSeatsForSpace(spaceId),
    ]);

    if (usedSeats >= totalSeats) {
      return { ok: false as const, reason: "NOT_ENOUGH_SEATS" as const };
    }

    if (!user) {
      const existingInvite = await tx.spaceMemberInvite.findFirst({
        where: {
          spaceId,
          email: { equals: normalizedEmail, mode: "insensitive" },
        },
        select: { id: true },
      });

      if (existingInvite) {
        await tx.spaceMemberInvite.update({
          where: { id: existingInvite.id },
          data: {
            role: toDBRole(role),
            inviterId,
            autoAccept: true,
          },
        });
      } else {
        await tx.spaceMemberInvite.create({
          data: {
            spaceId,
            email: normalizedEmail,
            role: toDBRole(role),
            inviterId,
            autoAccept: true,
          },
        });
      }

      return {
        ok: true as const,
        code: "AUTO_ACCEPT_PENDING" as const,
        memberCount: usedSeats,
      };
    }

    await tx.spaceMember.create({
      data: { spaceId, userId: user.id, role: toDBRole(role) },
    });

    // Clear an earlier email invitation, including one whose casing differs
    // from the normalized account email.
    await tx.spaceMemberInvite.deleteMany({
      where: {
        spaceId,
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
    });

    return {
      ok: true as const,
      code: "MEMBER_ADDED" as const,
      memberCount: usedSeats + 1,
      userId: user.id,
    };
  });

  if (!result.ok) {
    return result;
  }

  if (result.code === "MEMBER_ADDED") {
    try {
      await setActiveSpace({ userId: result.userId, spaceId });
    } catch (error) {
      logger.warn(
        { error, spaceId, userId: result.userId },
        "Failed to activate space after overriding invite acceptance",
      );
    }
  }

  return result;
}

export async function acceptInvite({
  spaceId,
  user,
}: {
  spaceId: string;
  user: { id: string; email: string };
}) {
  const invite = await prisma.spaceMemberInvite.findUnique({
    where: {
      spaceId_email: { spaceId, email: user.email },
    },
  });

  if (!invite) {
    return { ok: false as const, reason: "INVITE_NOT_FOUND" as const };
  }

  const result = await prisma.$transaction(async (tx) => {
    const [usedSeats, totalSeats] = await Promise.all([
      tx.spaceMember.count({ where: { spaceId } }),
      getTotalSeatsForSpace(spaceId),
    ]);

    if (usedSeats >= totalSeats) {
      return { ok: false as const, reason: "NOT_ENOUGH_SEATS" as const };
    }

    await tx.spaceMember.create({
      data: {
        spaceId,
        userId: user.id,
        role: invite.role,
      },
    });

    await tx.spaceMemberInvite.delete({
      where: { id: invite.id },
    });

    return { ok: true as const, memberCount: usedSeats + 1 };
  });

  if (!result.ok) {
    return result;
  }

  try {
    await setActiveSpace({ userId: user.id, spaceId });
  } catch (error) {
    logger.warn({ error }, "Failed to update user's active space");
  }

  return result;
}

export async function cancelInvite({ inviteId }: { inviteId: string }) {
  await prisma.spaceMemberInvite.delete({
    where: { id: inviteId },
  });
}

export async function removeMember({ memberId }: { memberId: string }) {
  const removedMember = await prisma.spaceMember.delete({
    where: { id: memberId },
  });

  const memberCount = await prisma.spaceMember.count({
    where: { spaceId: removedMember.spaceId },
  });

  return { removedUserId: removedMember.userId, memberCount };
}

export async function changeMemberRole({
  memberId,
  role,
}: {
  memberId: string;
  role: MemberRole;
}) {
  await prisma.spaceMember.update({
    where: { id: memberId },
    data: { role: toDBRole(role) },
  });
}
