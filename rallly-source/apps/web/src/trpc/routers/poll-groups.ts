import { prisma } from "@rallly/database";
import { TRPCError } from "@trpc/server";
import * as z from "zod";
import { publicProcedure, router, spaceProcedure } from "../trpc";
import { nanoid } from "@rallly/utils/nanoid";

export const pollGroups = router({
  list: spaceProcedure.query(async ({ ctx }) => {
    return prisma.pollGroup.findMany({
      where: {
        spaceId: ctx.space.id,
      },
      include: {
        polls: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  create: spaceProcedure
    .input(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().optional(),
        pollIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const group = await prisma.pollGroup.create({
        data: {
          title: input.title,
          description: input.description,
          spaceId: ctx.space.id,
          userId: ctx.user.id,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { groupId, title, description, pollIds = [] } = input;

      const group = await prisma.pollGroup.update({
        where: { id: groupId },
        data: {
          title,
          description,
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

      // Assign newly selected polls to group
      if (pollIds.length > 0) {
        await prisma.poll.updateMany({
          where: {
            id: { in: pollIds },
            spaceId: ctx.space.id,
          },
          data: {
            pollGroupId: groupId,
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

  close: spaceProcedure
    .input(z.object({ groupId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.poll.updateMany({
        where: {
          pollGroupId: input.groupId,
          spaceId: ctx.space.id,
          status: "open",
        },
        data: {
          status: "closed",
          closedReason: "manual",
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

      return group;
    }),

  submitGroupVotes: publicProcedure
    .input(
      z.object({
        groupId: z.string(),
        name: z.string().trim().min(1, "Name is required"),
        email: z.string().trim().email("Valid email address is required"),
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
      const { groupId, name, email, note, votes } = input;

      const group = await prisma.pollGroup.findUnique({
        where: { id: groupId },
        select: { id: true },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Poll Group not found",
        });
      }

      for (const voteItem of votes) {
        let existingParticipant = await prisma.participant.findFirst({
          where: {
            pollId: voteItem.pollId,
            deleted: false,
            OR: [
              { email: email },
              ...(ctx.user ? [{ userId: ctx.user.id }] : []),
            ],
          },
        });

        let participantId: string;

        if (existingParticipant) {
          participantId = existingParticipant.id;
          await prisma.participant.update({
            where: { id: participantId },
            data: {
              name,
              email,
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
              email,
              note: note || null,
              pollId: voteItem.pollId,
              userId: ctx.user?.id || null,
            },
          });
          participantId = newParticipant.id;
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

      return { success: true };
    }),

  duplicate: spaceProcedure
    .input(z.object({ groupId: z.string() }))
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

      // Helper to append/increment suffix like " (1)"
      const incrementTitle = (title: string) => {
        const match = title.match(/(.*)\s\((\d+)\)$/);
        if (match) {
          const base = match[1];
          const num = parseInt(match[2], 10);
          return `${base} (${num + 1})`;
        }
        return `${title} (1)`;
      };

      const newGroupId = nanoid();

      await prisma.$transaction(async (tx) => {
        // Create duplicated poll group
        await tx.pollGroup.create({
          data: {
            id: newGroupId,
            title: incrementTitle(group.title),
            description: group.description,
            spaceId: ctx.space.id,
          },
        });

        // Duplicate each poll and its options
        for (const poll of group.polls) {
          const newPollId = nanoid();
          
          await tx.poll.create({
            data: {
              id: newPollId,
              title: incrementTitle(poll.title),
              description: poll.description,
              location: poll.location,
              userId: poll.userId, // keep the same user? yes
              timeZone: poll.timeZone,
              kind: poll.kind,
              hideParticipants: poll.hideParticipants,
              hideScores: poll.hideScores,
              disableComments: poll.disableComments,
              requireParticipantEmail: poll.requireParticipantEmail,
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
});
