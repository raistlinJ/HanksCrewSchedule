const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  const votes = await prisma.vote.findMany();
  
  const seen = new Map();
  const toDelete = [];

  for (const vote of votes) {
    const key = `${vote.participantId}-${vote.optionId}`;
    if (seen.has(key)) {
      // Compare updatedAt or createdAt to keep the newest
      const existing = seen.get(key);
      const existingTime = existing.updatedAt || existing.createdAt;
      const currentTime = vote.updatedAt || vote.createdAt;
      
      if (currentTime > existingTime) {
        // Current is newer, delete the existing one
        toDelete.push(existing.id);
        seen.set(key, vote);
      } else {
        // Existing is newer, delete the current one
        toDelete.push(vote.id);
      }
    } else {
      seen.set(key, vote);
    }
  }

  if (toDelete.length > 0) {
    console.log(`Deleting ${toDelete.length} duplicate votes...`);
    const result = await prisma.vote.deleteMany({
      where: {
        id: {
          in: toDelete
        }
      }
    });
    console.log(`Deleted ${result.count} duplicate votes.`);
  } else {
    console.log("No duplicate votes found.");
  }
}

cleanDuplicates().catch(console.error).finally(() => prisma.$disconnect());
