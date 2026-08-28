"use client";

import { subject } from "@casl/ability";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useDialog,
} from "@rallly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@rallly/ui/dropdown-menu";
import { Icon } from "@rallly/ui/icon";
import { toast } from "@rallly/ui/sonner";
import { MoreVerticalIcon, UserCheckIcon, XIcon } from "lucide-react";
import { useSpace } from "@/features/space/client";
import {
  cancelInviteAction,
  overridePendingInviteAction,
} from "@/features/space/member/actions";
import { Trans, useTranslation } from "@/i18n/client";
import { useSafeAction } from "@/lib/safe-action/client";

type SpaceMemberInvite = {
  id: string;
  email: string;
  spaceId: string;
};

export function InviteDropdownMenu({ invite }: { invite: SpaceMemberInvite }) {
  const space = useSpace();
  const cancelInviteDialog = useDialog();
  const { t } = useTranslation();
  const cancelInvite = useSafeAction(cancelInviteAction, {
    onSuccess: () => {
      toast.success(
        t("inviteCanceledSuccess", {
          defaultValue: "Invite canceled successfully",
        }),
      );
    },
    onSettled: () => {
      cancelInviteDialog.dismiss();
    },
  });
  const overrideAccept = useSafeAction(overridePendingInviteAction, {
    onSuccess: ({ data }) => {
      if (!data) {
        return;
      }

      if (data.ok) {
        toast.success(
          t("overrideAcceptSuccess", {
            defaultValue:
              "Access granted. They will see this space when they log in.",
          }),
        );
        return;
      }

      toast.error(
        data.reason === "NOT_ENOUGH_SEATS"
          ? t("inviteNotEnoughSeats", {
              defaultValue:
                "There are not enough seats available to add this member",
            })
          : t("alreadyMember", {
              defaultValue: "This person is already a member of this space",
            }),
      );
    },
  });

  const ability = space.getMemberAbility();
  const canCancelInvite = ability.can(
    "delete",
    subject("SpaceMemberInvite", invite),
  );
  const canOverrideInvite = ability.can("create", "SpaceMemberInvite");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label={t("moreOptions", { defaultValue: "More options" })}
              variant="ghost"
              size="icon"
            />
          }
        >
          <Icon>
            <MoreVerticalIcon />
          </Icon>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              overrideAccept.execute({ inviteId: invite.id });
            }}
            disabled={!canOverrideInvite || overrideAccept.isExecuting}
          >
            <UserCheckIcon />
            <Trans i18nKey="overrideAccept" defaults="Override accept" />
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              cancelInviteDialog.trigger();
            }}
            disabled={!canCancelInvite}
            variant="destructive"
          >
            <XIcon />
            <Trans i18nKey="cancelInvite" defaults="Cancel invite" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog {...cancelInviteDialog.dialogProps}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              <Trans i18nKey="cancelInvite" defaults="Cancel invite" />
            </DialogTitle>
            <DialogDescription>
              <Trans
                i18nKey="cancelInviteConfirmation"
                defaults="Are you sure you want to cancel the invite for {email}?"
                values={{ email: invite.email }}
              />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              loading={cancelInvite.isExecuting}
              onClick={() => {
                cancelInvite.execute({ inviteId: invite.id });
              }}
            >
              <Trans i18nKey="confirm" defaults="Confirm" />
            </Button>
            <DialogClose render={<Button />}>
              <Trans i18nKey="cancel" defaults="Cancel" />
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
