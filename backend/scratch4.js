const { generateStudyPlan } = require('./src/services/allocationEngine');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const user_id = 'f6fbd514-440c-4072-8c1f-8d8c1a74a7f0'; // from previous scratch.js
    
    // We will override standard console.log inside the function if needed,
    // or just run it and see the returned sessions.
    console.log("Generating plan...");
    const plan = await generateStudyPlan(user_id, false, false);
    
    console.log("Generated plan weeks:", plan.totalWeeksGenerated);
    console.log("Created sessions:", plan.sessionsCreated);
    
    const sessions = await prisma.studySession.findMany({
        where: { study_plan_id: plan.id }
    });
    
    const april6to8 = sessions.filter(s => s.session_date >= new Date('2026-04-06T00:00:00Z') && s.session_date < new Date('2026-04-09T00:00:00Z'));
    console.log(`Sessions from April 6 to 8:`, april6to8.length);
    if (april6to8.length > 0) {
        console.log(april6to8[0]);
    }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
