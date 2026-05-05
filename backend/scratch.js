const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sessions = await prisma.academicSession.findMany();
  console.log("Academic Sessions:", sessions);

  const plans = await prisma.studyPlan.findMany();
  console.log("Study Plans:", plans);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
