import { prisma } from "@rallly/database";
import { sendRawEmail } from "@rallly/emails";
import { sendNewParticipantConfirmationEmail } from "@rallly/emails/templates/new-participant-confirmation";
import { absoluteUrl } from "@rallly/utils/absolute-url";
import { TRPCError } from "@trpc/server";
import { after } from "next/server";
import * as z from "zod";
import { getInstanceBranding, getSpaceBranding } from "@/emails/branding";
import { createToken, decryptToken } from "@/lib/session";
import { publicProcedure, router, spaceProcedure } from "../trpc";
import { nanoid } from "@rallly/utils/nanoid";

const sortByOrder = <T extends { id: string }>(items: T[], order: string[]) => {
  return [...items].sort((a, b) => {
    const indexA = order.indexOf(a.id);
    const indexB = order.indexOf(b.id);
    if (indexA === -1 && indexB === -1) return 0;
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });
};

type GroupEditTokenPayload = {
  groupId: string;
  email: string;
};

async function getGroupEditTokenPayload(token: string | undefined) {
  if (!token) return null;

  try {
    const payload = await decryptToken<GroupEditTokenPayload>(token);
    if (!payload?.groupId || !payload.email) return null;
    return {
      groupId: payload.groupId,
      email: payload.email.toLowerCase(),
    };
  } catch {
    return null;
  }
}

export const pollGroups = router({
  list: spaceProcedure.query(async ({ ctx }) => {
    const [groups, space] = await Promise.all([
      prisma.pollGroup.findMany({
        where: { spaceId: ctx.space.id },
        include: {
          polls: {
            where: { deleted: false },
            select: {
              id: true,
              title: true,
              status: true,
              votes: {
                where: { participant: { deleted: false } },
                select: { type: true, participantId: true }
              }
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.space.findUnique({
        where: { id: ctx.space.id },
        select: { pollGroupOrder: true },
      }),
    ]);

    const mappedGroups = groups.map((group) => {
      const pollsWithCounts = group.polls.map(poll => ({
        id: poll.id,
        title: poll.title,
        status: poll.status,
        voteCounts: {
          yes: new Set(poll.votes.filter(v => v.type === "yes").map(v => v.participantId)).size,
          no: new Set(poll.votes.filter(v => v.type === "no").map(v => v.participantId)).size,
          ifNeedBe: new Set(poll.votes.filter(v => v.type === "ifNeedBe").map(v => v.participantId)).size,
        }
      }));

      return {
        ...group,
        polls: sortByOrder(pollsWithCounts, group.pollOrder),
      };
    });

    return sortByOrder(mappedGroups, space?.pollGroupOrder || []);
  }),

  reorderGroups: spaceProcedure
    .input(
      z.object({
        groupIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await prisma.space.update({
        where: { id: ctx.space.id },
        data: {
          pollGroupOrder: input.groupIds,
        },
      });
      return { success: true };
    }),

  create: spaceProcedure
    .input(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().optional(),
        pollIds: z.array(z.string()).optional(),
        requireEmailVerification: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.create({
        data: {
          title: input.title,
          description: input.description,
          spaceId: ctx.space.id,
          userId: ctx.user.id,
          pollOrder: input.pollIds || [],
          requireEmailVerification: input.requireEmailVerification ?? false,
        },
      });

      if (input.pollIds && input.pollIds.length > 0) {
        await prisma.poll.updateMany({
          where: {
            id: { in: input.pollIds },
            spaceId: ctx.space.id,
          },
          data: {
            pollGroupId: group.id,
            requireParticipantEmail: group.requireEmailVerification,
            requireEmailVerification: group.requireEmailVerification,
          },
        });
      }

      return group;
    }),

  update: spaceProcedure
    .input(
      z.object({
        groupId: z.string(),
        title: z.string().trim().min(1),
        description: z.string().trim().optional(),
        pollIds: z.array(z.string()).optional(),
        requireEmailVerification: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, title, description, pollIds = [], requireEmailVerification } = input;

      const existingGroup = await prisma.pollGroup.findUnique({
        where: { id: groupId },
        select: { pollOrder: true, requireEmailVerification: true },
      });

      if (!existingGroup) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const existingOrder = existingGroup.pollOrder;
      const newPollOrder = [
        ...existingOrder.filter((id) => pollIds.includes(id)),
        ...pollIds.filter((id) => !existingOrder.includes(id)),
      ];
      const newRequireEmail =
        requireEmailVerification ?? existingGroup.requireEmailVerification;

      const group = await prisma.pollGroup.update({
        where: { id: groupId },
        data: {
          title,
          description,
          pollOrder: newPollOrder,
          requireEmailVerification: newRequireEmail,
        },
      });

      // Unassign polls removed from group
      await prisma.poll.updateMany({
        where: {
          pollGroupId: groupId,
          id: { notIn: pollIds },
        },
        data: {
          pollGroupId: null,
        },
      });

      // Assign newly selected polls to group and cascade email settings if changed
      const emailSettingsChanged = newRequireEmail !== existingGroup.requireEmailVerification;
      
      const newlyAddedPolls = pollIds.filter(id => !existingOrder.includes(id));
      const existingPollsRetained = pollIds.filter(id => existingOrder.includes(id));

      if (newlyAddedPolls.length > 0) {
        await prisma.poll.updateMany({
          where: {
            id: { in: newlyAddedPolls },
            spaceId: ctx.space.id,
          },
          data: {
            pollGroupId: groupId,
            requireParticipantEmail: newRequireEmail,
            requireEmailVerification: newRequireEmail,
          },
        });
      }

      if (emailSettingsChanged && existingPollsRetained.length > 0) {
        await prisma.poll.updateMany({
          where: {
            id: { in: existingPollsRetained },
            spaceId: ctx.space.id,
          },
          data: {
            requireParticipantEmail: newRequireEmail,
            requireEmailVerification: newRequireEmail,
          },
        });
      }

      return group;
    }),

  delete: spaceProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ input }) => {
      await prisma.pollGroup.delete({
        where: { id: input.groupId },
      });
      return { success: true };
    }),

  reorder: spaceProcedure
    .input(
      z.object({
        groupId: z.string(),
        pollIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      await prisma.pollGroup.update({
        where: { id: input.groupId },
        data: {
          pollOrder: input.pollIds,
        },
      });
      return { success: true };
    }),

  close: spaceProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.poll.updateMany({
        where: {
          pollGroupId: input.groupId,
          spaceId: ctx.space.id,
          status: { not: "closed" },
        },
        data: {
          status: "closed",
          closedReason: "manual",
        },
      });
      return { success: true };
    }),

  reopen: spaceProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.poll.updateMany({
        where: {
          pollGroupId: input.groupId,
          spaceId: ctx.space.id,
          status: "closed",
        },
        data: {
          status: "open",
          closedReason: null,
        },
      });
      return { success: true };
    }),

  getPublicGroup: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId },
        include: {
          polls: {
            where: { deleted: false },
            include: {
              options: {
                orderBy: { startTime: "asc" },
              },
              participants: {
                where: { deleted: false },
                include: { votes: true },
              },
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      return {
        ...group,
        polls: sortByOrder(group.polls, group.pollOrder),
      };
    }),

  
  getParticipantByEmail: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        email: z.string().email(),
      }),
    )
    .query(async ({ input }) => {
      const { groupId, email } = input;
      
      const group = await prisma.pollGroup.findUnique({
        where: { id: groupId },
        select: { requireEmailVerification: true, polls: { select: { id: true } } },
      });

      if (!group) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });
      }

      if (group.requireEmailVerification) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Email verification is required for this group" });
      }

      const pollIds = group.polls.map(p => p.id);
      
      const participants = await prisma.participant.findMany({
        where: {
          pollId: { in: pollIds },
          email: email,
          deleted: false,
        },
        include: {
          votes: true
        }
      });

      return participants;
    }),

  getParticipantByEditToken: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        token: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const payload = await getGroupEditTokenPayload(input.token);
      if (!payload || payload.groupId !== input.groupId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This edit link is invalid or has expired",
        });
      }

      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId },
        select: {
          requireEmailVerification: true,
          polls: { select: { id: true } },
        },
      });

      if (!group || !group.requireEmailVerification) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This edit link is not valid for this group",
        });
      }

      return prisma.participant.findMany({
        where: {
          pollId: { in: group.polls.map((poll) => poll.id) },
          email: payload.email,
          deleted: false,
        },
        include: { votes: true },
      });
    }),

  submitGroupVotes: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        name: z.string().trim().min(1, "Name is required"),
        email: z.string().trim().email("Valid email address is required"),
        token: z.string().optional(),
        note: z.string().optional(),
        votes: z.array(
          z.object({
            pollId: z.string(),
            options: z.array(
              z.object({
                optionId: z.string(),
                type: z.enum(["yes", "no", "ifNeedBe"]),
              })
            ),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, name, email, token, note, votes } = input;
      const normalizedEmail = email.toLowerCase();

      const group = await prisma.pollGroup.findUnique({
        where: { id: groupId },
        select: {
          id: true,
          title: true,
          requireEmailVerification: true,
          polls: { where: { deleted: false }, select: { id: true } },
          space: {
            select: {
              showBranding: true,
              hideAttribution: true,
              primaryColor: true,
              image: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      const groupPollIds = new Set(group.polls.map((poll) => poll.id));
      const editTokenPayload = group.requireEmailVerification
        ? await getGroupEditTokenPayload(token)
        : null;
      const hasValidEditToken = editTokenPayload?.groupId === groupId;
      if (
        hasValidEditToken &&
        editTokenPayload.email !== normalizedEmail
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "The response email cannot be changed from an edit link",
        });
      }
      const participantLookupEmail = hasValidEditToken
        ? editTokenPayload.email
        : normalizedEmail;
      let createdParticipant = false;

      for (const voteItem of votes) {
        if (!groupPollIds.has(voteItem.pollId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A submitted poll does not belong to this group",
          });
        }

        let existingParticipant = await prisma.participant.findFirst({
          where: {
            pollId: voteItem.pollId,
            deleted: false,
            OR: [
              { email: participantLookupEmail },
              ...(ctx.user ? [{ userId: ctx.user.id }] : []),
            ],
          },
        });

        if (existingParticipant && group.requireEmailVerification) {
           const isOwner = existingParticipant.userId && ctx.user && existingParticipant.userId === ctx.user.id;
           if (!isOwner && !hasValidEditToken) {
             throw new TRPCError({ code: "FORBIDDEN", message: "Use the edit link sent to your email to update this response." });
           }
        }

        let participantId: string;

        if (existingParticipant) {
          participantId = existingParticipant.id;
          await prisma.participant.update({
            where: { id: participantId },
            data: {
              name,
              email: normalizedEmail,
              note: note || null,
              updatedAt: new Date(),
            },
          });

          await prisma.vote.deleteMany({
            where: { participantId },
          });
        } else {
          const newParticipant = await prisma.participant.create({
            data: {
              name,
              email: normalizedEmail,
              note: note || null,
              pollId: voteItem.pollId,
              userId: ctx.user?.id || null,
            },
          });
          participantId = newParticipant.id;
          createdParticipant = true;
        }

        if (voteItem.options.length > 0) {
          await prisma.vote.createMany({
            data: voteItem.options.map((opt) => ({
              participantId,
              optionId: opt.optionId,
              pollId: voteItem.pollId,
              type: opt.type,
            })),
          });
        }
      }

      if (createdParticipant && group.requireEmailVerification) {
        const editToken = await createToken(
          { groupId, email: normalizedEmail },
          { ttl: 0 },
        );

        after(async () =>
          sendNewParticipantConfirmationEmail({
            to: normalizedEmail,
            locale: ctx.locale,
            branding: group.space
              ? await getSpaceBranding(group.space)
              : await getInstanceBranding(),
            props: {
              title: group.title,
              editSubmissionUrl: absoluteUrl(`/g/${groupId}?token=${editToken}`),
            },
          }),
        );
      }

      return { success: true };
    }),

  duplicate: spaceProcedure
    .input(z.object({ groupId: z.string(), newName: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId },
        include: {
          polls: {
            include: {
              options: true,
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      const existingName = await prisma.pollGroup.findFirst({
        where: {
          spaceId: ctx.space.id,
          title: input.newName,
        }
      });

      if (existingName) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A group with that name already exists.",
        });
      }

      const newGroupId = nanoid();

      await prisma.$transaction(async (tx) => {
        // Create duplicated poll group
        await tx.pollGroup.create({
          data: {
            id: newGroupId,
            title: input.newName,
            description: group.description,
            spaceId: ctx.space.id,
            pollOrder: group.pollOrder,
            requireEmailVerification: group.requireEmailVerification,
          },
        });

        // Duplicate each poll and its options
        for (const poll of group.polls) {
          const newPollId = nanoid();
          
          await tx.poll.create({
            data: {
              id: newPollId,
              title: `${poll.title} - ${input.newName}`,
              description: poll.description,
              location: poll.location,
              userId: poll.userId, // keep the same user? yes
              timeZone: poll.timeZone,
              kind: poll.kind,
              hideParticipants: poll.hideParticipants,
              hideScores: poll.hideScores,
              disableComments: poll.disableComments,
              requireParticipantEmail: poll.requireParticipantEmail,
              requireEmailVerification: poll.requireEmailVerification,
              muted: poll.muted,
              deadline: poll.deadline,
              status: poll.status,
              spaceId: ctx.space.id,
              pollGroupId: newGroupId,
            },
          });

          // Duplicate options
          if (poll.options.length > 0) {
            await tx.option.createMany({
              data: poll.options.map((opt) => ({
                id: nanoid(),
                pollId: newPollId,
                startTime: opt.startTime,
                duration: opt.duration,
              })),
            });
          }
        }
      });

      return { newGroupId };
    }),
  getRemindableParticipants: spaceProcedure
    .input(z.object({ groupId: z.string() }))
    .query(async ({ ctx, input }) => {
      console.error("DEBUG getRemindableParticipants HIT for group:", input.groupId, "space:", ctx.space?.id);
      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId, spaceId: ctx.space.id },
        include: {
          polls: {
            where: { deleted: false },
            include: {
              participants: {
                where: { deleted: false, email: { not: null } },
                include: {
                  votes: true
                }
              }
            }
          }
        }
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      const participantMap = new Map<string, { name: string, email: string }>();
      for (const poll of group.polls) {
        for (const participant of poll.participants) {
          if (participant.email) {
            // Check if they voted "yes"
            const hasYesVote = participant.votes.some(v => v.type === "yes");
            if (hasYesVote) {
              const key = participant.email.toLowerCase();
              if (!participantMap.has(key)) {
                participantMap.set(key, { name: participant.name, email: participant.email });
              }
            }
          }
        }
      }

      return Array.from(participantMap.values());
    }),
  sendReminderEmails: spaceProcedure
    .input(z.object({ groupId: z.string(), subject: z.string(), body: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId, spaceId: ctx.space.id },
        include: {
          polls: {
            where: { deleted: false },
            include: {
              participants: {
                where: { deleted: false, email: { not: null } },
                include: {
                  votes: true
                }
              }
            }
          }
        }
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      const emails = new Set<string>();
      for (const poll of group.polls) {
        for (const participant of poll.participants) {
          if (participant.email) {
            const hasYesVote = participant.votes.some(v => v.type === "yes");
            if (hasYesVote) {
              emails.add(participant.email);
            }
          }
        }
      }

      const subject = input.subject;
      const textBody = input.body;
      
      // Dispatch emails in parallel
      await Promise.all(
        Array.from(emails).map((email) =>
          sendRawEmail({
            to: email,
            subject: subject,
            text: textBody,
          })
        )
      );

      return { success: true, count: emails.size };
    }),
  autoCreateParticipant: spaceProcedure
    .input(z.object({
      pollId: z.string(),
      name: z.string().min(1),
      email: z.string().optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const poll = await prisma.poll.findUnique({ where: { id: input.pollId } });
      if (!poll || poll.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Poll not found or access denied" });
      }

      const emailStr = input.email ? input.email.toLowerCase() : null;

      // Check if participant already exists in this poll
      const existing = await prisma.participant.findFirst({
        where: {
          pollId: input.pollId,
          ...(emailStr ? { email: emailStr } : { name: input.name, email: null }),
        }
      });

      if (existing) {
        return existing;
      }

      const participant = await prisma.participant.create({
        data: {
          name: input.name,
          email: emailStr,
          pollId: input.pollId,
        }
      });
      return participant;
    }),
  cycleVote: spaceProcedure
    .input(z.object({ 
      voteId: z.string().optional(),
      participantId: z.string(),
      optionId: z.string(),
      pollId: z.string(),
      type: z.enum(["yes", "no", "ifNeedBe"]).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      // Ensure the poll belongs to the current space
      const poll = await prisma.poll.findUnique({ where: { id: input.pollId } });
      if (!poll || poll.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Poll not found or access denied" });
      }

      if (input.voteId) {
        // Vote exists — use explicit type if provided, otherwise cycle
        const vote = await prisma.vote.findUnique({ where: { id: input.voteId } });
        if (!vote) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Vote not found" });
        }
        
        let newType = input.type;
        if (!newType) {
          if (vote.type === "no") newType = "ifNeedBe";
          else if (vote.type === "ifNeedBe") newType = "yes";
          else newType = "no";
        }

        const updatedVote = await prisma.vote.update({
          where: { id: input.voteId },
          data: { type: newType }
        });
        return updatedVote;
      } else {
        // Vote doesn't exist — use explicit type if provided, otherwise default to ifNeedBe
        const newType = input.type || "ifNeedBe";
        const newVote = await prisma.vote.create({
          data: {
            participantId: input.participantId,
            optionId: input.optionId,
            pollId: input.pollId,
            type: newType
          }
        });
        return newVote;
      }
    }),
  addGroupParticipant: spaceProcedure
    .input(z.object({
      groupId: z.string(),
      name: z.string().min(1, "Name is required"),
      email: z.string().email().optional().or(z.literal(''))
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({
        where: { id: input.groupId },
        include: { polls: true }
      });

      if (!group || group.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Group not found or access denied" });
      }

      const emailStr = input.email ? input.email.toLowerCase() : null;

      const participants = await Promise.all(group.polls.map(poll => 
        prisma.participant.create({
          data: {
            name: input.name,
            email: emailStr,
            pollId: poll.id,
          }
        })
      ));

      return { success: true, count: participants.length };
    }),
  deleteGroupParticipant: spaceProcedure
    .input(z.object({
      groupId: z.string(),
      participantIds: z.array(z.string())
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({ where: { id: input.groupId } });
      if (!group || group.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Group not found or access denied" });
      }

      await prisma.participant.updateMany({
        where: { id: { in: input.participantIds } },
        data: {
          deleted: true,
          deletedAt: new Date()
        }
      });
      return { success: true };
    }),
  updateGroupParticipant: spaceProcedure
    .input(z.object({
      groupId: z.string(),
      participantIds: z.array(z.string()),
      name: z.string().min(1, "Name is required"),
      email: z.string().email().optional().or(z.literal(''))
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({ where: { id: input.groupId } });
      if (!group || group.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Group not found or access denied" });
      }
      const emailStr = input.email ? input.email.toLowerCase() : null;
      await prisma.participant.updateMany({
        where: { id: { in: input.participantIds } },
        data: { name: input.name, email: emailStr }
      });
      return { success: true };
    }),
  updateOption: spaceProcedure
    .input(z.object({
      groupId: z.string(),
      optionId: z.string(),
      startTime: z.string().datetime(),
      duration: z.number().min(0)
    }))
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.findUnique({ where: { id: input.groupId } });
      if (!group || group.spaceId !== ctx.space.id) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Group not found or access denied" });
      }
      
      const option = await prisma.option.findUnique({ where: { id: input.optionId }, include: { poll: true } });
      if (!option || option.poll.pollGroupId !== input.groupId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Option not found in this group" });
      }

      await prisma.option.update({
        where: { id: input.optionId },
        data: { startTime: new Date(input.startTime), duration: input.duration }
      });
      return { success: true };
    })
});
