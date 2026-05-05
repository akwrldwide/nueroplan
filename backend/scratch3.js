const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.studyPlan.findMany({
      orderBy: { generated_date: 'desc' },
      take: 1
  });
  
  if (plans.length > 0) {
      console.log('Latest plan:', plans[0]);
      const sessions = await prisma.studySession.findMany({
          where: { study_plan_id: plans[0].id }
      });
      console.log(`Plan has ${sessions.length} sessions`);
      const april6to8 = sessions.filter(s => s.session_date >= new Date('2026-04-06T00:00:00Z') && s.session_date < new Date('2026-04-09T00:00:00Z'));
      console.log(`Sessions from April 6 to 8:`, april6to8.length);
      if (april6to8.length > 0) {
          console.log(april6to8[0]);
      }
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
