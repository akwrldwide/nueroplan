const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { generateStudyPlan } = require('./src/services/allocationEngine');

async function run() {
    const users = await prisma.user.findMany();
    let kevinId = users[0].id;
    
    // Clear existing availabilities
    await prisma.studyAvailability.deleteMany({ where: { user_id: kevinId } });
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    // Add availability for all days
    for (const d of days) {
        await prisma.studyAvailability.create({
            data: {
                user_id: kevinId,
                day_of_week: d,
                start_time: '15:00',
                end_time: '18:00'
            }
        });
    }

    console.log("Testing plan generation with all days availability");
    try {
        const plan = await generateStudyPlan(kevinId, true, false);
        console.log("Plan generated successfully:", plan.sessionsCreated, "sessions created");

        const sessions = await prisma.studySession.findMany({
            where: { study_plan_id: plan.id }
        });

        const dayCounts = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
        sessions.forEach(s => {
            if (dayCounts[s.day_of_week] !== undefined) {
                dayCounts[s.day_of_week]++;
            }
        });
        
        console.log("Session counts per day:", dayCounts);

    } catch (error) {
        console.error("Error generating plan:", error);
    }
}

run().then(() => prisma.$disconnect());
