const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const participants = await prisma.participant.findMany({
    where: { deleted: false }
  });
  
  const counts = {};
  for (const p of participants) {
    if (!p.email) continue;
    const key = `${p.pollId}-${p.email}`;
    if (!counts[key]) counts[key] = [];
    counts[key].push(p);
  }
  
  const duplicates = Object.values(counts).filter(arr => arr.length > 1);
  console.log("Duplicate participants found:", duplicates.length);
  for (const dup of duplicates) {
    console.log(`Poll ID: ${dup[0].pollId}, Email: ${dup[0].email}`);
    for (const p of dup) {
      console.log(`  - Participant ID: ${p.id}, Name: ${p.name}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
