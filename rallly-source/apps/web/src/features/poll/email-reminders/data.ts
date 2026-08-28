import "server-only";

import { prisma } from "@rallly/database";
import type { AuthorizedSpaceId } from "@/features/space/types";

export type PollReminderRecipient = {
  name: string;
  email: string;
};

export async function getPollReminderRecipients({
  pollId,
  spaceId,
}: {
  pollId: string;
  spaceId: AuthorizedSpaceId;
}): Promise<PollReminderRecipient[] | null> {
  const poll = await prisma.poll.findFirst({
    where: {
      id: pollId,
      spaceId,
      deleted: false,
    },
    select: {
      participants: {
        where: {
          deleted: false,
          email: { not: null },
          votes: { some: { type: "yes" } },
        },
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!poll) return null;

  const recipients = new Map<string, PollReminderRecipient>();
  for (const participant of poll.participants) {
    const email = participant.email?.trim();
    if (!email) continue;

    const normalizedEmail = email.toLowerCase();
    if (!recipients.has(normalizedEmail)) {
      recipients.set(normalizedEmail, {
        name: participant.name,
        email,
      });
    }
  }

  return Array.from(recipients.values());
}
