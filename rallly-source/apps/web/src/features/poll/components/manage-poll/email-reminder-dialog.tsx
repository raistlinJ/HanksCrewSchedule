"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";
import { shortUrl } from "@rallly/utils/absolute-url";
import * as React from "react";
import { trpc } from "@/trpc/client";

export function EmailReminderDialog({
  pollId,
  pollTitle,
  open,
  onOpenChange,
}: {
  pollId: string;
  pollTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const recipients = trpc.polls.getReminderRecipients.useQuery(
    { pollId },
    { enabled: open },
  );
  const sendReminder = trpc.polls.sendReminderEmails.useMutation({
    onSuccess: (result) => {
      if (result.failedCount > 0) {
        toast.error(
          `${result.count} sent; ${result.failedCount} could not be delivered.`,
        );
        if (result.count === 0) return;
      } else {
        toast.success(
          `Successfully sent ${result.count} reminder email${result.count === 1 ? "" : "s"}.`,
        );
      }
      onOpenChange(false);
    },
    onError: (error) => toast.error(error.message),
  });

  React.useEffect(() => {
    if (!open) return;
    setSubject(`Reminder: ${pollTitle}`);
    setBody(
      `Thanks for giving us your availability; reminder that the event ${pollTitle} is coming up. If you need to update your availability please do so now:\n${shortUrl(`/invite/${pollId}`)}`,
    );
  }, [open, pollId, pollTitle]);

  const recipientList = recipients.data ?? [];
  const isLoading = recipients.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>Send Email Reminder</DialogTitle>
          <DialogDescription>
            Email participants who voted Yes and supplied an email address.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">
              Loading participants...
            </p>
          ) : recipients.error ? (
            <p className="text-destructive text-sm">
              {recipients.error.message}
            </p>
          ) : recipientList.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No participants who voted Yes have an email address.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm">
                You are about to email <strong>{recipientList.length}</strong>{" "}
                participant{recipientList.length === 1 ? "" : "s"}.
              </p>

              <label className="block space-y-1">
                <span className="font-medium text-sm">Subject</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-sm">Message Body</span>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={6}
                  className="w-full rounded-md border px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>

              <details className="rounded-md border p-3 text-sm">
                <summary className="cursor-pointer font-medium">
                  Show Participants
                </summary>
                <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                  {recipientList.map((recipient) => (
                    <li
                      key={recipient.email.toLowerCase()}
                      className="flex items-center justify-between gap-4 text-xs"
                    >
                      <span>{recipient.name}</span>
                      <span className="truncate text-muted-foreground">
                        {recipient.email}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={sendReminder.isPending}
            disabled={
              isLoading ||
              recipientList.length === 0 ||
              !subject.trim() ||
              !body.trim()
            }
            onClick={() =>
              sendReminder.mutate({
                pollId,
                subject,
                body,
              })
            }
          >
            Send Emails
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
