const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function test() { 
  const sessions = await prisma.studySession.findMany(); 
  const april4 = sessions.filter(s => new Date(s.session_date).toISOString().startsWith('2026-04-04'));
  console.log('April 4th sessions length:', april4.length);
  if (april4.length > 0) {
     console.log('April 4th uncompleted?', april4.some(s => !s.completed));
  }
} 
test().catch(console.error).finally(() => prisma.$disconnect());
