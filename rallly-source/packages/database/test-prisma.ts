import { prisma } from "./src/client";

prisma.poll
  .findUnique({
    where: { id: "WJOEm4M7E0JY" },
    select: {
      votes: {
        where: { participant: { deleted: false } },
        select: { type: true, participantId: true },
      },
    },
  })
  .then((result) => console.log(JSON.stringify(result, null, 2)))
  .finally(() => prisma.$disconnect());
