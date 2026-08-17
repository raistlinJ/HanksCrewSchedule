import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@rallly/ui/card";
import { Dialog, DialogContent } from "@rallly/ui/dialog";
import { Input } from "@rallly/ui/input";
import { Label } from "@rallly/ui/label";
import { toast } from "@rallly/ui/sonner";
import React from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import * as z from "zod";
import {
  usePermissions,
  usePoll,
  usePollEmailAccess,
  useRole,
} from "@/features/poll/client";
import {
  normalizeAuxiliaryVotes,
  normalizeVotes,
  useEditToken,
  useUpdateParticipantMutation,
} from "@/features/poll/components/mutations";
import { NewParticipantForm } from "@/features/poll/components/new-participant-modal";
import { useParticipants } from "@/features/poll/components/participants-provider";
import { normalizePollAccessEmail } from "@/features/poll/email-access/utils";
import { useUnsubmittedResponseWarning } from "@/features/poll/hooks/unsubmitted-response-warning/utils";
import { isVoterIdentityComplete } from "@/features/poll/voter-identity/utils";
import { useUser } from "@/features/user/client";

const formSchema = z.object({
  mode: z.enum(["new", "edit", "view"]),
  participantId: z.string().optional(),
  name: z.string(),
  email: z.string(),
  votes: z.array(
    z
      .object({
        optionId: z.string(),
        type: z.enum(["yes", "no", "ifNeedBe"]).optional(),
      })
      .optional(),
  ),
  auxiliaryVotes: z.array(
    z
      .object({
        auxiliaryOptionId: z.string(),
        type: z.enum(["yes", "no", "ifNeedBe"]).optional(),
      })
      .optional(),
  ),
});

type VotingFormValues = z.infer<typeof formSchema>;

export const useVotingForm = () => {
  const { options, auxiliarySelection } = usePoll();
  const { participants } = useParticipants();
  const form = useFormContext<VotingFormValues>();
  const mode = form.watch("mode");
  const identityReady =
    mode !== "new" ||
    isVoterIdentityComplete({
      name: form.watch("name"),
      email: form.watch("email"),
    });

  return {
    ...form,
    identityReady,
    newParticipant: () => {
      form.reset({
        mode: "new",
        participantId: undefined,
        name: form.getValues("name") ?? "",
        email: form.getValues("email") ?? "",
        votes: options.map((option) => ({
          optionId: option.id,
        })),
        auxiliaryVotes:
          auxiliarySelection?.options.map((option) => ({
            auxiliaryOptionId: option.id,
            type: "no" as const,
          })) ?? [],
      });
    },
    setEditingParticipantId: (newParticipantId: string) => {
      const participant = participants.find((p) => p.id === newParticipantId);
      if (participant) {
        form.reset({
          mode: "edit",
          participantId: newParticipantId,
          name: form.getValues("name") ?? "",
          email: form.getValues("email") ?? "",
          votes: options.map((option) => ({
            optionId: option.id,
            type: participant.votes.find((vote) => vote.optionId === option.id)
              ?.type,
          })),
          auxiliaryVotes:
            auxiliarySelection?.options.map((option) => ({
              auxiliaryOptionId: option.id,
              type: participant.auxiliaryVotes.some(
                (vote) =>
                  vote.auxiliaryOptionId === option.id && vote.type === "yes",
              )
                ? "yes"
                : "no",
            })) ?? [],
        });
      } else {
        console.error("Participant not found");
      }
    },
    cancel: () =>
      form.reset({
        mode: "view",
        participantId: undefined,
        name: form.getValues("name") ?? "",
        email: form.getValues("email") ?? "",
        votes: options.map((option) => ({
          optionId: option.id,
        })),
        auxiliaryVotes:
          auxiliarySelection?.options.map((option) => ({
            auxiliaryOptionId: option.id,
            type: "no" as const,
          })) ?? [],
      }),
  };
};

function VoterIdentityFields() {
  const form = useVotingForm();
  const mode = form.watch("mode");

  if (mode !== "new") {
    return null;
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Your details</CardTitle>
        <p className="text-muted-foreground text-sm">
          Enter your name and email before selecting your responses.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="voter-name">Name</Label>
          <Input
            id="voter-name"
            form="voting-form"
            autoComplete="name"
            required
            maxLength={100}
            placeholder="Your name"
            {...form.register("name")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="voter-email">Email</Label>
          <Input
            id="voter-email"
            form="voting-form"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            {...form.register("email")}
          />
        </div>
        {!form.identityReady ? (
          <p className="text-muted-foreground text-sm sm:col-span-2">
            Voting will be enabled after both fields are complete.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export const VotingForm = ({ children }: React.PropsWithChildren) => {
  const { id: pollId, options, auxiliarySelection } = usePoll();
  const updateParticipant = useUpdateParticipantMutation();
  const token = useEditToken();
  const { participants } = useParticipants();
  const { user } = useUser();
  const { emailAccess, setEmailAccess } = usePollEmailAccess();

  const { canAddNewParticipant, canEditParticipant } = usePermissions();
  const userAlreadyVoted = participants.some((participant) =>
    canEditParticipant(participant.id),
  );

  const role = useRole();
  const optionIds = options.map((option) => option.id);
  const auxiliaryOptionIds =
    auxiliarySelection?.options.map((option) => option.id) ?? [];

  const [isNewParticipantModalOpen, setIsNewParticipantModalOpen] =
    React.useState(false);

  const form = useForm<VotingFormValues>({
    defaultValues: {
      mode:
        canAddNewParticipant && !userAlreadyVoted && role === "participant"
          ? "new"
          : "view",
      participantId:
        role === "participant"
          ? participants.find((p) => canEditParticipant(p.id))?.id
          : undefined,
      name: user && !user.isGuest ? user.name : "",
      email: user && !user.isGuest ? (user.email ?? "") : (emailAccess ?? ""),
      votes: options.map((option) => ({
        optionId: option.id,
      })),
      auxiliaryVotes: auxiliaryOptionIds.map((auxiliaryOptionId) => ({
        auxiliaryOptionId,
        type: "no" as const,
      })),
    },
    resolver: zodResolver(formSchema),
  });
  const mode = form.watch("mode");
  useUnsubmittedResponseWarning(
    mode === "new" || (mode === "edit" && form.formState.isDirty),
  );

  return (
    <FormProvider {...form}>
      <form
        id="voting-form"
        onSubmit={form.handleSubmit(async (data) => {
          const votes = normalizeVotes(optionIds, data.votes);
          const auxiliaryVotes = normalizeAuxiliaryVotes(
            auxiliaryOptionIds,
            data.auxiliaryVotes,
          );
          const hasPrimaryYes = votes.some((vote) => vote.type === "yes");
          if (
            hasPrimaryYes &&
            auxiliarySelection &&
            auxiliaryVotes.filter((vote) => vote.type === "yes").length <
              auxiliarySelection.minYes
          ) {
            toast.error(
              `Select at least ${auxiliarySelection.minYes} ${auxiliarySelection.name} choices.`,
            );
            return;
          }
          if (
            hasPrimaryYes &&
            auxiliarySelection?.maxYesSelections !== null &&
            auxiliarySelection?.maxYesSelections !== undefined &&
            auxiliaryVotes.filter((vote) => vote.type === "yes").length >
              auxiliarySelection.maxYesSelections
          ) {
            toast.error(
              `Select no more than ${auxiliarySelection.maxYesSelections} ${auxiliarySelection.name} choices.`,
            );
            return;
          }

          if (data.participantId) {
            // update participant

            await updateParticipant.mutateAsync({
              participantId: data.participantId,
              pollId,
              votes,
              auxiliaryVotes,
              token,
              accessEmail: emailAccess ?? undefined,
            });

            form.reset({
              mode: "view",
              participantId: data.participantId,
              name: data.name,
              email: data.email,
              votes: options.map((option) => ({
                optionId: option.id,
              })),
              auxiliaryVotes: auxiliaryOptionIds.map((auxiliaryOptionId) => ({
                auxiliaryOptionId,
                type: "no" as const,
              })),
            });
          } else {
            // new participant
            const identityReady = isVoterIdentityComplete({
              name: data.name,
              email: data.email,
            });
            if (!identityReady) {
              toast.error("Enter your name and a valid email before voting.");
              return;
            }
            setIsNewParticipantModalOpen(true);
          }
        })}
      />
      <Dialog
        open={isNewParticipantModalOpen}
        onOpenChange={setIsNewParticipantModalOpen}
      >
        <DialogContent size="sm">
          <NewParticipantForm
            identity={{
              name: form.watch("name"),
              email: form.watch("email"),
            }}
            votes={normalizeVotes(optionIds, form.watch("votes"))}
            auxiliaryVotes={normalizeAuxiliaryVotes(
              auxiliaryOptionIds,
              form.watch("auxiliaryVotes"),
            )}
            onSubmit={(newParticipant) => {
              if (emailAccess) {
                setEmailAccess(
                  normalizePollAccessEmail(form.getValues("email")),
                );
              }
              form.reset({
                mode: "view",
                participantId: newParticipant.id,
                name: form.getValues("name"),
                email: form.getValues("email"),
                votes: options.map((option) => ({
                  optionId: option.id,
                })),
                auxiliaryVotes: auxiliaryOptionIds.map((auxiliaryOptionId) => ({
                  auxiliaryOptionId,
                  type: "no" as const,
                })),
              });
            }}
            onCancel={() => setIsNewParticipantModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <VoterIdentityFields />
      {children}
    </FormProvider>
  );
};
