const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const engine = require('./src/services/allocationEngine');

async function fix() {
    const userId = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0';
    console.log("Fixing data for Femi Dan...");
    // Just call generateStudyPlan with forceFullSemester = true
    const p = await engine.generateStudyPlan(userId, true, true);
    console.log("Created sessions:", p.sessionsCreated);
    console.log("Total Weeks:", p.totalWeeksGenerated);
    // Print April 7th and 8th sessions
    const sessions = await prisma.studySession.findMany({
        where: { study_plan_id: p.id, session_date: { gte: new Date('2026-04-06T00:00:00Z'), lte: new Date('2026-04-09T23:59:59Z') } }
    });
    console.log("Sessions between Apr 6 and Apr 9:", sessions.length);
}
fix().catch(console.error).finally(() => prisma.$disconnect());
