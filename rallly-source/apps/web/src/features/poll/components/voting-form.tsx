import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent } from "@rallly/ui/dialog";
import { toast } from "@rallly/ui/sonner";
import React from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import * as z from "zod";
import { usePermissions, usePoll, useRole } from "@/features/poll/client";
import {
  normalizeAuxiliaryVotes,
  normalizeVotes,
  useEditToken,
  useUpdateParticipantMutation,
} from "@/features/poll/components/mutations";
import { NewParticipantForm } from "@/features/poll/components/new-participant-modal";
import { useParticipants } from "@/features/poll/components/participants-provider";

const formSchema = z.object({
  mode: z.enum(["new", "edit", "view"]),
  participantId: z.string().optional(),
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

  return {
    ...form,
    newParticipant: () => {
      form.reset({
        mode: "new",
        participantId: undefined,
        votes: options.map((option) => ({
          optionId: option.id,
        })),
        auxiliaryVotes:
          auxiliarySelection?.options.map((option) => ({
            auxiliaryOptionId: option.id,
            type: "ifNeedBe" as const,
          })) ?? [],
      });
    },
    editParticipantByEmailData: (participant: any) => {
      form.reset({
        mode: "edit",
        participantId: participant.id,
        votes: options.map((option) => ({
          optionId: option.id,
          type: participant.votes.find((vote: any) => vote.optionId === option.id)?.type,
        })),
        auxiliaryVotes:
          auxiliarySelection?.options.map((option) => ({
            auxiliaryOptionId: option.id,
            type:
              participant.auxiliaryVotes?.find(
                (vote: { auxiliaryOptionId: string; type: "yes" | "no" | "ifNeedBe" }) =>
                  vote.auxiliaryOptionId === option.id,
              )?.type ?? "ifNeedBe",
          })) ?? [],
      });
    },
    setEditingParticipantId: (newParticipantId: string) => {
      const participant = participants.find((p) => p.id === newParticipantId);
      if (participant) {
        form.reset({
          mode: "edit",
          participantId: newParticipantId,
          votes: options.map((option) => ({
            optionId: option.id,
            type: participant.votes.find((vote) => vote.optionId === option.id)
              ?.type,
          })),
          auxiliaryVotes:
            auxiliarySelection?.options.map((option) => ({
              auxiliaryOptionId: option.id,
              type:
                participant.auxiliaryVotes.find(
                  (vote) => vote.auxiliaryOptionId === option.id,
                )?.type ?? "ifNeedBe",
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
        votes: options.map((option) => ({
          optionId: option.id,
        })),
        auxiliaryVotes:
          auxiliarySelection?.options.map((option) => ({
            auxiliaryOptionId: option.id,
            type: "ifNeedBe" as const,
          })) ?? [],
      }),
  };
};

export const VotingForm = ({ children }: React.PropsWithChildren) => {
  const { id: pollId, options, auxiliarySelection } = usePoll();
  const updateParticipant = useUpdateParticipantMutation();
  const token = useEditToken();
  const { participants } = useParticipants();

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
      votes: options.map((option) => ({
        optionId: option.id,
      })),
      auxiliaryVotes: auxiliaryOptionIds.map((auxiliaryOptionId) => ({
        auxiliaryOptionId,
        type: "ifNeedBe" as const,
      })),
    },
    resolver: zodResolver(formSchema),
  });

  return (
    <FormProvider {...form}>
      <form
        id="voting-form"
        onSubmit={form.handleSubmit(async (data) => {
          const auxiliaryVotes = normalizeAuxiliaryVotes(
            auxiliaryOptionIds,
            data.auxiliaryVotes,
          );
          if (
            auxiliarySelection &&
            auxiliaryVotes.filter((vote) => vote.type === "yes").length <
              auxiliarySelection.minYes
          ) {
            toast.error(
              `Select Yes for at least ${auxiliarySelection.minYes} ${auxiliarySelection.name} choices.`,
            );
            return;
          }
          if (
            auxiliarySelection?.maxYesSelections !== null &&
            auxiliarySelection?.maxYesSelections !== undefined &&
            auxiliaryVotes.filter((vote) => vote.type === "yes").length >
              auxiliarySelection.maxYesSelections
          ) {
            toast.error(
              `Select Yes for no more than ${auxiliarySelection.maxYesSelections} ${auxiliarySelection.name} choices.`,
            );
            return;
          }

          if (data.participantId) {
            // update participant

            await updateParticipant.mutateAsync({
              participantId: data.participantId,
              pollId,
              votes: normalizeVotes(optionIds, data.votes),
              auxiliaryVotes,
              token,
            });

            form.reset({
              mode: "view",
              participantId: data.participantId,
              votes: options.map((option) => ({
                optionId: option.id,
              })),
              auxiliaryVotes: auxiliaryOptionIds.map(
                (auxiliaryOptionId) => ({
                  auxiliaryOptionId,
                  type: "ifNeedBe" as const,
                }),
              ),
            });
          } else {
            // new participant
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
            votes={normalizeVotes(optionIds, form.watch("votes"))}
            auxiliaryVotes={normalizeAuxiliaryVotes(
              auxiliaryOptionIds,
              form.watch("auxiliaryVotes"),
            )}
            onSubmit={(newParticipant) => {
              form.reset({
                mode: "view",
                participantId: newParticipant.id,
                votes: options.map((option) => ({
                  optionId: option.id,
                })),
                auxiliaryVotes: auxiliaryOptionIds.map(
                  (auxiliaryOptionId) => ({
                    auxiliaryOptionId,
                    type: "ifNeedBe" as const,
                  }),
                ),
              });
            }}
            onCancel={() => setIsNewParticipantModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
      {children}
    </FormProvider>
  );
};
