import "server-only";

import { Prisma } from "@rallly/database";
import { TRPCError } from "@trpc/server";
import { AppError } from "@/lib/errors/app-error";

export async function assertYesCapacity({
  tx,
  pollId,
  optionIds,
  participantId,
}: {
  tx: Prisma.TransactionClient;
  pollId: string;
  optionIds: string[];
  participantId?: string;
}) {
  const uniqueOptionIds = [...new Set(optionIds)].sort();
  if (uniqueOptionIds.length === 0) {
    return;
  }

  // Lock option rows in a stable order. Concurrent voters for the same option
  // then serialize before counting, preventing both from claiming the last
  // available Yes place.
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "options" WHERE "poll_id" = ${pollId} AND "id" IN (${Prisma.join(uniqueOptionIds)}) ORDER BY "id" FOR UPDATE`,
  );

  const options = await tx.option.findMany({
    where: { id: { in: uniqueOptionIds }, pollId },
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

  const fullOption = options.find(
    (option) => option.maxYes !== null && option._count.votes >= option.maxYes,
  );

  if (fullOption) {
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "Yes is full for one of the selected options. Choose If needed or No instead.",
      cause: new AppError({
        code: "OPTION_FULL",
        message: "The maximum number of Yes responses has been reached",
      }),
    });
  }
}
