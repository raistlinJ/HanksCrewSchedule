import { Button } from "@rallly/ui/button";
import { useDialog } from "@rallly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rallly/ui/dropdown-menu";
import {
  ChevronDownIcon,
  CircleStopIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  MailIcon,
  PencilIcon,
  PlayIcon,
  TrashIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { DuplicateDialog } from "@/app/[locale]/(optional-space)/poll/[urlId]/duplicate-dialog";
import { showPayWall, useIsFree } from "@/features/billing/client";
import { ProBadge } from "@/features/billing/components/pro-badge";
import { usePoll } from "@/features/poll/client";
import { Trans } from "@/i18n/client";
import { trpc } from "@/trpc/client";
import { DeletePollDialog } from "./manage-poll/delete-poll-dialog";
import { EmailReminderDialog } from "./manage-poll/email-reminder-dialog";
import { useCsvExporter } from "./manage-poll/use-csv-exporter";

function OpenCloseToggle() {
  const poll = usePoll();
  const queryClient = trpc.useUtils();
  const openPoll = trpc.polls.reopen.useMutation({
    onSuccess: (_data, vars) => {
      queryClient.polls.get.setData({ urlId: vars.pollId }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status: "open",
        };
      });
    },
  });
  const closePoll = trpc.polls.close.useMutation({
    onSuccess: (_data, vars) => {
      queryClient.polls.get.setData({ urlId: vars.pollId }, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          status: "closed",
        };
      });
    },
  });

  if (poll.status === "closed") {
    return (
      <DropdownMenuItem
        onClick={() => {
          openPoll.mutate(
            { pollId: poll.id },
            {
              onSuccess: () => {
                queryClient.polls.get.setData({ urlId: poll.id }, (oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    status: "open",
                  };
                });
              },
            },
          );
        }}
      >
        <PlayIcon />
        <Trans i18nKey="reopenPoll" defaults="Reopen poll" />
      </DropdownMenuItem>
    );
  } else {
    return (
      <DropdownMenuItem
        onClick={() => {
          closePoll.mutate(
            { pollId: poll.id },
            {
              onSuccess: () => {
                queryClient.polls.get.setData({ urlId: poll.id }, (oldData) => {
                  if (!oldData) return oldData;
                  return {
                    ...oldData,
                    status: "closed",
                  };
                });
              },
            },
          );
        }}
      >
        <CircleStopIcon />
        <Trans i18nKey="closePoll" defaults="Close" />
      </DropdownMenuItem>
    );
  }
}

const ManagePoll: React.FunctionComponent<{
  disabled?: boolean;
}> = ({ disabled }) => {
  const poll = usePoll();

  const [showDeletePollDialog, setShowDeletePollDialog] = React.useState(false);
  const [showEmailReminderDialog, setShowEmailReminderDialog] =
    React.useState(false);
  const duplicateDialog = useDialog();
  const isFree = useIsFree();
  const { exportToCsv } = useCsvExporter();

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          render={<Button variant="ghost" disabled={disabled} />}
        >
          <span>
            <Trans i18nKey="manage" />
          </span>
          <ChevronDownIcon data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link href={`/poll/${poll.id}/edit`} />}>
            <PencilIcon />
            <Trans i18nKey="edit" defaults="Edit" />
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href={`/poll/${poll.id}/results`} />}>
            <UsersIcon />
            Manage results
          </DropdownMenuItem>
          {poll.publicResults ? (
            <DropdownMenuItem
              render={
                <Link href={`/invite/${poll.id}/results`} target="_blank" />
              }
            >
              <ExternalLinkIcon />
              Public results page
            </DropdownMenuItem>
          ) : null}
          {poll.status === "scheduled" || poll.status === "canceled" ? null : (
            <>
              <DropdownMenuSeparator />
              <OpenCloseToggle />
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowEmailReminderDialog(true)}>
            <MailIcon />
            Email reminder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={exportToCsv}>
            <DownloadIcon />
            <Trans i18nKey="exportToCsv" defaults="Export to CSV" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              if (isFree) {
                showPayWall({
                  from: "manage-poll",
                  action: "duplicate",
                  pollId: poll.id,
                });
              } else {
                duplicateDialog.trigger();
              }
            }}
          >
            <CopyIcon />
            <Trans i18nKey="duplicate" defaults="Duplicate" />
            {isFree ? <ProBadge /> : null}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => {
              setShowDeletePollDialog(true);
            }}
          >
            <TrashIcon />
            <Trans i18nKey="delete" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeletePollDialog
        urlId={poll.id}
        open={showDeletePollDialog}
        onOpenChange={setShowDeletePollDialog}
      />
      <EmailReminderDialog
        pollId={poll.id}
        pollTitle={poll.title}
        open={showEmailReminderDialog}
        onOpenChange={setShowEmailReminderDialog}
      />
      <DuplicateDialog
        pollId={poll.id}
        pollTitle={poll.title}
        {...duplicateDialog.dialogProps}
      />
    </>
  );
};

export default ManagePoll;
