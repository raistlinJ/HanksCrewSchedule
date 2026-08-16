import "server-only";

import type { VoteType } from "@rallly/database";
import { Prisma } from "@rallly/database";
import { TRPCError } from "@trpc/server";
import { AppError } from "@/lib/errors/app-error";

export type AuxiliaryVoteInput = {
  auxiliaryOptionId: string;
  type: VoteType;
};

export async function validateAuxiliaryVotes({
  tx,
  pollId,
  votes,
  participantId,
  enforceMinimum = true,
}: {
  tx: Prisma.TransactionClient;
  pollId: string;
  votes: AuxiliaryVoteInput[];
  participantId?: string;
  enforceMinimum?: boolean;
}): Promise<AuxiliaryVoteInput[]> {
  const selection = await tx.pollAuxiliarySelection.findUnique({
    where: { pollId },
    select: {
      minYes: true,
      maxYesSelections: true,
      options: {
        orderBy: { position: "asc" },
        select: { id: true, maxYes: true },
      },
    },
  });

  if (!selection) {
    return [];
  }

  const submittedVotes = new Map(
    votes.map((vote) => [vote.auxiliaryOptionId, vote.type]),
  );
  const normalizedVotes = selection.options.map((option) => ({
    auxiliaryOptionId: option.id,
    type: submittedVotes.get(option.id) ?? ("ifNeedBe" as const),
  }));

  const yesVotes = normalizedVotes.filter((vote) => vote.type === "yes");
  if (enforceMinimum && yesVotes.length < selection.minYes) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Select Yes for at least ${selection.minYes} auxiliary choices.`,
      cause: new AppError({
        code: "AUXILIARY_MINIMUM_NOT_MET",
        message: "The auxiliary selection minimum was not met",
      }),
    });
  }

  if (
    selection.maxYesSelections !== null &&
    yesVotes.length > selection.maxYesSelections
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Select Yes for no more than ${selection.maxYesSelections} auxiliary choices.`,
      cause: new AppError({
        code: "AUXILIARY_MAXIMUM_EXCEEDED",
        message: "The auxiliary selection maximum was exceeded",
      }),
    });
  }

  const yesOptionIds = yesVotes.map((vote) => vote.auxiliaryOptionId).sort();
  if (yesOptionIds.length === 0) {
    return normalizedVotes;
  }

  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "poll_auxiliary_options" WHERE "auxiliary_selection_id" IN (SELECT "id" FROM "poll_auxiliary_selections" WHERE "poll_id" = ${pollId}) AND "id" IN (${Prisma.join(yesOptionIds)}) ORDER BY "id" FOR UPDATE`,
  );

  const cappedOptions = await tx.pollAuxiliaryOption.findMany({
    where: {
      id: { in: yesOptionIds },
      auxiliarySelection: { pollId },
      maxYes: { not: null },
    },
    select: {
      id: true,
      maxYes: true,
      _count: {
        select: {
          votes: {
            where: {
              type: "yes",
              participant: { deleted: false },
              ...(participantId
                ? { participantId: { not: participantId } }
                : {}),
            },
          },
        },
      },
    },
  });

  const fullOption = cappedOptions.find(
    (option) => option.maxYes !== null && option._count.votes >= option.maxYes,
  );
  if (fullOption) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Yes is full for one of the auxiliary choices. Choose If needed or No instead.",
      cause: new AppError({
        code: "AUXILIARY_OPTION_FULL",
        message: "The auxiliary choice maximum has been reached",
      }),
    });
  }

  return normalizedVotes;
}
