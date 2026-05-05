const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
  const sessions = await prisma.studySession.findMany({
      where: {
          topic: { user_id },
          session_date: {
              gte: new Date('2026-04-06T00:00:00Z'),
              lt: new Date('2026-04-09T00:00:00Z')
          }
      },
      select: {
          id: true,
          session_date: true,
          completed: true,
          study_plan_id: true
      }
  });
  console.log(`Found ${sessions.length} sessions for April 6-8.`);
  if (sessions.length > 0) {
      console.log('Sample plan IDs from these sessions:');
      const uniquePlanIds = [...new Set(sessions.map(s => s.study_plan_id))];
      console.log(uniquePlanIds);
      
      const latestPlan = await prisma.studyPlan.findFirst({
        where: { user_id },
        orderBy: { generated_date: 'desc' }
      });
      console.log('Latest plan ID:', latestPlan.id);
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
