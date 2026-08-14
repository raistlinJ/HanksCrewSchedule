import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.poll.findUnique({
  where: { id: "WJOEm4M7E0JY" },
  select: {
    votes: {
      where: { participant: { deleted: false } },
      select: { type: true, participantId: true }
    }
  }
}).then(res => console.log(JSON.stringify(res, null, 2))).finally(() => prisma.$disconnect());
