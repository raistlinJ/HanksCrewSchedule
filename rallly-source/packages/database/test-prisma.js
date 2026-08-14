const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const group = await prisma.pollGroup.findFirst({
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
    console.log("Success!");
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
