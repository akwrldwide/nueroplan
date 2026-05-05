const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const engine = require('./src/services/allocationEngine');

async function test() {
    const p = await engine.generateStudyPlan('f6fbd514-440c-4072-8c1f-8d8c1a74a7f0', false, true);
    console.log("Created: ", p.sessionsCreated);
    console.log("Weeks: ", p.totalWeeksGenerated);
}
test().catch(console.error).finally(() => prisma.$disconnect());
