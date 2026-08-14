import "server-only";

import { Prisma, prisma } from "@rallly/database";
import { instanceArchiveSchema } from "./schema";

const TRANSACTION_TIMEOUT_MS = 120_000;

export async function restoreInstanceArchive(input: unknown) {
  const archive = instanceArchiveSchema.parse(input);
  const { data } = archive;

  await prisma.$transaction(
    async (tx) => {
      // Clear portable data from leaves to roots. Operational instance state
      // (settings and licensing) stays with the destination installation.
      await tx.pollActivity.deleteMany();
      await tx.pollInvite.deleteMany();
      await tx.comment.deleteMany();
      await tx.vote.deleteMany();
      await tx.participant.deleteMany();
      await tx.option.deleteMany();
      await tx.poll.deleteMany();
      await tx.pollGroup.deleteMany();
      await tx.rescheduledEventDate.deleteMany();
      await tx.scheduledEventInvite.deleteMany();
      await tx.scheduledEvent.deleteMany();
      await tx.sheetSlot.deleteMany();
      await tx.sheet.deleteMany();
      await tx.eventType.deleteMany();
      await tx.spaceMemberInvite.deleteMany();
      await tx.spaceMember.deleteMany();
      await tx.userNotificationPreferences.deleteMany();
      await tx.account.deleteMany();
      await tx.space.deleteMany();
      await tx.user.deleteMany();

      // Restore roots before leaves so every foreign key is valid at insert.
      await tx.user.createMany({
        data: data.users as Prisma.UserCreateManyInput[],
      });
      await tx.account.createMany({
        data: data.accounts as Prisma.AccountCreateManyInput[],
      });
      await tx.userNotificationPreferences.createMany({
        data: data.notificationPreferences as Prisma.UserNotificationPreferencesCreateManyInput[],
      });
      await tx.space.createMany({
        data: data.spaces as Prisma.SpaceCreateManyInput[],
      });
      await tx.spaceMember.createMany({
        data: data.spaceMembers as Prisma.SpaceMemberCreateManyInput[],
      });
      await tx.spaceMemberInvite.createMany({
        data: data.spaceMemberInvites as Prisma.SpaceMemberInviteCreateManyInput[],
      });
      await tx.pollGroup.createMany({
        data: data.pollGroups as Prisma.PollGroupCreateManyInput[],
      });
      await tx.eventType.createMany({
        data: data.eventTypes as Prisma.EventTypeCreateManyInput[],
      });
      await tx.sheet.createMany({
        data: data.sheets as Prisma.SheetCreateManyInput[],
      });
      await tx.sheetSlot.createMany({
        data: data.sheetSlots as Prisma.SheetSlotCreateManyInput[],
      });
      await tx.scheduledEvent.createMany({
        data: data.scheduledEvents as Prisma.ScheduledEventCreateManyInput[],
      });
      await tx.rescheduledEventDate.createMany({
        data: data.rescheduledEventDates as Prisma.RescheduledEventDateCreateManyInput[],
      });
      await tx.scheduledEventInvite.createMany({
        data: data.scheduledEventInvites as Prisma.ScheduledEventInviteCreateManyInput[],
      });
      await tx.poll.createMany({
        data: data.polls as Prisma.PollCreateManyInput[],
      });
      await tx.option.createMany({
        data: data.options as Prisma.OptionCreateManyInput[],
      });
      await tx.participant.createMany({
        data: data.participants as Prisma.ParticipantCreateManyInput[],
      });
      await tx.vote.createMany({
        data: data.votes as Prisma.VoteCreateManyInput[],
      });
      await tx.comment.createMany({
        data: data.comments as Prisma.CommentCreateManyInput[],
      });
      await tx.pollInvite.createMany({
        data: data.pollInvites as Prisma.PollInviteCreateManyInput[],
      });
      await tx.pollActivity.createMany({
        data: data.pollActivities as Prisma.PollActivityCreateManyInput[],
      });
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      timeout: TRANSACTION_TIMEOUT_MS,
    },
  );

  return archive.counts;
}
