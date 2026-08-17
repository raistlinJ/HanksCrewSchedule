"use client";

import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";
import { ScanSearchIcon } from "lucide-react";
import { useState } from "react";
import type { UserCleanupCandidate } from "@/features/user/schema";
import { Trans, useTranslation } from "@/i18n/client";
import { useSafeAction } from "@/lib/safe-action/client";
import {
  findUserCleanupCandidatesAction,
  removeUserCleanupCandidatesAction,
} from "./actions";

export function CleanupUsersDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<UserCleanupCandidate[] | null>(
    null,
  );
  const [hasMore, setHasMore] = useState(false);

  const findCandidates = useSafeAction(findUserCleanupCandidatesAction, {
    onSuccess: ({ data }) => {
      if (data) {
        setCandidates(data.users);
        setHasMore(data.hasMore);
      }
    },
  });
  const removeCandidates = useSafeAction(removeUserCleanupCandidatesAction, {
    onSuccess: ({ data }) => {
      if (!data) {
        return;
      }

      toast.success(
        t("unusedUsersRemoved", {
          defaultValue:
            "{count, plural, one {# unused user removed} other {# unused users removed}}",
          count: data.removed,
        }),
      );
      if (data.skipped > 0) {
        toast.info(
          t("unusedUsersSkipped", {
            defaultValue:
              "{count} users were kept because their status changed",
            count: data.skipped,
          }),
        );
      }
      setOpen(false);
      setCandidates(null);
    },
  });

  const scan = () => {
    setCandidates(null);
    setHasMore(false);
    setOpen(true);
    findCandidates.execute({});
  };

  return (
    <>
      <Button onClick={scan}>
        <ScanSearchIcon />
        <Trans i18nKey="cleanupUsers" defaults="Clean up users" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!removeCandidates.isExecuting) {
            setOpen(nextOpen);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="cleanupUsers" defaults="Clean up users" />
            </DialogTitle>
            <DialogDescription>
              {candidates === null ? (
                <Trans
                  i18nKey="checkingUnusedUsers"
                  defaults="Checking for users who are not on any poll…"
                />
              ) : candidates.length === 0 ? (
                <Trans
                  i18nKey="noUnusedUsers"
                  defaults="No unused users were found."
                />
              ) : (
                <Trans
                  i18nKey="confirmUnusedUserCleanup"
                  defaults="These users are not on any active or archived poll and do not own or belong to a space. Permanently remove them? This cannot be undone."
                />
              )}
            </DialogDescription>
          </DialogHeader>

          {candidates && candidates.length > 0 ? (
            <>
              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <ul className="divide-y">
                  {candidates.map((user) => (
                    <li key={user.id} className="px-3 py-2.5">
                      <div className="font-medium text-sm">{user.name}</div>
                      <div className="truncate text-muted-foreground text-xs">
                        {user.email}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              {hasMore ? (
                <p className="text-muted-foreground text-xs">
                  <Trans
                    i18nKey="cleanupUsersLimit"
                    defaults="Showing the first 250 eligible users. Run cleanup again to check for more."
                  />
                </p>
              ) : null}
            </>
          ) : null}

          <DialogFooter>
            <DialogClose
              render={<Button disabled={removeCandidates.isExecuting} />}
            >
              {candidates?.length === 0 ? (
                <Trans i18nKey="close" defaults="Close" />
              ) : (
                <Trans i18nKey="cancel" defaults="Cancel" />
              )}
            </DialogClose>
            {candidates && candidates.length > 0 ? (
              <Button
                variant="destructive"
                loading={removeCandidates.isExecuting}
                onClick={() => {
                  removeCandidates.execute({
                    userIds: candidates.map((user) => user.id),
                  });
                }}
              >
                <Trans
                  i18nKey="removeUnusedUsers"
                  defaults="Remove {count} users"
                  values={{ count: candidates.length }}
                />
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
