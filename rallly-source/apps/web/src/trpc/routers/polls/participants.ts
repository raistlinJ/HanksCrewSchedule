import type { Participant, VoteType } from "@rallly/database";
import { prisma } from "@rallly/database";
import { sendNewParticipantEmail } from "@rallly/emails/templates/new-participant";
import { sendNewParticipantConfirmationEmail } from "@rallly/emails/templates/new-participant-confirmation";
import { createLogger } from "@rallly/logger";
import { absoluteUrl } from "@rallly/utils/absolute-url";
import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import * as z from "zod";
import { getInstanceBranding, getSpaceBranding } from "@/emails/branding";
import { getNotificationRecipient } from "@/features/notifications/data";
import { validateAuxiliaryVotes } from "@/features/poll/auxiliary-selection/mutations";
import { hasPollAdminAccess } from "@/features/poll/data";
import { canAccessParticipantByEmail } from "@/features/poll/email-access/utils";
import { addUserAsPollParticipant } from "@/features/poll/mutations";
import {
  getLatestVoteDate,
  redactPublicResultParticipants,
} from "@/features/poll/poll-results/utils";
import { assertYesCapacity } from "@/features/poll/yes-capacity/mutations";
import { AppError } from "@/lib/errors/app-error";
import { track } from "@/lib/posthog";
import {
  createRateLimitMiddleware,
  privateProcedure,
  publicProcedure,
  requireUserMiddleware,
  router,
} from "../../trpc";
import { responseNoteInput } from "./schema";
import {
  createParticipantEditToken,
  tryResolveActor,
  tryResolveUserId,
} from "./utils";

const logger = createLogger("participants");

const MAX_PARTICIPANTS = 1000;

function createParticipantFullDTO(
  participant: Participant & { user: { image: string | null } | null } & {
    votes: {
      optionId: string;
      type: VoteType;
      createdAt: Date;
      updatedAt: Date | null;
    }[];
    auxiliaryVotes: {
      auxiliaryOptionId: string;
      type: VoteType;
      createdAt: Date;
      updatedAt: Date | null;
    }[];
  },
) {
  const { votes, auxiliaryVotes, user, ...rest } = participant;
  return {
    ...rest,
    image: user?.image ?? null,
    votedAt: getLatestVoteDate([...votes, ...auxiliaryVotes]),
    votes: votes.map(({ optionId, type }) => ({ optionId, type })),
    auxiliaryVotes: auxiliaryVotes.map(({ auxiliaryOptionId, type }) => ({
      auxiliaryOptionId,
      type,
    })),
    hidden: false,
  };
}

async function authorizeParticipantModification({
  participantId,
  token,
  ctxUser,
  accessEmail,
}: {
  participantId: string;
  token?: string;
  ctxUser?: { id: string; isGuest: boolean };
  accessEmail?: string;
}) {
  const participant = await prisma.participant.findUnique({
    where: { id: participantId },
    select: {
      id: true,
      pollId: true,
      userId: true,
      email: true,
      poll: { select: { requireEmailVerification: true } },
    },
  });

  if (!participant) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Participant not found",
    });
  }

  const emailAuthorized = canAccessParticipantByEmail({
    requireEmailVerification: participant.poll.requireEmailVerification,
    participantEmail: participant.email,
    accessEmail: accessEmail ?? null,
  });
  const actor = await tryResolveActor(token, ctxUser);
  const isOwner = !!actor && participant.userId === actor.id;

  if (
    !emailAuthorized &&
    !isOwner &&
    !(actor && (await hasPollAdminAccess(participant.pollId, actor.id)))
  ) {
    throw new TRPCError({
      code: actor ? "FORBIDDEN" : "UNAUTHORIZED",
      message: "You are not allowed to modify this participant",
    });
  }

  return {
    participant,
    emailAuthorized,
    actor:
      actor ??
      ({
        id: participant.userId ?? participant.id,
        isGuest: true,
      } as const),
  };
}

async function sendNewResponseNotificationEmail({
  pollId,
  pollTitle,
  participantName,
  participantEmail,
  note,
  excludeUserId,
}: {
  pollId: string;
  pollTitle: string;
  participantName: string;
  participantEmail: string | null;
  note: string | null;
  excludeUserId: string;
}) {
  try {
    const recipient = await getNotificationRecipient({
      pollId,
      type: "poll.response.submitted",
      excludeUserId,
    });

    if (!recipient) {
      return;
    }

    await sendNewParticipantEmail({
      to: recipient.email,
      locale: recipient.locale ?? undefined,
      branding: await getInstanceBranding(),
      replyTo: participantEmail ?? undefined,
      props: {
        participantName,
        note: note ?? undefined,
        canReply: !!participantEmail,
        pollUrl: absoluteUrl(`/poll/${pollId}`),
        disableNotificationsUrl: absoluteUrl("/settings/notifications"),
        title: pollTitle,
      },
    });
  } catch (err) {
    logger.error(
      { error: err, pollId },
      "Failed to send new response notification email",
    );
  }
}

export const participants = router({
  list: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        token: z.string().optional(),
        accessEmail: z.email().optional(),
        publicResultsView: z.boolean().optional().default(false),
      }),
    )
    .query(
      async ({
        ctx,
        input: { pollId, token, accessEmail, publicResultsView },
      }) => {
        const poll = await prisma.poll.findUnique({
          where: { id: pollId },
          select: {
            hideParticipants: true,
            requireEmailVerification: true,
            publicResults: true,
            deleted: true,
          },
        });

        // A deleted poll never exposes its participants.
        if (!poll || poll.deleted) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Poll not found" });
        }

        if (publicResultsView && !poll.publicResults) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Poll not found" });
        }

        const rawParticipants = await prisma.participant.findMany({
          where: {
            pollId,
            deleted: false,
          },
          include: {
            votes: {
              select: {
                optionId: true,
                type: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            auxiliaryVotes: {
              select: {
                auxiliaryOptionId: true,
                type: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            user: {
              select: {
                image: true,
              },
            },
          },
          orderBy: [
            {
              createdAt: "desc",
            },
            { name: "desc" },
          ],
        });

        // Admin check is intentionally bound to ctx.user only — an edit
        // token must never unlock the admin view of other participants.
        const isAdmin = ctx.user
          ? await hasPollAdminAccess(pollId, ctx.user.id)
          : false;

        // Fall back to the edit token so a guest can still see their own
        // response when opening the email link in a fresh browser.
        const viewerId = isAdmin
          ? null
          : await tryResolveUserId(token, ctx.user);
        const canViewParticipantByEmail = (participantEmail: string | null) =>
          canAccessParticipantByEmail({
            requireEmailVerification: poll.requireEmailVerification,
            participantEmail,
            accessEmail: accessEmail ?? null,
          });

        // Response notes are visible to the host and their author only: strip
        // them from every other payload rather than hiding them in the UI.
        const participants = rawParticipants.map((participant) => {
          const dto = createParticipantFullDTO(participant);
          if (
            isAdmin ||
            (participant.userId && participant.userId === viewerId) ||
            canViewParticipantByEmail(participant.email)
          ) {
            return dto;
          }
          return { ...dto, note: null };
        });

        // Hide participants if the poll has hideParticipants enabled
        // and the current user is not an admin
        let visibleParticipants = participants;
        if (poll.hideParticipants) {
          if (!isAdmin) {
            visibleParticipants = participants.map((participant) => {
              if (
                (viewerId && participant.userId === viewerId) ||
                canViewParticipantByEmail(participant.email)
              ) {
                return participant;
              }

              return {
                ...participant,
                userId: null,
                name: "",
                email: null,
                image: null,
                hidden: true,
              };
            });
          }
        }

        return publicResultsView
          ? redactPublicResultParticipants(visibleParticipants)
          : visibleParticipants;
      },
    ),
  delete: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        token: z.string().optional(),
        accessEmail: z.email().optional(),
      }),
    )
    .mutation(
      async ({ input: { participantId, token, accessEmail }, ctx }) => {
        const { actor, participant } = await authorizeParticipantModification({
          participantId,
          token,
          ctxUser: ctx.user,
          accessEmail,
        });

        await prisma.participant.update({
          where: {
            id: participantId,
          },
          data: {
            deleted: true,
            deletedAt: new Date(),
          },
        });

        track(
          { ...actor, anonymousDistinctId: ctx.anonymousDistinctId },
          {
            event: "poll_response_delete",
            properties: {
              participant_id: participant.id,
            },
            groups: {
              poll: participant.pollId,
            },
          },
        );
      },
    ),
  addManaged: privateProcedure
    .input(
      z.object({
        pollId: z.string(),
        name: z
          .string()
          .trim()
          .min(1, "Participant name is required")
          .max(100),
        email: z.email(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!(await hasPollAdminAccess(input.pollId, ctx.user.id))) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not allowed to add participants to this poll",
        });
      }

      const participantCount = await prisma.participant.count({
        where: { pollId: input.pollId, deleted: false },
      });

      if (participantCount >= MAX_PARTICIPANTS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `This poll has reached its maximum limit of ${MAX_PARTICIPANTS} participants`,
          cause: new AppError({
            code: "POLL_FULL",
            message: "Poll has reached the maximum number of participants",
          }),
        });
      }

      const result = await addUserAsPollParticipant(input);

      if (!result.ok) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            result.reason === "participant_exists"
              ? "A participant with this email already exists"
              : "This user cannot be added",
        });
      }

      return result;
    }),
  add: publicProcedure
    .use(createRateLimitMiddleware("add_participant", 10, "1 h"))
    .use(requireUserMiddleware)
    .input(
      z.object({
        pollId: z.string(),
        name: z.string().trim().min(1, "Participant name is required").max(100),
        email: z.string().optional(),
        note: responseNoteInput,
        timeZone: z.string().optional(),
        votes: z
          .object({
            optionId: z.string(),
            type: z.enum(["yes", "no", "ifNeedBe"]),
          })
          .array(),
        auxiliaryVotes: z
          .object({
            auxiliaryOptionId: z.string(),
            type: z.enum(["yes", "no", "ifNeedBe"]),
          })
          .array()
          .optional()
          .default([]),
      }),
    )
    .mutation(
      async ({
        ctx,
        input: {
          pollId,
          votes,
          auxiliaryVotes,
          name,
          email,
          note,
          timeZone,
        },
      }) => {
        const participantCount = await prisma.participant.count({
          where: {
            pollId,
            deleted: false,
          },
        });

        if (participantCount >= MAX_PARTICIPANTS) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `This poll has reached its maximum limit of ${MAX_PARTICIPANTS} participants`,
            cause: new AppError({
              code: "POLL_FULL",
              message: "Poll has reached the maximum number of participants",
            }),
          });
        }

        const options = await prisma.option.findMany({
          where: {
            pollId,
          },
          select: {
            id: true,
          },
        });

        const existingOptionIds = new Set(options.map((option) => option.id));

        const validVotes = votes.filter(({ optionId }) =>
          existingOptionIds.has(optionId),
        );

        const participant = await prisma.$transaction(async (tx) => {
          await assertYesCapacity({
            tx,
            pollId,
            optionIds: validVotes
              .filter(({ type }) => type === "yes")
              .map(({ optionId }) => optionId),
          });
          const validAuxiliaryVotes = await validateAuxiliaryVotes({
            tx,
            pollId,
            votes: validVotes.some(({ type }) => type === "yes")
              ? auxiliaryVotes
              : [],
            enforceMinimum: validVotes.some(({ type }) => type === "yes"),
          });

          return tx.participant.create({
            data: {
              pollId: pollId,
              name: name,
              email: email?.toLowerCase(),
              note,
              timeZone,
              userId: ctx.user.id,
              locale: ctx.locale,
              votes: {
                createMany: {
                  data: validVotes.map(({ optionId, type }) => ({
                    pollId,
                    optionId,
                    type,
                  })),
                },
              },
              auxiliaryVotes: {
                createMany: {
                  data: validAuxiliaryVotes.map(
                    ({ auxiliaryOptionId, type }) => ({
                      pollId,
                      auxiliaryOptionId,
                      type,
                    }),
                  ),
                },
              },
            },
            include: {
              votes: {
                select: {
                  optionId: true,
                  type: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
              auxiliaryVotes: {
                select: {
                  auxiliaryOptionId: true,
                  type: true,
                  createdAt: true,
                  updatedAt: true,
                },
              },
              user: {
                select: {
                  image: true,
                },
              },
              poll: {
                select: {
                  id: true,
                  title: true,
                  space: {
                    select: {
                      id: true,
                      tier: true,
                      showBranding: true,
                      hideAttribution: true,
                      primaryColor: true,
                      image: true,
                    },
                  },
                },
              },
            },
          });
        });

        const totalResponses = participantCount + 1;

        if (email) {
          const token = await createParticipantEditToken(ctx.user.id);

          const space = participant.poll.space;

          after(async () =>
            sendNewParticipantConfirmationEmail({
              to: email,
              locale: ctx.locale,
              branding: space
                ? await getSpaceBranding(space)
                : await getInstanceBranding(),
              props: {
                title: participant.poll.title,
                editSubmissionUrl: absoluteUrl(
                  `/invite/${participant.poll.id}?token=${token}`,
                ),
              },
            }),
          );
        }

        after(() =>
          sendNewResponseNotificationEmail({
            pollId,
            pollTitle: participant.poll.title,
            participantName: participant.name,
            participantEmail: participant.email,
            note: participant.note,
            excludeUserId: ctx.user.id,
          }),
        );

        track(
          { ...ctx.user, anonymousDistinctId: ctx.anonymousDistinctId },
          {
            event: "poll_response_submit",
            properties: {
              participant_id: participant.id,
              // plain properties, not groups: guest events are personless and
              // PostHog drops group associations without person processing
              poll_id: pollId,
              space_id: participant.poll.space?.id,
              tier: participant.poll.space?.tier,
              has_email: !!email,
              has_note: !!participant.note,
              note_length: participant.note?.length,
              total_responses: totalResponses,
            },
            groups: {
              poll: pollId,
            },
          },
        );

        return createParticipantFullDTO(participant);
      },
    ),
  rename: publicProcedure
    .input(
      z.object({
        participantId: z.string(),
        newName: z.string().min(1, "Participant name is required").max(100),
        newEmail: z.string().email().optional().or(z.literal('')),
        token: z.string().optional(),
        accessEmail: z.email().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { participantId, newName, newEmail, token, accessEmail } = input;
      const { emailAuthorized } = await authorizeParticipantModification({
        participantId,
        token,
        ctxUser: ctx.user,
        accessEmail,
      });

      if (emailAuthorized && !newEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "An email address is required",
        });
      }
      
      const emailStr = newEmail ? newEmail.toLowerCase() : null;

      await prisma.participant.update({
        where: {
          id: participantId,
        },
        data: {
          name: newName,
          email: emailStr,
        },
        select: null,
      });
    }),
  update: publicProcedure
    .input(
      z.object({
        pollId: z.string(),
        participantId: z.string(),
        votes: z
          .object({
            optionId: z.string(),
            type: z.enum(["yes", "no", "ifNeedBe"]),
          })
          .array(),
        auxiliaryVotes: z
          .object({
            auxiliaryOptionId: z.string(),
            type: z.enum(["yes", "no", "ifNeedBe"]),
          })
          .array()
          .optional()
          .default([]),
        token: z.string().optional(),
        accessEmail: z.email().optional(),
      }),
    )
    .mutation(
      async ({ input, ctx }) => {
      const { participantId, votes, auxiliaryVotes, token, accessEmail } = input;
      const { actor, participant: existingParticipant } =
        await authorizeParticipantModification({
          participantId,
          token,
          ctxUser: ctx.user,
          accessEmail,
        });

      const pollId = existingParticipant.pollId;

      const participant = await prisma.$transaction(async (tx) => {
        const options = await tx.option.findMany({
          where: {
            pollId,
          },
          select: {
            id: true,
          },
        });

        const existingOptionIds = new Set(options.map((option) => option.id));

        const validVotes = votes.filter(({ optionId }) =>
          existingOptionIds.has(optionId),
        );

        await assertYesCapacity({
          tx,
          pollId,
          participantId,
          optionIds: validVotes
            .filter(({ type }) => type === "yes")
            .map(({ optionId }) => optionId),
        });
        const validAuxiliaryVotes = await validateAuxiliaryVotes({
          tx,
          pollId,
          participantId,
          votes: validVotes.some(({ type }) => type === "yes")
            ? auxiliaryVotes
            : [],
          enforceMinimum: validVotes.some(({ type }) => type === "yes"),
        });

        // Delete existing votes
        await tx.vote.deleteMany({
          where: {
            participantId,
          },
        });

        // Create new votes
        await tx.vote.createMany({
          data: validVotes.map(({ optionId, type }) => ({
            optionId,
            type,
            pollId,
            participantId,
          })),
        });
        await tx.pollAuxiliaryVote.deleteMany({
          where: { participantId },
        });
        await tx.pollAuxiliaryVote.createMany({
          data: validAuxiliaryVotes.map(({ auxiliaryOptionId, type }) => ({
            auxiliaryOptionId,
            type,
            pollId,
            participantId,
          })),
        });

        // Bump `updatedAt` so it reflects this vote change; the poll cleanup
        // job uses it to detect recent activity. An empty `data: {}` update is
        // a no-op for `@updatedAt`, so set it explicitly.
        return tx.participant.update({
          where: {
            id: participantId,
          },
          data: { updatedAt: new Date() },
          include: {
            votes: {
              select: {
                optionId: true,
                type: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            auxiliaryVotes: {
              select: {
                auxiliaryOptionId: true,
                type: true,
                createdAt: true,
                updatedAt: true,
              },
            },
            user: {
              select: {
                image: true,
              },
            },
          },
        });
      });

      track(
        { ...actor, anonymousDistinctId: ctx.anonymousDistinctId },
        {
          event: "poll_response_update",
          groups: {
            poll: pollId,
          },
        },
      );

      return createParticipantFullDTO(participant);
      },
    ),
});
