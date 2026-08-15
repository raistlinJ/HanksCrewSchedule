"use server";
import * as z from "zod";
import {
  cancelUserSubscriptions,
  deleteStripeCustomer,
} from "@/features/billing/mutations";
import { getSpaceSeatAvailability } from "@/features/space/data";
import {
  getUserByEmail,
  getUserDeletionDetails,
  getUserResponseExportRows,
} from "@/features/user/data";
import {
  createUser,
  hardDeleteUser,
  updateUserPollResponse,
} from "@/features/user/mutations";
import { createUserResponsesCsv } from "@/features/user/utils";
import { AppError } from "@/lib/errors/app-error";
import { deletePostHogPerson } from "@/lib/posthog";
import { adminActionClient } from "@/lib/safe-action/server";

// Route-private because deleting a user spans features: the app layer may
// import user and billing together, the user feature may not import billing.
export const deleteUserAction = adminActionClient
  .metadata({ actionName: "delete_user" })
  .inputSchema(
    z.object({
      userId: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const userId = parsedInput.userId;

    const user = await getUserDeletionDetails(userId);

    if (!user) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    if (user.hasActiveSubscription) {
      throw new AppError({
        code: "FORBIDDEN",
        message: "User has active subscriptions",
      });
    }

    // Same external-store cleanup as the account deletion reaper so Stripe
    // and PostHog records don't outlive the account.
    await cancelUserSubscriptions({ userId });

    if (user.customerId) {
      await deleteStripeCustomer({ customerId: user.customerId });
    }

    await deletePostHogPerson({ distinctId: userId });

    await hardDeleteUser({ userId });

    return {
      success: true,
    };
  });

export const updateUserPollResponseAction = adminActionClient
  .metadata({ actionName: "update_user_poll_response" })
  .inputSchema(
    z.object({
      userId: z.string(),
      participantId: z.string(),
      pollId: z.string(),
      optionId: z.string(),
      type: z.enum(["yes", "no", "ifNeedBe"]).nullable(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const result = await updateUserPollResponse(parsedInput);

    if (!result.ok) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "User poll response not found",
      });
    }

    return result;
  });

export const addUserAction = adminActionClient
  .metadata({ actionName: "add_user" })
  .inputSchema(
    z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().toLowerCase().pipe(z.email()),
      role: z.enum(["user", "admin"]),
      spaceIds: z.array(z.string()).max(100),
    }),
  )
  .action(async ({ parsedInput }) => {
    if (await getUserByEmail(parsedInput.email)) {
      return { success: false, reason: "email_exists" } as const;
    }

    const uniqueSpaceIds = Array.from(new Set(parsedInput.spaceIds));
    const spaces = await getSpaceSeatAvailability(uniqueSpaceIds);

    if (spaces.length !== uniqueSpaceIds.length) {
      throw new AppError({
        code: "NOT_FOUND",
        message: "One or more selected spaces were not found",
      });
    }

    const fullSpaces = spaces.filter(
      (space) => space.usedSeats >= space.totalSeats,
    );

    if (fullSpaces.length > 0) {
      return {
        success: false,
        reason: "spaces_full",
        spaceNames: fullSpaces.map((space) => space.name),
      } as const;
    }

    const user = await createUser({
      name: parsedInput.name,
      email: parsedInput.email,
      emailVerified: false,
      role: parsedInput.role,
      spaceIds: uniqueSpaceIds,
    });

    if (!user) {
      return { success: false, reason: "email_exists" } as const;
    }

    return { success: true, userId: user.id } as const;
  });

export const exportUserResponsesAction = adminActionClient
  .metadata({ actionName: "export_user_responses" })
  .inputSchema(
    z.object({
      userIds: z.array(z.string()).min(1).max(100),
    }),
  )
  .action(async ({ parsedInput }) => {
    const rows = await getUserResponseExportRows(
      Array.from(new Set(parsedInput.userIds)),
    );

    return {
      csv: createUserResponsesCsv(rows),
      fileName: `user-responses-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  });
