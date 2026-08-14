import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@rallly/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@rallly/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rallly/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@rallly/ui/form";
import { Input } from "@rallly/ui/input";
import { PencilIcon, TagIcon, TrashIcon } from "lucide-react";
import React from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { useMount } from "react-use";
import * as z from "zod";

import {
  useDeleteParticipantMutation,
  useEditToken,
} from "@/features/poll/components/mutations";
import { Trans, useTranslation } from "@/i18n/client";
import { useFormValidation } from "@/lib/utils/form-validation";
import { trpc } from "@/trpc/client";

export const ParticipantDropdown = ({
  participant,
  onEdit,
  onDelete,
  children,
  disabled,
  align,
}: {
  disabled?: boolean;
  participant: {
    name: string;
    userId?: string;
    email?: string;
    id: string;
  };
  align?: "start" | "end";
  onEdit: () => void;
  onDelete?: () => void;
  children: React.ReactElement;
}) => {
  const [isChangeNameModalVisible, setIsChangeNameModalVisible] =
    React.useState(false);
  const [isDeleteParticipantModalVisible, setIsDeleteParticipantModalVisible] =
    React.useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          disabled={disabled}
          data-testid="participant-menu"
          render={children}
        />
        <DropdownMenuContent align={align}>
          <DropdownMenuLabel>
            <div className="grid gap-0.5">
              <div className="font-medium text-foreground">
                {participant.name}
              </div>
              {participant.email ? (
                <div className="font-normal text-muted-foreground text-xs">
                  {participant.email}
                </div>
              ) : null}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            <Trans i18nKey="editVotes" defaults="Edit votes" />
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setIsChangeNameModalVisible(true)}>
            <TagIcon />
            <Trans i18nKey="changeInfo" defaults="Change info" />
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setIsDeleteParticipantModalVisible(true)}
          >
            <TrashIcon />
            <Trans i18nKey="delete" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangeInfoModal
        open={isChangeNameModalVisible}
        onOpenChange={setIsChangeNameModalVisible}
        oldName={participant.name}
        oldEmail={participant.email || ""}
        participantId={participant.id}
      />
      <DeleteParticipantModal
        open={isDeleteParticipantModalVisible}
        onOpenChange={setIsDeleteParticipantModalVisible}
        participantId={participant.id}
        participantName={participant.name}
        onDelete={onDelete}
      />
    </>
  );
};

const DeleteParticipantModal = ({
  open,
  onOpenChange,
  participantId,
  participantName,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: string;
  participantName: string;
  onDelete?: () => void;
}) => {
  const deleteParticipant = useDeleteParticipantMutation();
  const token = useEditToken();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="deleteParticipant"
              defaults="Delete {name}?"
              values={{ name: participantName }}
            />
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="deleteParticipantDescription"
              defaults="Are you sure you want to delete this participant? This action cannot be undone."
            />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
          >
            <Trans i18nKey="cancel" />
          </Button>
          <Button
            loading={deleteParticipant.isPending}
            variant="destructive"
            onClick={async () => {
              deleteParticipant.mutate({
                participantId,
                token,
              });
              onDelete?.();
              onOpenChange(false);
            }}
          >
            <Trans i18nKey="delete" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ChangeInfoForm = {
  name: string;
  email: string;
};

const changeInfoSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().email().or(z.literal("")).optional(),
});

const ChangeInfoModal = (props: {
  oldName: string;
  oldEmail: string;
  participantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const token = useEditToken();
  const changeInfo = trpc.polls.participants.rename.useMutation();
  const form = useForm({
    defaultValues: {
      name: props.oldName,
      email: props.oldEmail,
    },
    resolver: zodResolver(changeInfoSchema),
  });

  const { control, reset, handleSubmit, setFocus, formState } = form;

  useMount(() => {
    setFocus("name", {
      shouldSelect: true,
    });
  });

  const { participantId, onOpenChange } = props;

  const handler = React.useCallback<SubmitHandler<ChangeInfoForm>>(
    async ({ name, email }) => {
      if (formState.isDirty) {
        // change info
        await changeInfo.mutateAsync({
          participantId,
          newName: name,
          newEmail: email,
          token,
        });
      }
      onOpenChange(false);
    },
    [changeInfo, formState.isDirty, participantId, token, onOpenChange],
  );

  const { requiredString } = useFormValidation();
  const formName = `change-info-${props.participantId}`;
  const { t } = useTranslation();
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("changeInfo", { defaultValue: "Change info" })}
          </DialogTitle>
          <DialogDescription>
            {t("changeInfoDescription", {
              defaultValue: "Update the name and email for this participant.",
            })}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form id={formName} onSubmit={handleSubmit(handler)} className="space-y-4">
            <FormField
              control={control}
              name="name"
              rules={{
                validate: requiredString(t("name")),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      className="w-full"
                      {...field}
                      disabled={formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("email", { defaultValue: "Email (optional)" })}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      className="w-full"
                      {...field}
                      disabled={formState.isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormDescription className="pt-2">
              {t("changeNameInfo", {
                defaultValue:
                  "This will not affect any votes you have already made.",
              })}
            </FormDescription>
          </form>
        </Form>
        <DialogFooter>
          <Button
            disabled={formState.isSubmitting}
            onClick={() => {
              reset();
              props.onOpenChange(false);
            }}
          >
            {t("cancel")}
          </Button>
          <Button
            form={formName}
            loading={formState.isSubmitting}
            type="submit"
            variant="primary"
          >
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
