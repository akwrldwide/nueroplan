const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.studySession.findMany({
     orderBy: { session_date: 'asc' }
  });
  console.log("Total sessions:", sessions.length);
  
  const aprilSessions = sessions.filter(s => s.session_date >= new Date('2026-04-01T00:00:00Z') && s.session_date < new Date('2026-04-09T00:00:00Z'));
  console.log("April 1-8 Sessions:");
  for (const s of aprilSessions) {
     console.log(`${s.session_date.toISOString()} - completed: ${s.completed}`);
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
