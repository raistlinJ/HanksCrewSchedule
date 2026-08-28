"use server";

import * as z from "zod";
import { adoptOrphanedPolls } from "@/features/poll/mutations";
import { getAnySpaceMembership, getOwnedSpace } from "@/features/space/data";
import { listPendingSpaceInvites } from "@/features/space/member/data";
import { createSpace } from "@/features/space/mutations";
import { AppError } from "@/lib/errors/app-error";
import { identifyGroup, track } from "@/lib/posthog";
import { authActionClient } from "@/lib/safe-action/server";

const setupSpaceSchema = z.union([
  z.object({ createSpace: z.literal(false) }),
  z.object({
    createSpace: z.literal(true),
    spaceType: z.literal("personal"),
  }),
  z.object({
    createSpace: z.literal(true),
    spaceType: z.literal("work"),
    organizationName: z.string().min(1).max(100),
  }),
]);

/**
 * Completes space onboarding. Existing members and users with a pending
 * invitation do not get a Personal space as a side effect of completing
 * their profile. A user with neither must explicitly choose the first space
 * to create.
 */
export const setupSpaceAction = authActionClient
  .metadata({ actionName: "setup_space" })
  .inputSchema(setupSpaceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const [ownedSpace, membership, pendingInvites] = await Promise.all([
      getOwnedSpace(ctx.user.id),
      getAnySpaceMembership(ctx.user.id),
      listPendingSpaceInvites(ctx.user.email),
    ]);
    const existingSpaceId = ownedSpace?.id ?? membership?.spaceId;

    if (existingSpaceId) {
      // Create and adopt aren't atomic: a previous submit may have created
      // the space and failed before adoption, so retries still pull
      // orphaned polls in (a no-op when there are none).
      await adoptOrphanedPolls({
        userId: ctx.user.id,
        spaceId: existingSpaceId,
      });
      return;
    }

    if (pendingInvites.length > 0) {
      return;
    }

    // Do not trust the client to decide that it can skip space creation. An
    // invitation may have been cancelled after the setup page rendered.
    if (!parsedInput.createSpace) {
      throw new AppError({
        code: "SETUP_REQUIRED",
        message: "Create a space before continuing",
      });
    }

    const name =
      parsedInput.spaceType === "work"
        ? parsedInput.organizationName
        : "Personal";

    const space = await createSpace({
      name,
      ownerId: ctx.user.id,
    });

    // Guest linking migrates polls without a space; pull them into the one
    // just created.
    await adoptOrphanedPolls({
      userId: ctx.user.id,
      spaceId: space.id,
    });

    identifyGroup({
      distinctId: ctx.user.id,
      groupType: "space",
      groupKey: space.id,
      properties: {
        type: parsedInput.spaceType,
        name,
        tier: space.tier,
        member_count: 1,
        seat_count: 1,
      },
    });

    track(ctx.user, {
      event: "space_setup",
      properties: {
        space_type: parsedInput.spaceType,
        // The register event $sets these from the user row at creation
        // time, which for OTP signups is an empty name and no timezone.
        // The form updates both right before this action runs, so patch
        // the person profile here.
        $set: {
          name: ctx.user.name,
          timeZone: ctx.user.timeZone ?? undefined,
        },
      },
      groups: {
        space: space.id,
      },
    });
  });
