import "server-only";

import { sendRawEmail } from "@rallly/emails";
import type { AuthorizedSpaceId } from "@/features/space/types";
import { getPollReminderRecipients } from "./data";

export async function sendPollReminderEmails({
  pollId,
  spaceId,
  subject,
  body,
}: {
  pollId: string;
  spaceId: AuthorizedSpaceId;
  subject: string;
  body: string;
}) {
  const recipients = await getPollReminderRecipients({ pollId, spaceId });
  if (!recipients) return null;

  const results = await Promise.all(
    recipients.map((recipient) =>
      sendRawEmail({
        to: recipient.email,
        subject,
        text: body,
      }),
    ),
  );
  const count = results.filter((result) => result.ok).length;

  return {
    count,
    failedCount: recipients.length - count,
    recipientCount: recipients.length,
  };
}
