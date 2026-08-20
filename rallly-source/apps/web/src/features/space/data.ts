import "server-only";

import type {
  SpaceMemberRole as DBSpaceMemberRole,
  SpaceTier as DBSpaceTier,
  Prisma,
} from "@rallly/database";
import { prisma } from "@rallly/database";
import { createLogger } from "@rallly/logger";
import { cache } from "react";

import { getSpaceSubscription } from "@/features/billing/data";
import { cached_getInstanceLicense } from "@/features/licensing/data";
import type { LicenseType } from "@/features/licensing/schema";
import type { MemberDTO } from "@/features/space/member/types";
import { effectiveSpaceMemberWhere } from "@/features/space/member/utils";
import type { AuthorizedSpaceId, SpaceDTO } from "@/features/space/types";
import { fromDBRole } from "@/features/space/utils";
import { isSelfHosted } from "@/lib/constants";
import { AppError } from "@/lib/errors/app-error";

const logger = createLogger("space/data");

function createMemberDTO(member: {
  id: string;
  userId: string;
  spaceId: string;
  role: DBSpaceMemberRole;
  space: {
    ownerId: string;
  };
  user: {
    name: string;
    email: string;
    image?: string | null;
  };
}) {
  return {
    id: member.id,
    name: member.user.name,
    userId: member.userId,
    spaceId: member.spaceId,
    email: member.user.email,
    image: member.user.image ?? undefined,
    role: fromDBRole(member.role),
    isOwner: member.userId === member.space.ownerId,
  } satisfies MemberDTO;
}

export async function getSpaceSeatCount(spaceId: string) {
  return await prisma.spaceMember.count({
    where: {
      spaceId: spaceId,
    },
  });
}

export async function listAllSpaces({
  page,
  pageSize,
  q,
}: {
  page: number;
  pageSize: number;
  q?: string;
}) {
  const where: Prisma.SpaceWhereInput | undefined = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { owner: { name: { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
        ],
      }
    : undefined;

  const [spaces, total] = await Promise.all([
    prisma.space.findMany({
      ...(where ? { where } : {}),
      select: {
        id: true,
        name: true,
        image: true,
        tier: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            isAnonymous: true,
          },
        },
        _count: {
          select: {
            members: true,
            polls: true,
            pollGroups: true,
            scheduledEvents: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.space.count({ ...(where ? { where } : {}) }),
  ]);

  return { spaces, total };
}

export function getAllSpaceCount() {
  return prisma.space.count();
}

/**
 * Default seat limit for spaces without active subscriptions
 */
const DEFAULT_SEAT_LIMIT = 999999;
const MAX_SEAT_LIMIT = 999999;

/**
 * Returns the seat limit for self-hosted instances based on license type
 */
function getSelfHostedSeatLimit(licenseType: LicenseType | null): number {
  if (!licenseType) {
    return DEFAULT_SEAT_LIMIT;
  }

  switch (licenseType) {
    case "PLUS":
      return 5;
    case "ORGANIZATION":
      return 50;
    case "ENTERPRISE":
      return MAX_SEAT_LIMIT;
    default:
      return DEFAULT_SEAT_LIMIT;
  }
}

/**
 * Gets the total number of seats available for a space
 * Handles both cloud-hosted (Stripe subscription) and self-hosted (license-based) deployments
 */
export async function getTotalSeatsForSpace(spaceId: string): Promise<number> {
  try {
    if (isSelfHosted) {
      // For self-hosted instances, get seat limit from instance license
      const license = await cached_getInstanceLicense();

      if (!license) {
        // No license found, return default limit
        return DEFAULT_SEAT_LIMIT;
      }

      // If license has explicit seats defined, use that
      if (license.seats && license.seats > 0) {
        return Math.min(license.seats, MAX_SEAT_LIMIT);
      }

      // Otherwise, use the license type to determine seat limit
      return getSelfHostedSeatLimit(license.type);
    } else {
      // For cloud-hosted instances, get seat count from Stripe subscription
      const subscription = await getSpaceSubscription(spaceId);

      if (!subscription || !subscription.active) {
        // Return default limit for spaces without active subscriptions
        return DEFAULT_SEAT_LIMIT;
      }

      return subscription.quantity || DEFAULT_SEAT_LIMIT;
    }
  } catch (error) {
    logger.error({ error, spaceId }, "Failed to get total seats for space");

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve seat information",
      cause: error,
    });
  }
}

export async function getSpaceSeatAvailability(spaceIds: string[]) {
  const spaces = await prisma.space.findMany({
    where: { id: { in: spaceIds } },
    select: {
      id: true,
      name: true,
      _count: { select: { members: true } },
    },
  });

  return Promise.all(
    spaces.map(async (space) => ({
      id: space.id,
      name: space.name,
      usedSeats: space._count.members,
      totalSeats: await getTotalSeatsForSpace(space.id),
    })),
  );
}

export function createSpaceDTO(space: {
  id: string;
  ownerId: string;
  name: string;
  role: DBSpaceMemberRole;
  image?: string | null;
  tier: DBSpaceTier;
  primaryColor?: string | null;
  showBranding: boolean;
  hideAttribution: boolean;
  memberCount: number;
  seatCount: number;
}): SpaceDTO {
  return {
    id: space.id as AuthorizedSpaceId,
    name: space.name,
    ownerId: space.ownerId,
    tier: isSelfHosted ? "pro" : space.tier,
    role: fromDBRole(space.role),
    memberCount: space.memberCount,
    seatCount: space.seatCount,
    image: space.image ?? undefined,
    primaryColor: space.primaryColor ?? undefined,
    showBranding: space.showBranding,
    hideAttribution: space.hideAttribution,
  };
}

export const getMember = async (id: string) => {
  const member = await prisma.spaceMember.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
      spaceId: true,
      role: true,
      space: {
        select: {
          ownerId: true,
        },
      },
      user: {
        select: {
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  return createMemberDTO(member);
};

export function getSpaceBranding(spaceId: string) {
  return prisma.space.findUnique({
    where: { id: spaceId },
    select: {
      name: true,
      image: true,
      showBranding: true,
      primaryColor: true,
    },
  });
}

export const getOwnedSpace = cache(async (userId: string) => {
  return prisma.space.findFirst({
    where: { ownerId: userId },
    select: { id: true },
  });
});

export const listSpacesForUser = cache(async (userId: string) => {
  const result = await prisma.spaceMember.findMany({
    where: effectiveSpaceMemberWhere({ userId }),
    select: {
      role: true,
      space: {
        select: {
          id: true,
          name: true,
          image: true,
          ownerId: true,
          tier: true,
          primaryColor: true,
          showBranding: true,
          hideAttribution: true,
          _count: { select: { members: true } },
          subscriptions: {
            where: { active: true },
            select: { quantity: true },
            take: 1,
          },
        },
      },
    },
  });

  return result.map((spaceMember) =>
    createSpaceDTO({
      ...spaceMember.space,
      role: spaceMember.role,
      memberCount: spaceMember.space._count.members,
      seatCount: spaceMember.space.subscriptions[0]?.quantity ?? 1,
    }),
  );
});

export const getActiveSpaceForUser = cache(async (userId: string) => {
  const spaceMember = await prisma.spaceMember.findFirst({
    where: effectiveSpaceMemberWhere({ userId }),
    orderBy: {
      lastSelectedAt: "desc",
    },
    include: {
      space: {
        include: {
          _count: { select: { members: true } },
          subscriptions: {
            where: { active: true },
            select: { quantity: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!spaceMember) {
    return null;
  }

  return createSpaceDTO({
    ...spaceMember.space,
    role: spaceMember.role,
    memberCount: spaceMember.space._count.members,
    seatCount: spaceMember.space.subscriptions[0]?.quantity ?? 1,
  });
});
