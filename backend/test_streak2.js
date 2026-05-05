const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function test() { 
  const sessions = await prisma.studySession.findMany(); 
  const apr3 = sessions.filter(s => s.session_date && new Date(s.session_date).toISOString().startsWith('2026-04-03'));
  if (apr3.length > 0) {
      const parentTopic = await prisma.userTopic.findUnique({ where: { id: apr3[0].user_topic_id } });
      const userId = parentTopic.user_id;
      console.log('User ID with April 3rd sessions:', userId);
      const user = await prisma.user.findUnique({ where: { id: userId } });
      console.log('User streak:', user.streak_count, 'last updated:', user.streak_last_updated);
      console.log('Total April 3rd sessions for this user:', apr3.length);
      console.log('IDs:', apr3.map(s => s.id));
      console.log('Completed statuses:', apr3.map(s => s.completed));
  } else {
      console.log('No April 3rd sessions found at all in DB');
  }
} 
test().catch(console.error).finally(() => prisma.$disconnect());
