import "server-only";

import { Prisma, prisma } from "@rallly/database";
import type { InstanceArchive } from "./schema";
import {
  archiveTableNames,
  INSTANCE_ARCHIVE_FORMAT,
  INSTANCE_ARCHIVE_VERSION,
  instanceArchiveSchema,
} from "./schema";

const TRANSACTION_TIMEOUT_MS = 120_000;

export async function createInstanceArchive(): Promise<InstanceArchive> {
  const data = await prisma.$transaction(
    async (tx) => {
      const [
        users,
        accounts,
        notificationPreferences,
        spaces,
        spaceMembers,
        spaceMemberInvites,
        pollGroups,
        eventTypes,
        sheets,
        sheetSlots,
        scheduledEvents,
        rescheduledEventDates,
        scheduledEventInvites,
        polls,
        options,
        pollAuxiliarySelections,
        pollAuxiliaryOptions,
        participants,
        votes,
        pollAuxiliaryVotes,
        comments,
        pollInvites,
        pollActivities,
      ] = await Promise.all([
        tx.user.findMany(),
        tx.account.findMany(),
        tx.userNotificationPreferences.findMany(),
        tx.space.findMany(),
        tx.spaceMember.findMany(),
        tx.spaceMemberInvite.findMany(),
        tx.pollGroup.findMany(),
        tx.eventType.findMany(),
        tx.sheet.findMany(),
        tx.sheetSlot.findMany(),
        tx.scheduledEvent.findMany(),
        tx.rescheduledEventDate.findMany(),
        tx.scheduledEventInvite.findMany(),
        tx.poll.findMany(),
        tx.option.findMany(),
        tx.pollAuxiliarySelection.findMany(),
        tx.pollAuxiliaryOption.findMany(),
        tx.participant.findMany(),
        tx.vote.findMany(),
        tx.pollAuxiliaryVote.findMany(),
        tx.comment.findMany(),
        tx.pollInvite.findMany(),
        tx.pollActivity.findMany(),
      ]);

      return {
        users: users.map((user) => ({
          ...user,
          // Preserve the QR credential so printed badges remain valid after
          // restoring the archive.
          qrCodeToken: user.qrCodeToken,
          // These point to external systems which are intentionally not
          // portable between installations.
          customerId: null,
          defaultDestinationCalendarId: null,
        })),
        accounts: accounts.map((account) => ({
          ...account,
          // Retain password hashes and provider identity, but never export
          // live OAuth credentials.
          refresh_token: null,
          access_token: null,
          expires_at: null,
          id_token: null,
          accessTokenExpiresAt: null,
          refreshTokenExpiresAt: null,
        })),
        notificationPreferences,
        spaces,
        spaceMembers,
        spaceMemberInvites,
        pollGroups,
        eventTypes,
        sheets,
        sheetSlots,
        scheduledEvents,
        rescheduledEventDates,
        scheduledEventInvites,
        polls,
        options,
        pollAuxiliarySelections,
        pollAuxiliaryOptions,
        participants,
        votes,
        pollAuxiliaryVotes,
        comments,
        pollInvites,
        pollActivities,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      timeout: TRANSACTION_TIMEOUT_MS,
    },
  );

  const counts = Object.fromEntries(
    archiveTableNames.map((table) => [table, data[table].length]),
  ) as Record<(typeof archiveTableNames)[number], number>;

  return instanceArchiveSchema.parse({
    format: INSTANCE_ARCHIVE_FORMAT,
    version: INSTANCE_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    applicationVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown",
    counts,
    data,
  });
}
